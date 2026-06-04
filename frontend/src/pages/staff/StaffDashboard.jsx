import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import QueueManager from './QueueManager'
import { getMessages, markMessageRead } from '../../services/messagesService'  // ← M10

const M = {
  maroon:      '#7B1A2A',
  maroonLight: '#F9F0F1',
  gold:        '#B8900A',
  goldLight:   '#FDF6E3',
  offWhite:    '#F9F7F4',
  gray200:     '#EAE7E2',
  gray500:     '#706B65',
  text:        '#1C1917',
}

const TABS = ['Queue Manager', 'Messages']

// ── M10: priority badge styles ────────────────────────────────────────────────
const PRIORITY = {
  urgent: { bg: 'rgba(180,30,30,0.1)',   color: '#B41E1E', border: 'rgba(180,30,30,0.25)',  label: '🔴 Urgent'  },
  normal: { bg: 'rgba(184,144,10,0.1)',  color: '#B8900A', border: 'rgba(184,144,10,0.25)', label: '🟡 Normal'  },
  fyi:    { bg: 'rgba(100,130,160,0.1)', color: '#4A6A8A', border: 'rgba(100,130,160,0.2)', label: '🔵 FYI'     },
}

const CATEGORY = {
  requirements: { label: 'Requirements' },
  scheduling:   { label: 'Scheduling'   },
  process:      { label: 'Process'      },
  complaint:    { label: 'Complaint'    },
  other:        { label: 'Other'        },
}

// ── Messages inbox component ──────────────────────────────────────────────────
function MessagesInbox() {
  const { token } = useAuth()
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [expanded, setExpanded]   = useState(null)
  const [marking, setMarking]     = useState(null)
  const [filter, setFilter]       = useState('all')   // all | unread | urgent

  const load = async () => {
    try {
      const data = await getMessages(token)
      setMessages(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleMarkRead = async (e, id) => {
    e.stopPropagation()
    setMarking(id)
    try {
      await markMessageRead(token, id)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m))
    } catch (err) {
      setError(err.message)
    } finally {
      setMarking(null)
    }
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.is_read
    if (filter === 'urgent') return m.priority === 'urgent'
    return true
  })

  const unreadCount = messages.filter(m => !m.is_read).length

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: M.gray500, fontSize: '14px' }}>
      Loading messages...
    </div>
  )

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: M.maroon, margin: 0 }}>
            Messages Inbox
          </h2>
          <p style={{ fontSize: '12px', color: M.gray500, margin: '3px 0 0' }}>
            AI-escalated student queries
            {unreadCount > 0 && (
              <span style={{ marginLeft: '8px', background: M.maroon, color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '100px' }}>
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['all', 'All'], ['unread', 'Unread'], ['urgent', 'Urgent']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: '5px 14px', borderRadius: '100px', border: `1px solid ${filter === val ? M.maroon : M.gray200}`,
                background: filter === val ? M.maroon : 'white',
                color: filter === val ? 'white' : M.gray500,
                fontSize: '12px', fontWeight: filter === val ? 600 : 400,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: M.maroonLight, color: M.maroon, fontSize: '13px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '14px', border: `1px solid ${M.gray200}` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: M.text, margin: '0 0 6px' }}>
            {filter === 'all' ? 'No messages yet' : `No ${filter} messages`}
          </p>
          <p style={{ fontSize: '13px', color: M.gray500, margin: 0 }}>
            AI-escalated queries from students will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(msg => {
            const prio     = PRIORITY[msg.priority] || PRIORITY.normal
            const cat      = CATEGORY[msg.category]  || CATEGORY.other
            const isOpen   = expanded === msg.id
            const student  = msg.users
            const name     = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
            const sid      = student?.student_id || '—'
            const time     = new Date(msg.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

            // Strip the [PRIORITY · category] prefix from content if present
            const rawContent = msg.content || ''
            const bodyMatch  = rawContent.match(/^\[.*?\]\s*\n\n([\s\S]*)/)
            const bodyText   = bodyMatch ? bodyMatch[1].trim() : rawContent

            return (
              <div
                key={msg.id}
                onClick={() => setExpanded(isOpen ? null : msg.id)}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: `1px solid ${!msg.is_read ? 'rgba(123,26,42,0.25)' : M.gray200}`,
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  boxShadow: !msg.is_read ? '0 1px 6px rgba(123,26,42,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Student + time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: M.text }}>{name}</span>
                      <span style={{ fontSize: '11px', color: M.gray500, fontFamily: 'monospace' }}>{sid}</span>
                      {!msg.is_read && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: M.maroon, flexShrink: 0, display: 'inline-block' }} />
                      )}
                    </div>

                    {/* ── M10: Priority + Category badges ── */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      {msg.priority && (
                        <span style={{
                          fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em',
                          padding: '2px 9px', borderRadius: '100px',
                          background: prio.bg, color: prio.color, border: `1px solid ${prio.border}`,
                        }}>
                          {prio.label}
                        </span>
                      )}
                      {msg.category && (
                        <span style={{
                          fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em',
                          padding: '2px 9px', borderRadius: '100px',
                          background: 'rgba(123,26,42,0.06)', color: M.maroon,
                          border: '1px solid rgba(123,26,42,0.15)',
                        }}>
                          {cat.label}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: M.gray500, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        {time}
                      </span>
                    </div>

                    {/* Message preview / full text */}
                    <p style={{
                      fontSize: '13px', color: M.gray500, margin: 0, lineHeight: 1.55,
                      display: isOpen ? 'block' : '-webkit-box',
                      WebkitLineClamp: isOpen ? 'unset' : 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: isOpen ? 'visible' : 'hidden',
                      whiteSpace: isOpen ? 'pre-wrap' : 'normal',
                    }}>
                      {bodyText}
                    </p>
                  </div>

                  {/* Expand chevron */}
                  <div style={{ color: M.gray500, fontSize: '14px', flexShrink: 0, marginTop: '2px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▾
                  </div>
                </div>

                {/* Expanded actions */}
                {isOpen && !msg.is_read && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${M.gray200}`, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => handleMarkRead(e, msg.id)}
                      disabled={marking === msg.id}
                      style={{
                        padding: '7px 18px', borderRadius: '7px', border: 'none',
                        background: marking === msg.id ? '#B8667A' : M.maroon,
                        color: 'white', fontSize: '12px', fontWeight: 600,
                        cursor: marking === msg.id ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {marking === msg.id ? 'Marking...' : '✓ Mark as Read'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main StaffDashboard ───────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Queue Manager')

  return (
    <div style={{ minHeight: '100vh', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar user={user} subtitle="Staff Dashboard" onLogout={() => { logout(); navigate('/login') }} />

      {/* Tab bar */}
      <div style={{ background: 'white', borderBottom: `1px solid ${M.gray200}`, padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '4px' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '14px', fontFamily: "'DM Sans', sans-serif",
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? M.maroon : M.gray500,
                borderBottom: `2px solid ${activeTab === tab ? M.maroon : 'transparent'}`,
                marginBottom: '-1px', transition: 'color .15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {activeTab === 'Queue Manager' && <QueueManager />}
        {activeTab === 'Messages'      && <MessagesInbox />}
      </main>
    </div>
  )
}