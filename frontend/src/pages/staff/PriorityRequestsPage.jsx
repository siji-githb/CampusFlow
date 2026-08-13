import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { getPendingPriorityRequests, approvePriorityRequest, rejectPriorityRequest } from '../../services/priorityService'
import { Check, X, ShieldCheck, Image as ImageIcon, Clock, Sparkles, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

// Image Preview Modal
function ImageModal({ url, onClose }) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!url) return null;

  const handleZoomIn = (e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.5, 5)); };
  const handleZoomOut = (e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.5, 0.5)); };
  const handleReset = (e) => { e.stopPropagation(); setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer overflow-hidden" 
         onClick={onClose}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}>
      
      {/* Controls */}
      <div className="absolute top-6 flex items-center gap-4 z-50 bg-black/50 p-2 rounded-xl backdrop-blur-md" onClick={e => e.stopPropagation()}>
        <button onClick={handleZoomOut} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border-none cursor-pointer"><ZoomOut size={20} /></button>
        <span className="text-white text-sm font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border-none cursor-pointer"><ZoomIn size={20} /></button>
        <div className="w-px h-6 bg-white/20 mx-2" />
        <button onClick={handleReset} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border-none cursor-pointer" title="Reset View"><RotateCcw size={18} /></button>
      </div>

      {/* Close button */}
      <button onClick={onClose} className="absolute top-6 right-6 bg-white/10 border-none text-white rounded-full w-12 h-12 flex items-center justify-center cursor-pointer hover:bg-danger hover:text-white transition-colors z-50 text-[28px] leading-none">×</button>
      
      {/* Image Container */}
      <div 
        className="relative flex items-center justify-center w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
        onMouseDown={scale > 1 ? handleMouseDown : (e) => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <img 
          src={url} 
          alt="Document Preview" 
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-200 ease-out" 
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, pointerEvents: 'none' }}
          draggable="false"
        />
      </div>
    </div>
  )
}

export default function PriorityRequestsPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isConfirming, setIsConfirming] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const loadRequests = useCallback(async (showSkeleton = true) => {
    try {
      if (showSkeleton) setLoading(true)
      const data = await getPendingPriorityRequests(token)
      setRequests(data)
    } catch (err) {
      setError(err.message)
    } finally {
      if (showSkeleton) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadRequests()
    const t = setInterval(() => loadRequests(false), 15000)
    return () => clearInterval(t)
  }, [loadRequests])

  const handleApprove = async (id) => {
    setIsConfirming(id)
    try {
      await approvePriorityRequest(token, id)
      await loadRequests()
    } catch (err) {
      alert("Failed to approve: " + err.message)
    } finally {
      setIsConfirming(null)
    }
  }

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.')
      return
    }
    setIsConfirming(id)
    try {
      await rejectPriorityRequest(token, id, rejectReason.trim())
      setRejectingId(null)
      setRejectReason('')
      await loadRequests()
    } catch (err) {
      alert("Failed to reject: " + err.message)
    } finally {
      setIsConfirming(null)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col gap-3 max-w-5xl">
        <div className="h-8 w-48 bg-border rounded-md mb-4" />
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-border rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      {previewUrl && <ImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      <div className="mb-6">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Verification</p>
        <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <ShieldCheck size={24} className="text-maroon" /> Priority Requests
        </h1>
        <p className="text-[12px] text-text-sub mt-2 mb-0">
          Review documents submitted by students for PWD or Pregnancy priority status.
        </p>
      </div>

      {error && (
        <div className="py-3 px-4 rounded-xl bg-danger-light border border-danger-border text-danger text-[13px] mb-6">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center text-text-muted text-[14px] mb-8 shadow-sm">
          No pending priority requests.
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => {
            const score = req.ocr_confidence_score || 0;
            const scoreColor = score >= 70 ? 'text-success border-success bg-success-light/30' : 'text-danger border-danger bg-danger-light/30';
            
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-stretch justify-between group overflow-hidden">
                
                {/* Main Content Area */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-[18px] font-bold text-text-main m-0 font-serif tracking-tight">
                          {req.users?.last_name}, {req.users?.first_name}
                        </h3>
                        <span className="text-[11px] text-text-muted font-bold tracking-wider uppercase bg-off-white px-2 py-1 rounded-md border border-border">ID: {req.users?.student_id}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${req.priority_type === 'pwd' ? 'bg-maroon-light/50 text-maroon border border-maroon-border/50' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                        {req.priority_type === 'pwd' ? 'PWD' : 'Pregnant'}
                      </span>
                      <span className="text-[12px] text-text-muted flex items-center gap-1.5 font-medium">
                        <Clock size={13} className="text-text-muted/70" />
                        Requested {new Date(req.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* AI Analysis Box */}
                  <div className="relative rounded-xl border border-border/60 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className={score >= 70 ? 'text-success' : 'text-danger'} />
                        <span className="text-[11px] font-extrabold text-text-main uppercase tracking-[0.08em]">AI Confidence Score</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${scoreColor} shadow-sm`}>
                        {score}%
                      </span>
                    </div>
                    <p className="text-[13px] text-text-sub m-0 leading-relaxed pl-6">
                      <strong className="text-text-main font-semibold">Reasoning:</strong> {req.ocr_reasoning || 'No reasoning provided.'}
                    </p>
                  </div>
                </div>

                {/* Actions Sidebar */}
                <div className="flex flex-col gap-3 shrink-0 w-full md:w-55 p-6 justify-center">
                  <button
                    onClick={() => setPreviewUrl(req.document_url)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-text-main font-bold text-[13px] border border-border shadow-sm cursor-pointer hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                  >
                    <ImageIcon size={15} className="text-text-muted" /> View Document
                  </button>
                  
                  {rejectingId === req.id ? (
                    <div className="flex flex-col gap-3 animate-fade-in">
                      <input 
                        type="text" 
                        value={rejectReason} 
                        onChange={e => setRejectReason(e.target.value)} 
                        placeholder="Reason for rejection..." 
                        className="w-full px-3 py-2.5 rounded-xl border border-border text-[12px] outline-none focus:border-danger transition-colors box-border bg-white shadow-inner"
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button onClick={() => setRejectingId(null)} disabled={isConfirming === req.id} className="flex-1 py-2.5 rounded-xl border border-border bg-white text-text-main text-[12px] font-bold cursor-pointer hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50">Cancel</button>
                        <button onClick={() => handleReject(req.id)} disabled={isConfirming === req.id || !rejectReason.trim()} className="flex-1 py-2.5 rounded-xl border-none bg-danger text-white text-[12px] font-bold cursor-pointer hover:bg-danger-dark shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50">Confirm</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={isConfirming === req.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-white font-bold text-[13px] border-none cursor-pointer hover:bg-success-dark shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check size={15} /> Approve Request
                      </button>
                      <button
                        onClick={() => { setRejectingId(req.id); setRejectReason('') }}
                        disabled={isConfirming === req.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-danger border border-danger-border font-bold text-[13px] cursor-pointer hover:bg-danger-light shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X size={15} /> Reject
                      </button>
                    </div>
                  )}
                </div>
                
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

