import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/layout/Navbar'
import { sendMessage, clearChat, getChatHistory } from '../../services/aiService'
import { BotMessageSquare, Eraser } from 'lucide-react'

const SUGGESTED = [
  'What documents do I need for a TOR?',
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

export default function AiChat({ asWidget, headless, onClose, initialQuery }) {
  const { token } = useAuth()
  // eslint-disable-next-line no-unused-vars
  const navigate  = useNavigate()

  const DEFAULT_MESSAGE = {
    role: 'assistant',
    content: "Hi! I'm the CampusFlow AI Assistant 👋 I can help you with appointment booking, transaction requirements, and registrar procedures. How can I help you today?",
  }
  const [messages, setMessages] = useState([DEFAULT_MESSAGE])
  const [input,   setInput]   = useState(initialQuery || '')

  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery);
    }
  }, [initialQuery]);

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
  const [showConfirm, setShowConfirm] = useState(false)

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
      const isLengthError = e.message.includes('1000 characters') || msg.length > 1000
      setError(isLengthError ? "Your message is too long — please keep it under 1000 characters." : e.message)
      setMessages(prev => [...prev, { role: 'assistant', content: isLengthError ? "Message was too long to send." : "Sorry, I'm having trouble connecting. Please try again.", isError: true }])
    } finally { setLoading(false) }
  }

  const handleClear = async () => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    setShowConfirm(false)
    try {
      await clearChat(token)
      setMessages([{ role: 'assistant', content: 'Chat cleared! How can I help you today?' }])
    } catch (e) { setError(e.message) }
  }

  const chatContent = (
    <>
      {/* Chat area */}
      <div className={`flex-1 overflow-y-auto p-5 w-full box-border bg-[#F9FAFB] ${asWidget ? '' : 'max-w-170 mx-auto'}`}>

        {messages.length === 1 && (
          <div className="mb-8 mt-4">
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((q, i) => (
                <button key={i} onClick={() => handleSend(q)}
                  className="px-4 py-2.5 rounded-full border border-border bg-white text-text-main text-[13px] font-medium cursor-pointer transition-all hover:border-maroon hover:text-maroon hover:shadow-md hover:-translate-y-0.5 shadow-sm">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-maroon flex items-center justify-center shrink-0 text-white shadow-sm">
                  <BotMessageSquare size={15} />
                </div>
              )}
              {msg.role === 'staff' && (
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-gold to-yellow-500 flex items-center justify-center shrink-0 text-[11px] font-bold text-maroon font-serif shadow-sm">S</div>
              )}
              <div className={`max-w-[80%] py-2.5 px-4 text-[14px] leading-relaxed shadow-sm ${
                msg.role === 'user' ? 'rounded-[20px_20px_4px_20px] bg-maroon text-white border-none' : 
                msg.role === 'staff' ? 'rounded-[20px_20px_20px_4px] bg-gold-light text-maroon-dark border border-gold/20' : 
                msg.isError ? 'rounded-[20px_20px_20px_4px] bg-red-50 text-red-600 border border-red-100' : 
                'rounded-[20px_20px_20px_4px] bg-white text-text-main border border-border/60'
              }`}>
                {msg.role === 'staff' && <p className="text-[11px] font-bold m-0 mb-1 uppercase tracking-wider opacity-80">{msg.staff_name || 'Registrar Staff'}</p>}
                <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                {msg.escalated && <p className="text-[11px] font-medium text-gold m-0 mt-2 pt-2 border-t border-gold/20 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Forwarded to Registrar staff</p>}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="w-7 h-7 rounded-full bg-maroon flex items-center justify-center shrink-0 text-white shadow-sm">
                <BotMessageSquare size={15} />
              </div>
              <div className="py-3 px-4 rounded-[20px_20px_20px_4px] bg-white border border-border/60 shadow-sm">
                <div className="flex items-center gap-1.5 h-4">
                  {[0, 1, 2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full bg-text-sub/50 animate-bounce-custom" style={{ animationDelay: `${j * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>      {/* Input area */}
      <div className="bg-white p-4 pt-3 pb-5 shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className={`mx-auto ${asWidget ? 'w-full px-4' : 'max-w-170'} py-4 flex flex-col gap-5`}>
          {error && <p className="text-[12px] text-red-500 mb-2 px-2 flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> {error}</p>}

          <div className={`flex items-end gap-1.5 bg-[#F3F4F6] p-1.5 rounded-3xl border transition-all ${
            isListening ? 'border-maroon/40 shadow-[0_0_0_3px_rgba(123,26,42,0.1)]' : 'border-transparent focus-within:border-maroon/30 focus-within:bg-white focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
          }`}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={isListening ? 'Listening...' : 'Ask Aether anything...'}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none px-3 py-2 text-[14px] text-text-main placeholder-text-muted min-h-11 max-h-30 box-border leading-relaxed"
            />

            {/* Mic button */}
            {voiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                title={isListening ? 'Stop listening' : 'Tap to speak'}
                className={`w-10.5 h-10.5 rounded-full bg-transparent hover:bg-black/5 text-text-sub flex items-center justify-center shrink-0 transition-colors border-none cursor-pointer ${
                  isListening ? 'bg-maroon text-white animate-pulse-ring' : 'bg-transparent text-text-sub hover:bg-black/5 hover:text-text-main'
                }`}
              >
                <MicIcon />
              </button>
            )}

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`w-10.5 h-10.5 rounded-full border-none shrink-0 flex items-center justify-center transition-all duration-200 ${
                !input.trim() || loading ? 'bg-black/5 text-text-sub/50 cursor-not-allowed' : 'bg-maroon text-white cursor-pointer shadow-md hover:bg-maroon-dark hover:-translate-y-0.5'
              }`}
            >
              <SendIcon />
            </button>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between mt-2 h-4 px-2">
            <div className="flex items-center gap-4 flex-1 justify-center">
            {isListening ? (
              <span className="text-[11px] text-maroon flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-maroon animate-pulse"></span>
                Listening...
              </span>
            ) : isSpeaking ? (
              <span className="text-[11px] text-maroon flex items-center gap-1.5 font-medium">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                Speaking...
                <button onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false) }}
                  className="ml-1 px-1.5 py-0.5 rounded-sm text-[10px] bg-maroon-light text-maroon hover:bg-maroon hover:text-white transition-colors border-none cursor-pointer">
                  Stop
                </button>
              </span>
            ) : (
              <p className="text-[11px] text-text-sub m-0">
                Enter to send · Shift+Enter for new line{voiceSupported ? ' · Mic for voice' : ''}
              </p>
            )}
            </div>

            {input.length > 800 && (
              <div className={`text-[11px] font-medium transition-colors ${input.length > 1000 ? 'text-red-500' : 'text-gold'}`}>
                {input.length} / 1000
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )

  return (
    <div className="w-full h-full flex flex-col font-sans bg-white">
      {!headless && (
        <div className="bg-maroon text-white p-3 flex justify-between items-center shrink-0 drag-handle" style={{ cursor: 'move', touchAction: 'none' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <span className="font-serif font-bold text-gold text-[11px]">AE</span>
            </div>
            <span className="font-bold text-[14px]">Aether</span>
          </div>
          <div className="flex items-center gap-3 relative">
            <button onClick={() => setShowConfirm(!showConfirm)} title="Clear Chat" className="text-white/70 hover:text-white bg-transparent border-none cursor-pointer flex items-center justify-center">
              <Eraser size={16} />
            </button>
            {showConfirm && (
              <div className="absolute top-[120%] right-6 bg-white rounded-lg shadow-lg p-3 z-50 w-45 border border-border" onClick={e => e.stopPropagation()}>
                <p className="m-0 mb-3 text-[12px] text-text-main font-medium text-left">Clear chat history?</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowConfirm(false)} className="px-3 py-1.5 rounded bg-black/5 hover:bg-black/10 text-text-sub text-[11px] border-none cursor-pointer">Cancel</button>
                  <button onClick={handleClear} className="px-3 py-1.5 rounded bg-maroon hover:bg-maroon-dark text-white text-[11px] border-none cursor-pointer font-medium">Clear</button>
                </div>
              </div>
            )}
            <button onClick={onClose} className="text-white hover:text-white/80 bg-transparent border-none cursor-pointer flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      )}
      {chatContent}
    </div>
  )
}
