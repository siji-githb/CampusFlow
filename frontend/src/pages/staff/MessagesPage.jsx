import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getMessages, markMessageRead, replyToMessage } from '../../services/messagesService'

// ── Design Tokens ──────────────────────────────────────────────────────────────
const M = {
  maroon:       '#7B1A2A',
  maroonDark:   '#5C1320',
  maroonLight:  '#F9F0F1',
  maroonMid:    'rgba(123,26,42,0.08)',
  maroonBorder: 'rgba(123,26,42,0.2)',
  gold:         '#B8900A',
  goldLight:    '#FDF6E3',
  goldBorder:   'rgba(184,144,10,0.3)',
  white:        '#FFFFFF',
  offWhite:     '#F9F7F4',
  surface:      '#F2EDE8',
  border:       '#EAE7E2',
  text:         '#1C1917',
  textSub:      '#57534E',
  textMuted:    '#A8A29E',
  green:        '#15803D',
  greenLight:   '#F0FDF4',
  greenBorder:  '#BBF7D0',
  blue:         '#1D4ED8',
  blueLight:    '#EFF6FF',
  blueBorder:   '#BFDBFE',
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
}

const PRIORITY = {
  urgent: { label: 'High Priority', bg: M.redLight,  color: M.red,  border: M.redBorder  },
  normal: { label: 'Normal',        bg: M.goldLight, color: M.gold, border: M.goldBorder },
  fyi:    { label: 'FYI',           bg: M.blueLight, color: M.blue, border: M.blueBorder },
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
const Avatar = ({ name, size = 34, bg = M.maroon, color = M.white }) => {
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
    : '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, color, fontSize: size * 0.38,
      fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{initials}</div>
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
      style={{
        padding: '14px 16px', cursor: 'pointer',
        borderBottom: `1px solid ${M.border}`,
        background: selected ? M.maroonLight : unread ? 'rgba(123,26,42,0.02)' : M.white,
        borderLeft: selected ? `3px solid ${M.maroon}` : '3px solid transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = M.offWhite }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = unread ? 'rgba(123,26,42,0.02)' : M.white }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Avatar name={name} size={36} bg={selected ? M.maroon : M.maroonMid} color={selected ? M.white : M.maroon} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: name + time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: unread ? 700 : 600, color: M.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>{name}</span>
              {unread && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: M.maroon, flexShrink: 0, display: 'inline-block' }} />}
            </div>
            <span style={{ fontSize: '10px', color: M.textMuted, flexShrink: 0, marginLeft: '6px' }}>{time}</span>
          </div>
          {/* Priority badge */}
          <div style={{ marginBottom: '5px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '100px', background: prio.bg, color: prio.color, border: `1px solid ${prio.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {prio.label}
            </span>
            {msg.category && (
              <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '100px', background: M.maroonMid, color: M.maroon, border: `1px solid ${M.maroonBorder}`, marginLeft: '4px' }}>
                {CATEGORY[msg.category] || msg.category}
              </span>
            )}
          </div>
          {/* Preview */}
          <p style={{ fontSize: '12px', color: M.textSub, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRight ? 'flex-end' : 'flex-start', marginBottom: '14px' }}>
      {fromAI && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: M.maroonMid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>🤖</div>
          <span style={{ fontSize: '10px', fontWeight: 600, color: M.maroon }}>CampusFlow AI</span>
        </div>
      )}
      <div style={{
        maxWidth: '72%', padding: '11px 14px', borderRadius: isRight ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: fromAI ? M.maroonLight : fromStaff ? M.maroon : M.offWhite,
        color: fromStaff ? M.white : M.text,
        fontSize: '13px', lineHeight: 1.6,
        border: fromAI ? `1px solid ${M.maroonBorder}` : fromStaff ? 'none' : `1px solid ${M.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {text}
      </div>
      {time && <span style={{ fontSize: '10px', color: M.textMuted, marginTop: '3px' }}>{time}</span>}
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
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: M.offWhite, gap: 0, overflow: 'hidden' }}>

      {/* ════ LEFT PANEL — message list ════ */}
      <div className="animate-fade-up" style={{
        width: '320px', flexShrink: 0,
        background: M.white, borderRight: `1px solid ${M.border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 16px 0', borderBottom: `1px solid ${M.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: M.text, margin: 0 }}>Inbox</h2>
            {unreadCount > 0 && (
              <span style={{ background: M.maroon, color: M.white, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {[['all', 'All'], ['unread', 'Requires Action'], ['urgent', 'Resolved']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                style={{
                  flex: 1, padding: '9px 6px',
                  border: 'none', background: 'none',
                  borderBottom: `2px solid ${filter === val ? M.maroon : 'transparent'}`,
                  color: filter === val ? M.maroon : M.textMuted,
                  fontSize: '11px', fontWeight: filter === val ? 700 : 400,
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                  marginBottom: '-1px', transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >{lbl}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ padding: '14px 16px', borderBottom: `1px solid ${M.border}`, display: 'flex', gap: '10px' }}>
                  <div className="animate-shimmer" style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div className="animate-shimmer" style={{ width: '100px', height: '14px', borderRadius: '4px' }} />
                      <div className="animate-shimmer" style={{ width: '40px', height: '12px', borderRadius: '4px' }} />
                    </div>
                    <div className="animate-shimmer" style={{ width: '60px', height: '14px', borderRadius: '100px', marginBottom: '8px' }} />
                    <div className="animate-shimmer" style={{ width: '100%', height: '12px', borderRadius: '4px', marginBottom: '4px' }} />
                    <div className="animate-shimmer" style={{ width: '80%', height: '12px', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💬</div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 4px' }}>No messages</p>
              <p style={{ fontSize: '12px', color: M.textMuted, margin: 0 }}>AI-escalated queries appear here.</p>
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
        <div className="animate-fade-up" style={{ animationDelay: '0.2s', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Detail Header */}
          <div style={{
            padding: '16px 24px', background: M.white,
            borderBottom: `1px solid ${M.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar name={selectedName} size={40} bg={M.maroon} color={M.white} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: M.text }}>{selectedName}</div>
                <div style={{ fontSize: '11px', color: M.textMuted, marginTop: '1px' }}>
                  {selected.users?.student_id && <span style={{ fontFamily: 'monospace' }}>{selected.users.student_id}</span>}
                  {selected.users?.email && <span style={{ marginLeft: '6px' }}>{selected.users.email}</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedPrio && (
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: selectedPrio.bg, color: selectedPrio.color, border: `1px solid ${selectedPrio.border}` }}>
                  {selectedPrio.label}
                </span>
              )}
              {!selected.is_read && (
                <button
                  onClick={() => handleMarkRead(selected.id)}
                  disabled={marking === selected.id}
                  style={{
                    padding: '8px 16px', borderRadius: '9px', border: 'none',
                    background: marking === selected.id ? '#B8667A' : M.maroon,
                    color: M.white, fontSize: '12px', fontWeight: 700,
                    cursor: marking === selected.id ? 'not-allowed' : 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {marking === selected.id ? 'Resolving…' : 'Resolve Case'}
                </button>
              )}
              {selected.is_read && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: M.green, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>✓</span> Resolved
                </span>
              )}
            </div>
          </div>

          {/* Scrollable thread */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

            {/* AI Escalation Summary card */}
            <div style={{
              background: M.maroonLight, border: `1px solid ${M.maroonBorder}`,
              borderRadius: '14px', padding: '16px 18px', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px' }}>🤖</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: M.maroon, letterSpacing: '0.04em', textTransform: 'uppercase' }}>AI Escalation Summary</span>
              </div>
              <p style={{ fontSize: '13px', color: M.textSub, margin: '0 0 12px', lineHeight: 1.65 }}>{aiSummary}</p>
              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selected.category && (
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: M.maroon + '18', color: M.maroon, border: `1px solid ${M.maroonBorder}` }}>
                    {CATEGORY[selected.category] || selected.category}
                  </span>
                )}
                {selected.priority && (
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: selectedPrio?.bg, color: selectedPrio?.color, border: `1px solid ${selectedPrio?.border}` }}>
                    {selectedPrio?.label}
                  </span>
                )}
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: M.goldLight, color: M.gold, border: `1px solid ${M.goldBorder}` }}>
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
          <div style={{ padding: '14px 24px', background: M.white, borderTop: `1px solid ${M.border}`, flexShrink: 0 }}>
            {/* Status pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {[
                ['Requires Timely Update', M.redLight, M.red, M.redBorder],
                ['1st Verified on the System', M.greenLight, M.green, M.greenBorder],
                ['Customer Reached', M.blueLight, M.blue, M.blueBorder],
              ].map(([label, bg, color, border]) => (
                <span key={label} style={{ fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: bg, color, border: `1px solid ${border}` }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Reply input */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Type a message to ${selected.users?.first_name || 'student'}…`}
                rows={2}
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: '10px',
                  border: `1px solid ${M.border}`, background: M.offWhite,
                  fontSize: '13px', color: M.text, outline: 'none', resize: 'none',
                  fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.5,
                }}
                onFocus={e => e.target.style.borderColor = M.maroon}
                onBlur={e => e.target.style.borderColor = M.border}
              />
              <button
                disabled={!replyText.trim() || sendingReply}
                style={{
                  width: '42px', height: '42px', borderRadius: '10px', border: 'none',
                  background: replyText.trim() ? M.maroon : M.border,
                  color: M.white, fontSize: '18px', cursor: replyText.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s',
                  opacity: sendingReply ? 0.6 : 1,
                }}
                onClick={handleReply}
              >{sendingReply ? '...' : '›'}</button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.textMuted, flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '3rem' }}>💬</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: M.text, margin: 0 }}>Select a message</p>
          <p style={{ fontSize: '13px', color: M.textMuted, margin: 0 }}>Choose a conversation from the left to view it here.</p>
        </div>
      )}

      {error && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', zIndex: 999 }}>
          {error}
        </div>
      )}
    </div>
  )
}
