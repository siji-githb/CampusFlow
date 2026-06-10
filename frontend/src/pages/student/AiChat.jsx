import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import { sendMessage, clearChat, getChatHistory } from '../../services/aiService'

const M = { maroon: '#7B1A2A', maroonLight: '#F9F0F1', gold: '#B8900A', goldLight: '#FDF6E3', offWhite: '#F9F7F4', gray200: '#EAE7E2', gray500: '#706B65', text: '#1C1917' }

const SUGGESTED = [
  'What documents do I need for a TOR?',
  'What are the office hours?',
  'How do I book an appointment?',
  'How long does a COE take?',
]

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="22"></line>
  </svg>
)

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
)

export default function AiChat() {
  const { token } = useAuth()
  // eslint-disable-next-line no-unused-vars
  const navigate  = useNavigate()

  const DEFAULT_MESSAGE = {
    role: 'assistant',
    content: "Hi! I'm the CampusFlow AI Assistant 👋 I can help you with appointment booking, transaction requirements, and registrar procedures. How can I help you today?",
  }
  const [messages, setMessages] = useState([DEFAULT_MESSAGE])
  const [input,   setInput]   = useState('')

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getChatHistory(token)
        if (data.messages && data.messages.length > 0) {
          setMessages([DEFAULT_MESSAGE, ...data.messages])
        }
      } catch (e) {
        console.error('Failed to load history', e)
      }
    }
    loadHistory()
  }, [token])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ── M11: Voice state ──────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking,  setIsSpeaking]  = useState(false)
  const recognitionRef = useRef(null)
  const voiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── M11: Cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  // ── M11: Speak AI response aloud ─────────────────────────────────────────
  const speakResponse = (text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const clean = text.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim()
    const utter  = new SpeechSynthesisUtterance(clean)
    utter.lang   = 'en-PH'
    utter.rate   = 0.95
    utter.pitch  = 1
    utter.onstart = () => setIsSpeaking(true)
    utter.onend   = () => setIsSpeaking(false)
    utter.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utter)
  }

  // ── M11: Start voice input ────────────────────────────────────────────────
  const startListening = () => {
    if (!voiceSupported) {
      alert('Voice input requires Chrome or Edge.')
      return
    }
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang            = 'en-PH'
    recognition.interimResults  = false
    recognition.maxAlternatives = 1

    recognition.onstart  = () => setIsListening(true)
    recognition.onend    = () => setIsListening(false)
    recognition.onerror  = () => setIsListening(false)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const handleSend = async (text = null) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput(''); setError('')
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
    setIsListening(false); setIsSpeaking(false)

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const data  = await sendMessage(token, msg)
      const reply = data.message
      setMessages(prev => [...prev, { role: 'assistant', content: reply, escalated: data.escalated }])
      speakResponse(reply)   // ── M11: read reply aloud
    } catch (e) {
      setError(e.message)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again.", isError: true }])
    } finally { setLoading(false) }
  }

  const handleClear = async () => {
    if (!confirm('Clear chat history?')) return
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    try {
      await clearChat(token)
      setMessages([{ role: 'assistant', content: 'Chat cleared! How can I help you today?' }])
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: M.offWhite, fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(184,144,10,0.45); }
          70%  { box-shadow: 0 0 0 8px rgba(184,144,10,0); }
          100% { box-shadow: 0 0 0 0 rgba(184,144,10,0); }
        }
        @keyframes speaking-wave {
          0%, 100% { opacity: 0.4; transform: scaleY(0.6); }
          50%       { opacity: 1;   transform: scaleY(1.4); }
        }
      `}</style>

      <Navbar backTo="/student/dashboard" title="AI Assistant">
        <button onClick={handleClear} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear chat</button>
      </Navbar>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', maxWidth: '680px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {messages.length === 1 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '11px', color: M.gray500, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Suggested questions</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {SUGGESTED.map((q, i) => (
                <button key={i} onClick={() => handleSend(q)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${M.gray200}`, background: 'white', color: M.text, fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45, transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = M.maroon}
                  onMouseLeave={e => e.currentTarget.style.borderColor = M.gray200}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '12px', alignItems: 'flex-end' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: M.maroon, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#F0C040', fontFamily: "'Playfair Display', serif", boxShadow: '0 2px 6px rgba(123,26,42,0.3)' }}>CF</div>
              )}
              {msg.role === 'staff' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: M.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: M.maroon, fontFamily: "'IBM Plex Sans', sans-serif", boxShadow: '0 2px 6px rgba(184,144,10,0.3)' }}>S</div>
              )}
              <div style={{ maxWidth: '75%', padding: '12px 18px', borderRadius: msg.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px', background: msg.role === 'user' ? M.maroon : msg.role === 'staff' ? M.goldLight : msg.isError ? M.maroonLight : 'white', color: msg.role === 'user' ? 'white' : msg.role === 'staff' ? M.maroonDark : msg.isError ? M.maroon : M.text, fontSize: '14px', lineHeight: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: (msg.role === 'assistant' || msg.role === 'staff') && !msg.isError ? `1px solid ${msg.role === 'staff' ? 'rgba(184,144,10,0.2)' : M.gray200}` : 'none' }}>
                {msg.role === 'staff' && <p style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{msg.staff_name || 'Registrar Staff'}</p>}
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                {msg.escalated && <p style={{ fontSize: '12px', color: M.gold, margin: '8px 0 0', paddingTop: '8px', borderTop: `1px solid ${M.gold}30` }}>📨 Forwarded to Registrar staff</p>}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: M.maroon, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#F0C040', fontFamily: "'Playfair Display', serif" }}>CF</div>
              <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'white', border: `1px solid ${M.gray200}` }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px' }}>
                  {[0, 1, 2].map(j => <div key={j} style={{ width: '6px', height: '6px', borderRadius: '50%', background: M.gray500, animation: 'bounce 1.2s infinite', animationDelay: `${j * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{ background: 'white', borderTop: `1px solid ${M.gray200}`, padding: '1rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {error && <p style={{ fontSize: '12px', color: M.maroon, marginBottom: '6px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={isListening ? 'Listening...' : 'Ask about registrar transactions...'}
              rows={1}
              style={{ flex: 1, padding: '14px 16px', borderRadius: '16px', border: `1px solid ${isListening ? M.gold : M.gray200}`, fontSize: '14px', resize: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: M.text, minHeight: '48px', maxHeight: '120px', boxSizing: 'border-box', transition: 'all .2s ease-in-out', boxShadow: isListening ? `0 0 0 4px rgba(184,144,10,0.1)` : 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              onFocus={e => { if (!isListening) e.target.style.boxShadow = `0 0 0 4px rgba(123,26,42,0.1)`; e.target.style.borderColor = M.maroon }}
              onBlur={e  => { if (!isListening) e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; e.target.style.borderColor = M.gray200 }}
            />

            {/* ── M11: Mic button ── */}
            {voiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                title={isListening ? 'Stop listening' : 'Tap to speak'}
                style={{
                  width: '48px', height: '48px', borderRadius: '16px', flexShrink: 0,
                  border: `1px solid ${isListening ? M.gold : M.gray200}`,
                  background: isListening ? M.goldLight : 'white',
                  color: isListening ? M.gold : M.gray500,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  animation: isListening ? 'pulse-ring 1.2s infinite' : 'none',
                }}
              >
                <MicIcon />
              </button>
            )}

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{ width: '48px', height: '48px', borderRadius: '16px', border: 'none', background: !input.trim() || loading ? M.gray200 : M.maroon, color: !input.trim() || loading ? M.gray500 : 'white', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: !input.trim() || loading ? 'none' : '0 4px 12px rgba(123,26,42,0.25)' }}
            >
              <SendIcon />
            </button>
          </div>

          {/* ── M11: Status bar ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '6px', minHeight: '18px' }}>
            {isListening ? (
              <span style={{ fontSize: '11px', color: M.gold, display: 'flex', alignItems: 'center', gap: '5px' }}>
                {[0,1,2,3].map(j => (
                  <span key={j} style={{ display: 'inline-block', width: '3px', height: '12px', background: M.gold, borderRadius: '2px', animation: 'speaking-wave 0.8s infinite', animationDelay: `${j*0.12}s` }} />
                ))}
                Listening...
              </span>
            ) : isSpeaking ? (
              <span style={{ fontSize: '11px', color: M.maroon, display: 'flex', alignItems: 'center', gap: '5px' }}>
                {[0,1,2,3].map(j => (
                  <span key={j} style={{ display: 'inline-block', width: '3px', height: '12px', background: M.maroon, borderRadius: '2px', animation: 'speaking-wave 0.8s infinite', animationDelay: `${j*0.12}s` }} />
                ))}
                Speaking...
                <button onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false) }}
                  style={{ marginLeft: '4px', fontSize: '10px', color: M.gray500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  ✕ stop
                </button>
              </span>
            ) : (
              <p style={{ fontSize: '11px', color: M.gray500, margin: 0 }}>
                Enter to send · Shift+Enter for new line{voiceSupported ? ' · Mic for voice' : ''}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}