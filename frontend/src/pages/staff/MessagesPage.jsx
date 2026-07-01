import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getMessages, markMessageRead, replyToMessage } from '../../services/messagesService'
import { Bot, MessageSquare, Send, Check } from 'lucide-react'

const PRIORITY = {
  urgent: { label: 'High Priority', bg: 'bg-danger-light',  color: 'text-danger',  border: 'border-danger-border'  },
  normal: { label: 'Normal',        bg: 'bg-gold-light', color: 'text-gold', border: 'border-gold-border' },
  fyi:    { label: 'FYI',           bg: 'bg-blue-light', color: 'text-blue', border: 'border-blue-border' },
}

const CATEGORY = {
  requirements: 'Requirements',
  scheduling:   'Scheduling',
  process:      'Process',
  complaint:    'Complaint',
  other:        'Other',
}

// Strips the [priority · category] header prefix that the AI appends
function parseBody(raw = '') {
  const match = raw.match(/^\[.*?\]\s*\n\n([\s\S]*)/)
  return match ? match[1].trim() : raw.trim()
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 34, bgClass = 'bg-maroon', colorClass = 'text-white' }) => {
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
    : '?'
  return (
    <div className={`${bgClass} ${colorClass} shrink-0 rounded-full flex items-center justify-center font-bold`} 
         style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

// ── Message List Item ──────────────────────────────────────────────────────────
const MessageItem = ({ msg, selected, onClick }) => {
  const prio  = PRIORITY[msg.priority] || PRIORITY.normal
  const name  = msg.users ? `${msg.users.first_name} ${msg.users.last_name}` : 'Unknown'
  const body  = parseBody(msg.content)
  const time  = new Date(msg.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const unread = !msg.is_read

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3.5 cursor-pointer border-b border-border transition-colors duration-150 border-l-4
        ${selected ? 'bg-maroon-light border-l-maroon' : unread ? 'bg-maroon-mid/25 border-l-transparent hover:bg-off-white' : 'bg-white border-l-transparent hover:bg-off-white'}
      `}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={name} size={36} bgClass={selected ? 'bg-maroon' : 'bg-maroon-mid'} colorClass={selected ? 'text-white' : 'text-maroon'} />
        <div className="flex-1 min-w-0">
          {/* Top row: name + time */}
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[13px] text-text-main whitespace-nowrap overflow-hidden text-ellipsis max-w-[130px] ${unread ? 'font-bold' : 'font-semibold'}`}>{name}</span>
              {unread && <span className="w-1.5 h-1.5 rounded-full bg-maroon shrink-0 inline-block" />}
            </div>
            <span className="text-[10px] text-text-muted shrink-0 ml-1.5">{time}</span>
          </div>
          {/* Priority badge */}
          <div className="mb-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-[0.05em] ${prio.bg} ${prio.color} ${prio.border}`}>
              {prio.label}
            </span>
            {msg.category && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-maroon-mid text-maroon border border-maroon-border ml-1 inline-block">
                {CATEGORY[msg.category] || msg.category}
              </span>
            )}
          </div>
          {/* Preview */}
          <p className="text-[12px] text-text-sub m-0 leading-relaxed line-clamp-2 overflow-hidden text-ellipsis">
            {body}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Thread bubble ──────────────────────────────────────────────────────────────
const Bubble = ({ text, fromAI, fromStaff, time }) => {
  const isRight = fromAI || fromStaff
  return (
    <div className={`flex flex-col mb-3.5 ${isRight ? 'items-end' : 'items-start'}`}>
      {fromAI && (
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-maroon-mid flex items-center justify-center text-[11px] text-maroon"><Bot size={12} /></div>
          <span className="text-[10px] font-semibold text-maroon">CampusFlow AI</span>
        </div>
      )}
      <div className={`max-w-[72%] px-3.5 py-3 text-[13px] leading-relaxed shadow-[0_1px_3px_rgba(0,0,0,0.06)]
        ${isRight ? 'rounded-[16px_4px_16px_16px]' : 'rounded-[4px_16px_16px_16px]'}
        ${fromAI ? 'bg-maroon-light text-text-main border border-maroon-border' : 
          fromStaff ? 'bg-maroon text-white border-none' : 
          'bg-off-white text-text-main border border-border'}
      `}>
        {text}
      </div>
      {time && <span className="text-[10px] text-text-muted mt-1">{time}</span>}
    </div>
  )
}

// ── Main MessagesPage ──────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { token } = useAuth()
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [marking, setMarking]     = useState(null)
  const [filter, setFilter]       = useState('all')   // all | unread | urgent
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [error, setError]         = useState('')

  const load = useCallback(async () => {
    try { setMessages(await getMessages(token)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  // Auto-select first message
  useEffect(() => {
    if (!selected && messages.length > 0) setSelected(messages[0])
  }, [messages, selected])

  const handleMarkRead = async (id) => {
    setMarking(id)
    try {
      await markMessageRead(token, id)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m))
      if (selected?.id === id) setSelected(prev => ({ ...prev, is_read: true }))
    } catch (err) { setError(err.message) }
    finally { setMarking(null) }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return
    setSendingReply(true)
    setError('')
    try {
      await replyToMessage(token, selected.id, replyText)
      setReplyText('')
      setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, is_read: true } : m))
      setSelected(prev => ({ ...prev, is_read: true }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSendingReply(false)
    }
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread')  return !m.is_read
    if (filter === 'urgent')  return m.priority === 'urgent'
    return true
  })

  const unreadCount  = messages.filter(m => !m.is_read).length
  const selectedPrio = selected ? PRIORITY[selected.priority] || PRIORITY.normal : null
  const selectedName = selected?.users ? `${selected.users.first_name} ${selected.users.last_name}` : 'Unknown'
  const selectedBody = selected ? parseBody(selected.content) : ''

  // Simulated AI summary from the message content
  const aiSummary = selected
    ? `The student is inquiring about: ${selected.category ? CATEGORY[selected.category] + ' —' : ''} ${selectedBody.slice(0, 160)}…`
    : ''

  return (
    <div className="flex h-[calc(100vh-60px)] bg-off-white overflow-hidden gap-0">

      {/* ════ LEFT PANEL — message list ════ */}
      <div className="animate-fade-up w-[320px] shrink-0 bg-white border-r border-border flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-5 pb-0 border-b border-border">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-serif text-[20px] font-bold text-text-main m-0">Inbox</h2>
            {unreadCount > 0 && (
              <span className="bg-maroon text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex gap-0">
            {[['all', 'All'], ['unread', 'Requires Action'], ['urgent', 'Resolved']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`flex-1 py-2 px-1.5 border-none bg-transparent text-[11px] font-sans cursor-pointer whitespace-nowrap mb-[-1px] transition-colors border-b-2
                  ${filter === val ? 'border-maroon text-maroon font-bold' : 'border-transparent text-text-muted font-normal hover:text-text-main'}
                `}
              >{lbl}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="px-4 py-3.5 border-b border-border flex gap-2.5">
                  <div className="animate-pulse w-9 h-9 rounded-full bg-border shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <div className="animate-pulse w-[100px] h-3.5 rounded bg-border" />
                      <div className="animate-pulse w-10 h-3 rounded bg-border" />
                    </div>
                    <div className="animate-pulse w-[60px] h-3.5 rounded-full bg-border mb-2" />
                    <div className="animate-pulse w-full h-3 rounded bg-border mb-1" />
                    <div className="animate-pulse w-4/5 h-3 rounded bg-border" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 px-6 text-center">
              <div className="text-text-muted mb-3 flex justify-center"><MessageSquare size={40} /></div>
              <p className="text-sm font-semibold text-text-main m-0 mb-1">No messages</p>
              <p className="text-xs text-text-muted m-0">AI-escalated queries appear here.</p>
            </div>
          ) : filtered.map(msg => (
            <MessageItem
              key={msg.id}
              msg={msg}
              selected={selected?.id === msg.id}
              onClick={() => setSelected(msg)}
            />
          ))}
        </div>
      </div>

      {/* ════ RIGHT PANEL — message detail ════ */}
      {selected ? (
        <div className="animate-fade-up flex-1 flex flex-col min-w-0 overflow-hidden" style={{ animationDelay: '0.2s' }}>

          {/* Detail Header */}
          <div className="px-6 py-4 bg-white border-b border-border flex items-center justify-between shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <Avatar name={selectedName} size={40} bgClass="bg-maroon" colorClass="text-white" />
              <div>
                <div className="text-[15px] font-bold text-text-main">{selectedName}</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  {selected.users?.student_id && <span className="font-mono">{selected.users.student_id}</span>}
                  {selected.users?.email && <span className="ml-1.5">{selected.users.email}</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-center">
              {selectedPrio && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${selectedPrio.bg} ${selectedPrio.color} ${selectedPrio.border}`}>
                  {selectedPrio.label}
                </span>
              )}
              {!selected.is_read && (
                <button
                  onClick={() => handleMarkRead(selected.id)}
                  disabled={marking === selected.id}
                  className={`px-4 py-2 rounded-[9px] border-none text-xs font-bold font-sans transition-colors
                    ${marking === selected.id ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark'}
                  `}
                >
                  {marking === selected.id ? 'Resolving…' : 'Resolve Case'}
                </button>
              )}
              {selected.is_read && (
                <span className="text-xs font-semibold text-success flex items-center gap-1">
                  <Check size={14} /> Resolved
                </span>
              )}
            </div>
          </div>

          {/* Scrollable thread */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* AI Escalation Summary card */}
            <div className="bg-maroon-light border border-maroon-border rounded-[14px] px-[18px] py-4 mb-5">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-maroon flex items-center"><Bot size={18} /></span>
                <span className="text-xs font-bold text-maroon tracking-[0.04em] uppercase">AI Escalation Summary</span>
              </div>
              <p className="text-[13px] text-text-sub m-0 mb-3 leading-relaxed">{aiSummary}</p>
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selected.category && (
                  <span className="text-[10px] font-semibold px-2.5 py-[3px] rounded-full bg-maroon-mid text-maroon border border-maroon-border">
                    {CATEGORY[selected.category] || selected.category}
                  </span>
                )}
                {selected.priority && (
                  <span className={`text-[10px] font-semibold px-2.5 py-[3px] rounded-full border ${selectedPrio?.bg} ${selectedPrio?.color} ${selectedPrio?.border}`}>
                    {selectedPrio?.label}
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2.5 py-[3px] rounded-full bg-gold-light text-gold border border-gold-border">
                  Requires Timely Response
                </span>
              </div>
            </div>

            {/* Message thread */}
            <div>
              {/* Student message */}
              <Bubble
                text={selectedBody}
                fromAI={false}
                fromStaff={false}
                time={new Date(selected.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              />

              {/* Simulated AI reply */}
              <Bubble
                fromAI
                text={`Hello ${selected.users?.first_name || 'there'}! I've reviewed your inquiry regarding ${CATEGORY[selected.category] || 'your request'}. A staff member has been notified and will assist you shortly. Please make sure you have the required documents ready.`}
                time="CampusFlow AI · Just now"
              />
            </div>
          </div>

          {/* Footer: status pills + reply box */}
          <div className="px-6 py-3.5 bg-white border-t border-border shrink-0">
            {/* Status pills */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {[
                ['Requires Timely Update', 'bg-danger-light', 'text-danger', 'border-danger-border'],
                ['1st Verified on the System', 'bg-success-light', 'text-success', 'border-success-border'],
                ['Customer Reached', 'bg-blue-light', 'text-blue', 'border-blue-border'],
              ].map(([label, bg, color, border]) => (
                <span key={label} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${bg} ${color} ${border}`}>
                  {label}
                </span>
              ))}
            </div>

            {/* Reply input */}
            <div className="flex items-end gap-2.5">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Type a message to ${selected.users?.first_name || 'student'}…`}
                rows={2}
                className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-border bg-off-white text-[13px] text-text-main outline-none resize-none font-sans leading-relaxed focus:border-maroon transition-colors"
              />
              <button
                disabled={!replyText.trim() || sendingReply}
                className={`w-[42px] h-[42px] rounded-[10px] border-none text-[18px] flex items-center justify-center shrink-0 transition-all duration-150
                  ${replyText.trim() ? 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark' : 'bg-border text-white cursor-default'}
                  ${sendingReply ? 'opacity-60' : 'opacity-100'}
                `}
                onClick={handleReply}
              >{sendingReply ? '...' : <Send size={18} />}</button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-text-muted">
          <div className="flex justify-center"><MessageSquare size={48} /></div>
          <p className="text-[15px] font-semibold text-text-main m-0">Select a message</p>
          <p className="text-[13px] text-text-muted m-0">Choose a conversation from the left to view it here.</p>
        </div>
      )}

      {error && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-danger-light border border-danger-border text-danger px-4.5 py-2.5 rounded-[10px] text-[13px] z-[999] shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
