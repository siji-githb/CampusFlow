import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'
import { BotMessageSquare, Eraser, Calendar, ChevronRight, Clock, AlertCircle, Zap, ClipboardList, Info } from 'lucide-react'
import { sendMessage, sendMessageStream, clearChat, getChatHistory } from '../../services/aiService'

const SUGGESTED = [
  'Book appointment for TOR and COE',
  'What requirements do I need for a TOR or COE?',
  'How do I book an appointment?',
]

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const sanitizeDisplayText = (text) => {
  if (!text) return ''
  return text
    .replace(/\bCampusFlow\s+Registrar(?:'s\s+Office)?\b/gi, "the Registrar's Office")
    .replace(/\bCampusFlow\s+Registrar\b/gi, 'the Registrar')
    .replace(/\bCampusFlow\s+AI\s+Assistant\b/gi, 'AI Assistant')
    .replace(/\bCampusFlow\s+Assistant\b/gi, 'AI Assistant')
    .replace(/\bCebu\s+Roosevelt\s+Memorial\s+Colleges\b/gi, "the Registrar's Office")
    .replace(/\bCebu\s+Roosevelt\b/gi, 'the Registrar')
    .replace(/\bofficial\s+CRMC\s+options\b/gi, 'available options')
    .replace(/\bCRMC\s+options\b/gi, 'available options')
    .replace(/\bCRMC\s+Registrar(?:'s\s+Office)?\b/gi, "the Registrar's Office")
    .replace(/\bCRMC\b/g, "the Registrar's Office")
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
}

function FormattedMessageContent({ content, isUser, onNavigate }) {
  if (!content) return null
  const sanitized = isUser ? content : sanitizeDisplayText(content)
  const blocks = sanitized.split(/\n\n+/)
  const isBookingConfirmation = !isUser && (
    sanitized.toLowerCase().includes('successfully booked') || 
    (sanitized.toLowerCase().includes('appointment') && (sanitized.toLowerCase().includes('confirmed') || sanitized.toLowerCase().includes('has been booked')))
  )

  return (
    <div className={`space-y-2 text-[13.5px] sm:text-[14px] leading-relaxed ${isUser ? 'text-white' : 'text-text-main'}`}>
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n')
        const hasBullets = lines.some(l => {
          const t = l.trim()
          return t.startsWith('•') || t.startsWith('-') || t.startsWith('*')
        })

        if (hasBullets) {
          return (
            <div key={bIdx} className="space-y-1.5 my-1">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim()
                if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                  const itemText = trimmed.replace(/^[•\-*]\s*/, '').trim()
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${isUser ? 'bg-white/80' : 'bg-maroon'}`} />
                      <span className="flex-1 leading-snug">{itemText}</span>
                    </div>
                  )
                }
                return (
                  <p key={lIdx} className="m-0 font-medium leading-snug">
                    {line}
                  </p>
                )
              })}
            </div>
          )
        }

        return (
          <p key={bIdx} className="m-0 whitespace-pre-wrap">
            {block}
          </p>
        )
      })}

      {isBookingConfirmation && onNavigate && (
        <div className="pt-2 border-t border-border/40 mt-2">
          <button
            type="button"
            onClick={() => onNavigate('/student/appointments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-maroon-light hover:bg-maroon hover:text-white text-maroon text-xs font-semibold border border-maroon-border/40 transition-all cursor-pointer shadow-2xs"
          >
            <Calendar size={13} />
            <span>View in My Appointments</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function LimitErrorContent({ content, limitType, onNavigate }) {
  const isDaily = limitType === 'daily' || content.toLowerCase().includes('daily')

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs sm:text-[13px]">
          {isDaily ? <Clock size={14} className="text-amber-700 shrink-0" /> : <Zap size={14} className="text-amber-700 shrink-0" />}
          <span>{isDaily ? "Daily Question Limit Reached" : "Sending Messages Too Quickly"}</span>
        </div>
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300 shadow-2xs">
          {isDaily ? "10/10 Used" : "Please Pause"}
        </span>
      </div>

      <p className="m-0 text-xs sm:text-[13px] text-amber-950 leading-relaxed font-medium">
        {content}
      </p>

      {isDaily && onNavigate && (
        <div className="pt-2 border-t border-amber-200/80 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('/student/book')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-maroon text-white text-xs font-semibold hover:bg-maroon-dark transition-all cursor-pointer shadow-2xs border-none"
          >
            <Calendar size={13} />
            <span>Book Appointment Online</span>
            <ChevronRight size={12} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/student/appointments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-text-main text-xs font-semibold hover:bg-off-white transition-all cursor-pointer border border-border shadow-2xs"
          >
            <ClipboardList size={13} />
            <span>My Appointments</span>
          </button>
        </div>
      )}
    </div>
  )
}

const DEFAULT_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm your AI Assistant for the Registrar's Office 👋 I can help you with appointment booking, transaction requirements, and registrar procedures. How can I help you today?",
}

export default function AiChat({ asWidget, headless, onClose, initialQuery }) {
  const navigate = useNavigate()
  const { token } = useAuth()
  const toast = useToast()

  const handleNavigate = (path) => {
    navigate(path)
    if (onClose) onClose()
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
  const [statusText, setStatusText] = useState('')
  const [error,   setError]   = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const confirmPopupRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (confirmPopupRef.current && !confirmPopupRef.current.contains(event.target)) {
        setShowConfirm(false);
      }
    };
    if (showConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfirm]);

  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  const voiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 24), 24)}px`;
    }
  }, [input]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const startListening = () => {
    if (!voiceSupported) {
      alert('Voice input requires Chrome or Edge.')
      return
    }

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
      setInput(prev => {
        const spacer = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
        return prev + spacer + transcript;
      })
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
    
    if (msg.length > 1000) {
      setError("Your message is too long — please keep it under 1000 characters.");
      setMessages(prev => [...prev, { role: 'assistant', content: "Message was too long to send.", isError: true }]);
      return;
    }

    setInput(''); setError(''); setStatusText('')
    recognitionRef.current?.stop()
    setIsListening(false)

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    let streamedText = ''

    try {
      await sendMessageStream(token, msg, {
        onStatus: (status) => {
          setStatusText(status)
        },
        onDelta: (chunk) => {
          if (!streamedText) {
            setLoading(false)
            setStatusText('')
          }
          streamedText += chunk
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last && last.role === 'assistant' && !last.isError && last._streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: streamedText }
              ]
            }
            return [
              ...prev,
              { role: 'assistant', content: streamedText, _streaming: true }
            ]
          })
        },
        onError: (errMsg) => {
          throw new Error(errMsg)
        },
        onDone: () => {
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last && last._streaming) {
              const { _streaming, ...clean } = last
              return [...prev.slice(0, -1), clean]
            }
            return prev
          })
        }
      })
    } catch (e) {
      const is429 = e.status === 429 || e.errorType === 'daily_limit' || e.errorType === 'minute_limit' || e.message?.toLowerCase().includes('limit')
      if (is429) {
        const isDaily = e.errorType === 'daily_limit' || e.message?.toLowerCase().includes('daily')
        const friendlyMessage = e.message || (isDaily
          ? "Daily message limit reached. You have used all 10 AI questions for today to ensure fair access for all students. You can still book appointments directly through the Book Appointment page or try again tomorrow."
          : "You are sending messages too quickly. Please wait a moment before sending your next message.")
          
        setError(isDaily ? "Daily limit reached (10 questions/day)." : "Please wait a moment before sending another message.")
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: friendlyMessage, 
            isLimitError: true,
            limitType: isDaily ? 'daily' : 'minute'
          }
        ])
      } else if (!streamedText) {
        try {
          const fallbackData = await sendMessage(token, msg)
          setMessages(prev => [...prev, { role: 'assistant', content: fallbackData.message }])
        } catch (fallbackErr) {
          const isFallback429 = fallbackErr.status === 429 || fallbackErr.errorType === 'daily_limit' || fallbackErr.message?.toLowerCase().includes('limit')
          if (isFallback429) {
            const isDaily = fallbackErr.errorType === 'daily_limit' || fallbackErr.message?.toLowerCase().includes('daily')
            const limitMsg = fallbackErr.message || (isDaily
              ? "Daily message limit reached. You have used all 10 AI questions for today to ensure fair access for all students. You can still book appointments directly through the Book Appointment page or try again tomorrow."
              : "You are sending messages too quickly. Please wait a moment before sending your next message.")
            setError(isDaily ? "Daily limit reached (10 questions/day)." : "Please wait a moment before sending another message.")
            setMessages(prev => [
              ...prev, 
              { 
                role: 'assistant', 
                content: limitMsg, 
                isLimitError: true,
                limitType: isDaily ? 'daily' : 'minute'
              }
            ])
          } else {
            const isLengthError = fallbackErr.message?.includes('1000 characters') || msg.length > 1000
            const errorText = isLengthError 
              ? "Your message is too long — please keep it under 1000 characters." 
              : (fallbackErr.message || "Sorry, I'm having trouble connecting. Please try again.")
            setError(errorText)
            setMessages(prev => [...prev, { role: 'assistant', content: errorText, isError: true }])
          }
        }
      } else {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last && last._streaming) {
            const { _streaming, ...clean } = last
            return [...prev.slice(0, -1), clean]
          }
          return prev
        })
      }
    } finally {
      setLoading(false)
      setStatusText('')
    }
  }

  const hasDailyLimit = messages.some(m => 
    (m.isLimitError && m.limitType === 'daily') || 
    (m.role === 'assistant' && typeof m.content === 'string' && m.content.toLowerCase().includes('daily message limit reached'))
  )

  const handleClear = async () => {
    setShowConfirm(false)
    try {
      await clearChat(token)
      setMessages([{ role: 'assistant', content: 'Chat cleared! How can I help you today?' }])
      setError('')
      toast.info('Chat conversation cleared.')
    } catch (e) { 
      setError(e.message)
      toast.error(e.message) 
    }
  }

  const chatContent = (
    <>
      {/* Chat area */}
      <div className={`flex-1 overflow-y-auto p-5 w-full box-border bg-[#F9FAFB] ${asWidget ? '' : 'max-w-170 mx-auto'}`}>

        {messages.length === 1 && !hasDailyLimit && (
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
          {messages.map((msg, i) => {
            const isLimit = msg.isLimitError || (msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.toLowerCase().includes('daily message limit reached'))
            return (
              <div key={i} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm ${
                    isLimit ? 'bg-amber-600' : 'bg-maroon'
                  }`}>
                    {isLimit ? <Clock size={15} /> : <BotMessageSquare size={15} />}
                  </div>
                )}
                <div className={`${asWidget ? 'max-w-[88%]' : 'max-w-[80%]'} py-2.5 px-4 text-[14px] leading-relaxed shadow-sm ${
                  msg.role === 'user' ? 'rounded-[20px_20px_4px_20px] bg-maroon text-white border-none' : 
                  isLimit ? 'rounded-[20px_20px_20px_4px] bg-amber-50/90 text-amber-950 border border-amber-200/90 shadow-2xs' :
                  msg.isError ? 'rounded-[20px_20px_20px_4px] bg-red-50 text-red-600 border border-red-100' : 
                  'rounded-[20px_20px_20px_4px] bg-white text-text-main border border-border/60'
                }`}>
                  {isLimit ? (
                    <LimitErrorContent 
                      content={msg.content} 
                      limitType={msg.limitType || (msg.content?.toLowerCase().includes('daily') ? 'daily' : 'minute')} 
                      onNavigate={handleNavigate} 
                    />
                  ) : (
                    <FormattedMessageContent content={msg.content} isUser={msg.role === 'user'} onNavigate={handleNavigate} />
                  )}
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="flex items-end gap-2.5 animate-fade-up" style={{ animationDuration: '0.2s' }}>
              <div className="w-7 h-7 rounded-full bg-maroon flex items-center justify-center shrink-0 text-white shadow-sm">
                <BotMessageSquare size={15} />
              </div>
              <div className="py-2.5 px-3.5 rounded-[20px_20px_20px_4px] bg-white border border-border/70 shadow-xs flex items-center gap-2">
                <span className="text-[12.5px] font-medium text-text-sub italic">
                  {statusText || 'Thinking'}
                </span>
                <div className="flex items-center gap-1 h-3.5">
                  {[0, 1, 2].map(j => (
                    <div 
                      key={j} 
                      className="w-1.5 h-1.5 rounded-full bg-maroon/70 animate-bounce-custom" 
                      style={{ animationDelay: `${j * 0.15}s` }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white px-3 sm:px-4 py-2.5 sm:py-3 shrink-0 shadow-[0_-2px_12px_rgba(0,0,0,0.02)] border-t border-border/60 z-10 relative">
        <div className={`mx-auto ${asWidget ? 'w-full px-1' : 'max-w-170'}`}>
          {error && (
            <div className={`text-[12px] mb-1.5 px-2 flex items-center gap-1.5 ${
              hasDailyLimit ? 'text-amber-800 font-medium' : 'text-red-500'
            }`}>
              {hasDailyLimit ? (
                <Clock size={13} className="shrink-0 text-amber-700" />
              ) : (
                <AlertCircle size={13} className="shrink-0 text-red-500" />
              )}
              <span>{error}</span>
            </div>
          )}

          {/* Pill-shaped Chatbox Container */}
          <div className={`relative flex items-center w-full rounded-full border transition-all duration-200 pl-4.5 pr-2 py-1 ${
            hasDailyLimit
              ? 'border-amber-300 bg-amber-50/40 shadow-2xs'
              : isListening 
                ? 'border-maroon shadow-[0_0_0_3px_rgba(123,26,42,0.12)] bg-white' 
                : 'border-slate-300 hover:border-slate-400 focus-within:border-maroon focus-within:bg-white focus-within:ring-2 focus-within:ring-maroon/10 bg-off-white/50 shadow-2xs'
          }`}>
            <textarea
              ref={textareaRef}
              value={input}
              disabled={hasDailyLimit || loading}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={
                hasDailyLimit 
                  ? 'Daily question limit reached (10/10 questions used today)' 
                  : isListening 
                    ? 'Listening...' 
                    : 'Send a message'
              }
              rows={1}
              style={{ height: '38px', minHeight: '38px', maxHeight: '120px' }}
              className={`flex-1 bg-transparent border-none outline-none resize-none py-2 px-0 text-[14px] leading-5 overflow-y-auto box-border ${
                hasDailyLimit 
                  ? 'text-amber-900 placeholder:text-amber-700/70 cursor-not-allowed' 
                  : 'text-text-main placeholder:text-text-muted/80'
              }`}
            />

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {/* Mic button */}
              {voiceSupported && !hasDailyLimit && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? 'Stop listening' : 'Tap to speak'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border-none ${
                    isListening ? 'bg-maroon text-white animate-pulse-ring' : 'bg-transparent text-text-muted hover:text-maroon hover:bg-maroon-light/50'
                  }`}
                >
                  <MicIcon />
                </button>
              )}

              {/* Send button inside pill */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading || hasDailyLimit}
                title={hasDailyLimit ? "Daily limit reached" : "Send message"}
                className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all cursor-pointer border-none ${
                  !input.trim() || loading || hasDailyLimit
                    ? 'text-slate-400 bg-transparent cursor-not-allowed opacity-50' 
                    : 'text-maroon hover:text-white hover:bg-maroon active:scale-95 transition-all'
                }`}
              >
                <SendIcon />
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between mt-1.5 px-2">
            <div className="flex items-center gap-4 flex-1 justify-center">
            {hasDailyLimit ? (
              <p className="text-[10.5px] text-amber-800 m-0 text-center font-medium">
                Limit resets at midnight · You can still book appointments directly via the booking page
              </p>
            ) : isListening ? (
              <span className="text-[10.5px] text-maroon flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-maroon animate-pulse"></span>
                Listening...
              </span>
            ) : (
              <p className="text-[10.5px] text-text-muted m-0 text-center">
                Enter to send · Shift+Enter for new line{voiceSupported ? ' · Mic for voice' : ''}
              </p>
            )}
            </div>

            {!hasDailyLimit && input.length > 800 && (
              <div className={`text-[10.5px] font-medium transition-colors ${input.length > 1000 ? 'text-red-500' : 'text-gold'}`}>
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
          <div className="flex items-center gap-3 relative" ref={confirmPopupRef}>
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
