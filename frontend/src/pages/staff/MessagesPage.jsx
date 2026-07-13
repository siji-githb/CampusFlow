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
      className={`mx-3 my-2 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 border
        ${selected ? 'bg-white border-maroon shadow-[0_4px_12px_rgba(184,102,122,0.15)] ring-1 ring-maroon/10' : 
          unread ? 'bg-white border-maroon-border/60 shadow-sm hover:shadow-md hover:-translate-y-px' : 
          'bg-white border-border/60 shadow-sm hover:shadow-md hover:-translate-y-px'}
      `}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} size={38} bgClass={selected ? 'bg-maroon' : unread ? 'bg-maroon-light' : 'bg-surface'} colorClass={selected ? 'text-white' : unread ? 'text-maroon' : 'text-text-main'} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[13px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[130px] ${unread ? 'text-text-main font-bold' : 'text-text-main font-semibold'}`}>
                {name}
              </span>
              {unread && !selected && <span className="w-2 h-2 rounded-full bg-maroon shrink-0" />}
            </div>
            <span className="text-[10px] text-text-muted shrink-0 ml-1.5">{time}</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${prio.bg} ${prio.color} ${prio.border}`}>
              {prio.label}
            </span>
            {msg.category && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-surface text-text-sub border border-border">
                {CATEGORY[msg.category] || msg.category}
              </span>
            )}
          </div>
          <p className={`text-[12px] m-0 leading-relaxed line-clamp-2 overflow-hidden text-ellipsis ${unread && !selected ? 'text-text-main font-medium' : 'text-text-sub'}`}>
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
  const [filter, setFilter]       = useState('all')   // all | unread | urgent | resolved
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
    if (filter === 'resolved') return m.is_read
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
    <div className="flex flex-col h-full font-sans">
      
      {/* ── Page Header ── */}
      <div className="mb-6 shrink-0 animate-fade-up">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Communication</p>
        <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <MessageSquare size={24} className="text-maroon" /> AI Escalations
        </h1>
        <p className="text-[12px] text-text-sub mt-2 mb-0">
          Handle escalated student queries and reply directly to students.
        </p>
      </div>

      {/* ── Inbox Split View ── */}
      <div className="animate-fade-up flex bg-white overflow-hidden rounded-[20px] border border-border shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-[calc(100vh-210px)] min-h-[500px]" style={{ animationDelay: '0.1s' }}>

      {/* ════ LEFT PANEL — message list ════ */}
      <div className="w-[340px] shrink-0 bg-off-white border-r border-border flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-border bg-off-white">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-[22px] font-bold text-text-main m-0">Inbox</h2>
            {unreadCount > 0 && (
              <span className="bg-maroon text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                {unreadCount} new
              </span>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex bg-border/40 p-1 rounded-[12px]">
            {[['all', 'All'], ['unread', 'Action'], ['urgent', 'Urgent'], ['resolved', 'Resolved']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`flex-1 py-1.5 px-1 border-none text-[11px] font-bold font-sans cursor-pointer whitespace-nowrap transition-all rounded-[8px]
                  ${filter === val ? 'bg-white text-maroon shadow-sm' : 'bg-transparent text-text-muted hover:text-text-main'}
                `}
              >{lbl}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="mx-3 my-2 px-4 py-3.5 rounded-2xl bg-white border border-border/60 shadow-sm flex gap-3">
                  <div className="animate-pulse w-[38px] h-[38px] rounded-full bg-border shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-2.5">
                      <div className="animate-pulse w-[100px] h-3.5 rounded bg-border" />
                      <div className="animate-pulse w-10 h-3 rounded bg-border" />
                    </div>
                    <div className="animate-pulse w-[70px] h-3.5 rounded-full bg-border mb-2.5" />
                    <div className="animate-pulse w-full h-3 rounded bg-border mb-1.5" />
                    <div className="animate-pulse w-3/4 h-3 rounded bg-border" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-text-sub mb-4 border border-border/50">
                <MessageSquare size={24} strokeWidth={2} />
              </div>
              <p className="text-[15px] font-bold text-text-main m-0 mb-1.5">No messages found</p>
              <p className="text-[13px] text-text-muted m-0 leading-relaxed">Your inbox is clear of any AI-escalated queries for this filter.</p>
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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">

          {/* Detail Header */}
          <div className="px-8 py-5 bg-white border-b border-border flex items-center justify-between shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.02)] z-10">
            <div className="flex items-center gap-3.5">
              <Avatar name={selectedName} size={44} bgClass="bg-maroon" colorClass="text-white" />
              <div>
                <div className="text-[16px] font-bold text-text-main">{selectedName}</div>
                <div className="text-[12px] text-text-muted mt-0.5">
                  {selected.users?.student_id && <span className="font-mono">{selected.users.student_id}</span>}
                  {selected.users?.email && <span className="ml-2">{selected.users.email}</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 items-center">
              {selectedPrio && (
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border tracking-wide uppercase ${selectedPrio.bg} ${selectedPrio.color} ${selectedPrio.border}`}>
                  {selectedPrio.label}
                </span>
              )}
              {!selected.is_read && (
                <button
                  onClick={() => handleMarkRead(selected.id)}
                  disabled={marking === selected.id}
                  className={`px-5 py-2.5 rounded-[10px] border-none text-[12px] font-bold font-sans transition-colors shadow-sm
                    ${marking === selected.id ? 'bg-[#B8667A] text-white cursor-not-allowed' : 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:-translate-y-px'}
                  `}
                >
                  {marking === selected.id ? 'Resolving…' : 'Resolve Case'}
                </button>
              )}
              {selected.is_read && (
                <span className="text-[12px] font-bold text-success flex items-center gap-1.5 px-3 py-1.5 bg-success-light rounded-full border border-success-border">
                  <Check size={14} strokeWidth={3} /> Resolved
                </span>
              )}
            </div>
          </div>

          {/* Scrollable thread */}
          <div className="flex-1 overflow-y-auto px-8 pt-6 pb-2">

            {/* AI Escalation Summary card */}
            <div className="bg-off-white border border-border rounded-2xl p-5 mb-8 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-maroon flex items-center bg-maroon-light p-1.5 rounded-lg"><Bot size={18} /></span>
                <span className="text-[11px] font-bold text-maroon tracking-[0.06em] uppercase">AI Escalation Summary</span>
              </div>
              <p className="text-[13px] text-text-main m-0 mb-4 leading-relaxed font-medium">{aiSummary}</p>
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {selected.category && (
                  <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white text-text-main border border-border shadow-sm">
                    {CATEGORY[selected.category] || selected.category}
                  </span>
                )}
                {selected.priority && (
                  <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border shadow-sm ${selectedPrio?.bg} ${selectedPrio?.color} ${selectedPrio?.border}`}>
                    {selectedPrio?.label}
                  </span>
                )}
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white text-gold border border-gold-border shadow-sm">
                  Requires Timely Response
                </span>
              </div>
            </div>

            {/* Message thread */}
            <div className="flex flex-col">
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
          <div className="px-8 py-5 bg-surface border-t border-border shrink-0 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
            {/* Status pills */}
            <div className="flex gap-2 mb-3.5 flex-wrap">
              {[
                ['Requires Timely Update', 'bg-danger-light', 'text-danger', 'border-danger-border'],
                ['1st Verified on the System', 'bg-success-light', 'text-success', 'border-success-border'],
                ['Customer Reached', 'bg-blue-light', 'text-blue', 'border-blue-border'],
              ].map(([label, bg, color, border]) => (
                <span key={label} className={`text-[10px] font-bold tracking-[0.02em] px-2.5 py-1 rounded-full border ${bg} ${color} ${border}`}>
                  {label}
                </span>
              ))}
            </div>

            {/* Reply input */}
            <div className="flex items-end gap-3">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Type a message to ${selected.users?.first_name || 'student'}…`}
                rows={2}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-white text-[13px] text-text-main outline-none resize-none font-sans leading-relaxed focus:border-maroon transition-colors shadow-sm"
              />
              <button
                disabled={!replyText.trim() || sendingReply}
                className={`w-[46px] h-[46px] rounded-xl border-none text-[20px] flex items-center justify-center shrink-0 transition-all duration-150 shadow-sm
                  ${replyText.trim() ? 'bg-maroon text-white cursor-pointer hover:bg-maroon-dark hover:-translate-y-px' : 'bg-border text-white cursor-default'}
                  ${sendingReply ? 'opacity-60' : 'opacity-100'}
                `}
                onClick={handleReply}
              >{sendingReply ? '...' : <Send size={20} />}</button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-text-muted bg-white/50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
          <div className="w-24 h-24 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center justify-center text-maroon/40 border border-border/50">
            <MessageSquare size={40} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-[20px] font-bold text-text-main m-0 mb-2 font-serif tracking-tight">Select a conversation</p>
            <p className="text-[14px] text-text-sub m-0 max-w-[260px] mx-auto leading-relaxed">Choose a message from your inbox on the left to view the details and reply.</p>
          </div>
        </div>
      )}
      </div>

      {error && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-danger-light border border-danger-border text-danger px-4.5 py-2.5 rounded-[10px] text-[13px] z-999 shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
