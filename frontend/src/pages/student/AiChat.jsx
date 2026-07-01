import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import { sendMessage, clearChat, getChatHistory } from '../../services/aiService'

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

  const [isListening, setIsListening] = useState(false)
  const [isSpeaking,  setIsSpeaking]  = useState(false)
  const recognitionRef = useRef(null)
  const voiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

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
      speakResponse(reply)
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
    <div className="h-screen flex flex-col bg-off-white font-sans">
      <Navbar backTo="/student/dashboard" title="AI Assistant">
        <button onClick={handleClear} className="text-[12px] text-white/40 bg-transparent border-none cursor-pointer">Clear chat</button>
      </Navbar>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-[680px] w-full mx-auto box-border">

        {messages.length === 1 && (
          <div className="mb-6">
            <p className="text-[11px] text-text-sub text-center uppercase tracking-[0.05em] mb-2.5">Suggested questions</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED.map((q, i) => (
                <button key={i} onClick={() => handleSend(q)}
                  className="text-left p-2.5 rounded-[10px] border-[1.5px] border-border bg-white text-text-main text-[12px] cursor-pointer font-sans leading-relaxed transition-colors hover:border-maroon">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-maroon flex items-center justify-center shrink-0 text-[13px] font-bold text-gold font-serif shadow-[0_2px_6px_rgba(123,26,42,0.3)]">CF</div>
              )}
              {msg.role === 'staff' && (
                <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center shrink-0 text-[13px] font-bold text-maroon font-serif shadow-[0_2px_6px_rgba(184,144,10,0.3)]">S</div>
              )}
              <div className={`max-w-[75%] py-3 px-4.5 text-[14px] leading-[1.5] shadow-[0_4px_12px_rgba(0,0,0,0.05)] ${
                msg.role === 'user' ? 'rounded-[20px_20px_6px_20px] bg-maroon text-white border-none' : 
                msg.role === 'staff' ? 'rounded-[20px_20px_20px_6px] bg-gold-light text-maroon-dark border border-gold/20' : 
                msg.isError ? 'rounded-[20px_20px_20px_6px] bg-maroon-light text-maroon border-none' : 
                'rounded-[20px_20px_20px_6px] bg-white text-text-main border border-border'
              }`}>
                {msg.role === 'staff' && <p className="text-[11px] font-bold m-0 mb-1.5 uppercase tracking-[0.05em]">{msg.staff_name || 'Registrar Staff'}</p>}
                <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                {msg.escalated && <p className="text-[12px] text-gold m-0 mt-2 pt-2 border-t border-gold/30">📨 Forwarded to Registrar staff</p>}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-maroon flex items-center justify-center shrink-0 text-[11px] font-bold text-gold font-serif">CF</div>
              <div className="py-3 px-4 rounded-[16px_16px_16px_4px] bg-white border border-border">
                <div className="flex items-center gap-1 h-4">
                  {[0, 1, 2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full bg-text-sub animate-bounce-custom" style={{ animationDelay: `${j * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-border p-4">
        <div className="max-w-[680px] mx-auto">
          {error && <p className="text-[12px] text-maroon mb-1.5">{error}</p>}

          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={isListening ? 'Listening...' : 'Ask about registrar transactions...'}
              rows={1}
              className={`flex-1 py-3.5 px-4 rounded-2xl text-[14px] resize-none outline-none font-sans text-text-main min-h-[48px] max-h-[120px] box-border transition-all duration-200 border bg-white ${
                isListening ? 'border-gold shadow-[0_0_0_4px_rgba(184,144,10,0.1)]' : 'border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:border-maroon focus:shadow-[0_0_0_4px_rgba(123,26,42,0.1)]'
              }`}
            />

            {/* Mic button */}
            {voiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                title={isListening ? 'Stop listening' : 'Tap to speak'}
                className={`w-12 h-12 rounded-2xl shrink-0 border flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  isListening ? 'border-gold bg-gold-light text-gold animate-pulse-ring' : 'border-border bg-white text-text-sub'
                }`}
              >
                <MicIcon />
              </button>
            )}

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`w-12 h-12 rounded-2xl border-none shrink-0 flex items-center justify-center transition-all duration-200 ${
                !input.trim() || loading ? 'bg-border text-text-sub cursor-not-allowed shadow-none' : 'bg-maroon text-white cursor-pointer shadow-[0_4px_12px_rgba(123,26,42,0.25)]'
              }`}
            >
              <SendIcon />
            </button>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-center gap-4 mt-1.5 min-h-[18px]">
            {isListening ? (
              <span className="text-[11px] text-gold flex items-center gap-1.5">
                {[0,1,2,3].map(j => (
                  <span key={j} className="inline-block w-[3px] h-3 bg-gold rounded-[2px] animate-speaking-wave" style={{ animationDelay: `${j*0.12}s` }} />
                ))}
                Listening...
              </span>
            ) : isSpeaking ? (
              <span className="text-[11px] text-maroon flex items-center gap-1.5">
                {[0,1,2,3].map(j => (
                  <span key={j} className="inline-block w-[3px] h-3 bg-maroon rounded-[2px] animate-speaking-wave" style={{ animationDelay: `${j*0.12}s` }} />
                ))}
                Speaking...
                <button onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false) }}
                  className="ml-1 text-[10px] text-text-sub bg-transparent border-none cursor-pointer p-0">
                  ✕ stop
                </button>
              </span>
            ) : (
              <p className="text-[11px] text-text-sub m-0">
                Enter to send · Shift+Enter for new line{voiceSupported ? ' · Mic for voice' : ''}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
