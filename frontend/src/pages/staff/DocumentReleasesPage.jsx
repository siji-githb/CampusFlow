import { useState, useEffect } from 'react'
import { getUncollectedDocuments, getCollectedDocuments, confirmStep } from '../../services/queueService'
import { useAuth } from '../../context/useAuth'
import { FileText, FolderOpen, AlertTriangle, Search, Check, X, Loader2 } from 'lucide-react'

export default function DocumentReleasesPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('uncollected')
  const [uncollected, setUncollected] = useState([])
  const [collected, setCollected] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [markingId, setMarkingId] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'uncollected') {
        const data = await getUncollectedDocuments(token)
        setUncollected(data || [])
      } else {
        const data = await getCollectedDocuments(token)
        setCollected(data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkCollected = async (ticketId, stepNumber) => {
    setMarkingId(ticketId)
    try {
      await confirmStep(token, ticketId, stepNumber, null, true)
      await fetchData()
    } catch (err) {
      setError('Failed to mark as collected: ' + err.message)
    } finally {
      setMarkingId(null)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [token, activeTab])

  const filteredUncollected = uncollected.filter(doc => 
    !search || 
    doc.queue_number.toLowerCase().includes(search.toLowerCase()) ||
    doc.student_name.toLowerCase().includes(search.toLowerCase()) ||
    doc.student_id.toLowerCase().includes(search.toLowerCase())
  )

  const filteredCollected = collected.filter(doc => 
    !search || 
    doc.queue_number.toLowerCase().includes(search.toLowerCase()) ||
    doc.student_name.toLowerCase().includes(search.toLowerCase()) ||
    doc.student_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade-up font-sans flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      <div className="mb-6 shrink-0">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Document Management</p>
        <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <FolderOpen size={24} className="text-maroon" /> Document Releases
        </h1>
        <p className="text-[12px] text-text-sub mt-2 mb-0">
          Track documents that are waiting to be picked up, and view the history of collected documents.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-3">
        {/* Tabs */}
        <div className="flex bg-border/40 p-1 rounded-xl">
          <button 
            onClick={() => { setActiveTab('uncollected'); setSearch(''); }}
            className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'uncollected' ? 'bg-white text-maroon shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'bg-transparent text-text-muted hover:text-text-main border-none'}`}
          >
            Uncollected ({uncollected.length})
          </button>
          <button 
            onClick={() => { setActiveTab('collected'); setSearch(''); }}
            className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'collected' ? 'bg-white text-maroon shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'bg-transparent text-text-muted hover:text-text-main border-none'}`}
          >
            Collected History
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-64">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search by queue, name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full border border-border bg-white text-[12.5px] font-medium outline-none text-text-main focus:border-maroon focus:ring-1 focus:ring-maroon transition-all shadow-sm"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger px-4 py-3 rounded-xl text-sm font-semibold border border-danger-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>
          <button onClick={() => setError('')} className="bg-transparent border-none text-danger cursor-pointer hover:opacity-70 flex"><X size={15} /></button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-6 pr-2 custom-scrollbar">
        
        {/* Uncollected Tab */}
        {activeTab === 'uncollected' && (
          <div className="min-w-212.5 animate-fade-in">
            <div className="grid grid-cols-[110px_1.2fr_90px_1.2fr_100px_90px_140px] gap-6 px-5 py-3 mb-2 sticky top-0 z-10 bg-surface/80 backdrop-blur-md rounded-xl border border-border shadow-sm">
              {['QUEUE NO.', 'STUDENT DETAILS', 'TYPE', 'TRANSACTION', 'RELEASE DATE', 'WAITING', 'ACTION'].map(col => (
                <div key={col} className="text-[10px] font-extrabold text-text-muted tracking-[0.08em] uppercase">{col}</div>
              ))}
            </div>
            
            {loading && uncollected.length === 0 ? (
              <div className="p-12 flex justify-center"><Loader2 size={32} className="text-maroon animate-spin" /></div>
            ) : filteredUncollected.length === 0 ? (
              <div className="p-16 mt-4 bg-white rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 border border-border">
                  <FileText className="text-text-muted" size={32} />
                </div>
                <h3 className="text-lg font-bold text-text-main mb-1">All clear!</h3>
                <p className="text-[13.5px] text-text-sub text-center max-w-sm">
                  {search ? 'No uncollected documents match your search criteria.' : 'There are no documents waiting to be collected right now.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredUncollected.map((doc, idx) => (
                  <div key={doc.queue_ticket_id} className="grid grid-cols-[110px_1.2fr_90px_1.2fr_100px_90px_140px] gap-6 px-6 py-4 items-center bg-white rounded-2xl border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(123,26,42,0.06)] hover:border-maroon/20 transition-all duration-300">
                    <div className="font-serif text-[24px] font-extrabold text-maroon leading-none tracking-tight">{doc.queue_number}</div>
                    <div>
                      <div className="text-[14px] font-bold text-text-main mb-0.5">{doc.student_name}</div>
                      <div className="text-[11.5px] text-text-muted font-mono bg-surface inline-block px-1.5 py-0.5 rounded border border-border">{doc.student_id}</div>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                        doc.priority_class === 'regular' ? 'bg-surface text-text-sub border-border' : 
                        doc.priority_class === 'alumni' ? 'bg-blue-light/50 text-blue border-blue-border' :
                        doc.priority_class === 'pwd' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        'bg-gold-light text-gold border-gold-border'
                      }`}>
                        {doc.priority_class || 'Regular'}
                      </span>
                    </div>
                    <div className="text-[12.5px] font-bold text-text-main leading-snug">{doc.transaction_type}</div>
                    <div className="text-[12px] font-semibold text-text-sub">
                      {doc.release_date ? new Date(doc.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
                    </div>
                    <div>
                      <div className={`text-[11px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1.5 border shadow-sm ${
                        doc.days_waiting >= 3
                          ? 'bg-danger-light text-danger border-danger/20'
                          : doc.days_waiting >= 1
                          ? 'bg-gold-light text-gold border-gold-border'
                          : 'bg-surface text-text-muted border-border'
                      }`}>
                        {doc.days_waiting >= 3 && <AlertTriangle size={12} strokeWidth={3} />}
                        {doc.days_waiting !== null ? (doc.days_waiting === 0 ? 'Today' : `${doc.days_waiting} days`) : 'Today'}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => handleMarkCollected(doc.queue_ticket_id, doc.step_number)}
                        disabled={markingId === doc.queue_ticket_id}
                        className={`w-full py-2.5 text-white text-[12px] font-extrabold rounded-xl transition-all border-none shadow-[0_4px_12px_rgba(34,197,94,0.2)] flex items-center justify-center gap-2 ${
                          markingId === doc.queue_ticket_id 
                            ? 'bg-success/50 cursor-not-allowed shadow-none' 
                            : 'bg-success hover:bg-[#1CA84F] hover:-translate-y-0.5 cursor-pointer hover:shadow-[0_6px_16px_rgba(34,197,94,0.3)]'
                        }`}
                      >
                        {markingId === doc.queue_ticket_id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Marking...
                          </>
                        ) : (
                          <>
                            <Check size={14} strokeWidth={3} />
                            Mark Collected
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collected Tab */}
        {activeTab === 'collected' && (
          <div className="min-w-212.5 animate-fade-in">
            <div className="grid grid-cols-[110px_1.2fr_90px_1.2fr_100px_110px] gap-6 px-5 py-3 mb-2 sticky top-0 z-10 bg-surface/80 backdrop-blur-md rounded-xl border border-border shadow-sm">
              {['QUEUE NO.', 'STUDENT DETAILS', 'TYPE', 'TRANSACTION', 'RELEASE DATE', 'COLLECTED ON'].map(col => (
                <div key={col} className="text-[10px] font-extrabold text-text-muted tracking-[0.08em] uppercase">{col}</div>
              ))}
            </div>
            
            {loading && collected.length === 0 ? (
              <div className="p-12 flex justify-center"><Loader2 size={32} className="text-maroon animate-spin" /></div>
            ) : filteredCollected.length === 0 ? (
              <div className="p-16 mt-4 bg-white rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 border border-border">
                  <Check className="text-success" size={32} />
                </div>
                <h3 className="text-lg font-bold text-text-main mb-1">No history found</h3>
                <p className="text-[13.5px] text-text-sub text-center max-w-sm">
                  {search ? 'No collected documents match your search criteria.' : 'Completed documents will appear here once claimed.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredCollected.map((doc, idx) => (
                  <div key={doc.queue_ticket_id} className="grid grid-cols-[110px_1.2fr_90px_1.2fr_100px_110px] gap-6 px-6 py-4 items-center bg-white/70 rounded-2xl border border-border shadow-sm hover:shadow-md hover:bg-white transition-all duration-300 opacity-90 hover:opacity-100">
                    <div className="font-serif text-[22px] font-bold text-text-muted leading-none">{doc.queue_number}</div>
                    <div>
                      <div className="text-[14px] font-bold text-text-main mb-0.5">{doc.student_name}</div>
                      <div className="text-[11.5px] text-text-muted font-mono bg-surface inline-block px-1.5 py-0.5 rounded border border-border">{doc.student_id}</div>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                        doc.priority_class === 'regular' ? 'bg-surface text-text-sub border-border' : 
                        doc.priority_class === 'alumni' ? 'bg-blue-light/50 text-blue border-blue-border' :
                        doc.priority_class === 'pwd' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        'bg-gold-light text-gold border-gold-border'
                      }`}>
                        {doc.priority_class || 'Regular'}
                      </span>
                    </div>
                    <div className="text-[12.5px] font-bold text-text-sub leading-snug">{doc.transaction_type}</div>
                    <div className="text-[12px] font-semibold text-text-sub">
                      {doc.release_date ? new Date(doc.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
                    </div>
                    <div>
                      <div className="text-[12.5px] font-extrabold text-success flex items-center gap-1.5 mb-0.5">
                        <Check size={14} strokeWidth={4} />
                        {new Date(doc.confirmed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-text-muted font-bold tracking-wide uppercase ml-5">
                        {new Date(doc.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
