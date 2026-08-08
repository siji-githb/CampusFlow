import { useState, useEffect } from 'react'
import { getUncollectedDocuments, getCollectedDocuments, confirmStep } from '../../services/queueService'
import { useAuth } from '../../context/useAuth'
import { FileText, FolderOpen, AlertTriangle, Search, Check } from 'lucide-react'

export default function DocumentReleasesPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('uncollected')
  const [uncollected, setUncollected] = useState([])
  const [collected, setCollected] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

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
    try {
      await confirmStep(token, ticketId, stepNumber, null, true)
      await fetchData()
    } catch (err) {
      setError('Failed to mark as collected: ' + err.message)
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
        <div className="mb-4 bg-danger-light text-danger px-4 py-3 rounded-xl text-sm font-semibold border border-danger-border flex items-center gap-2 shrink-0">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border shadow-[0_4px_16px_rgba(0,0,0,0.02)] bg-white">
        
        {/* Uncollected Tab */}
        {activeTab === 'uncollected' && (
          <div className="min-w-212.5">
            <div className="grid grid-cols-[110px_1.5fr_1.2fr_100px_120px] gap-0 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border sticky top-0 z-10">
              {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'WAITING', 'ACTION'].map(col => (
                <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
              ))}
            </div>
            
            {loading && uncollected.length === 0 ? (
              <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-maroon border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredUncollected.length === 0 ? (
              <div className="p-12 text-center text-[13px] font-semibold text-text-muted">
                {search ? 'No uncollected documents match your search.' : 'No uncollected documents right now.'}
              </div>
            ) : (
              filteredUncollected.map((doc, idx) => (
                <div key={doc.queue_ticket_id} className={`grid grid-cols-[110px_1.5fr_1.2fr_100px_120px] gap-0 px-5 py-4 items-center transition-all hover:bg-surface/30 ${idx < filteredUncollected.length - 1 ? 'border-b border-border/60' : ''}`}>
                  <div className="font-serif text-[20px] font-extrabold text-maroon leading-none">{doc.queue_number}</div>
                  <div>
                    <div className="text-[13px] font-semibold text-text-main mb-0.5">{doc.student_name}</div>
                    <div className="text-[11px] text-text-muted font-mono">{doc.student_id}</div>
                  </div>
                  <div className="text-[12px] font-semibold text-text-main leading-snug">{doc.transaction_type}</div>
                  <div>
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block border ${
                      doc.days_waiting >= 3
                        ? 'bg-danger-light text-danger border-danger-border'
                        : 'bg-surface text-text-muted border-border'
                    }`}>
                      {doc.days_waiting !== null ? `${doc.days_waiting} days` : 'Today'}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleMarkCollected(doc.queue_ticket_id, doc.step_number)}
                      className="px-3 py-1.5 bg-success text-white text-[11px] font-bold rounded-lg hover:bg-green-600 transition-colors border-none cursor-pointer"
                    >
                      Mark Collected
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Collected Tab */}
        {activeTab === 'collected' && (
          <div className="min-w-212.5">
            <div className="grid grid-cols-[110px_1.2fr_1fr_1fr_1.2fr] gap-0 px-5 py-3 bg-surface/50 backdrop-blur-sm border-b border-border sticky top-0 z-10">
              {['QUEUE NO.', 'STUDENT DETAILS', 'TRANSACTION', 'COLLECTED ON', 'RELEASED TO'].map(col => (
                <div key={col} className="text-[10px] font-bold text-text-muted tracking-[0.06em] uppercase">{col}</div>
              ))}
            </div>
            
            {loading && collected.length === 0 ? (
              <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-maroon border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredCollected.length === 0 ? (
              <div className="p-12 text-center text-[13px] font-semibold text-text-muted">
                {search ? 'No collected documents match your search.' : 'No collected documents found.'}
              </div>
            ) : (
              filteredCollected.map((doc, idx) => (
                <div key={doc.queue_ticket_id} className={`grid grid-cols-[110px_1.2fr_1fr_1fr_1.2fr] gap-0 px-5 py-4 items-center transition-all hover:bg-surface/30 ${idx < filteredCollected.length - 1 ? 'border-b border-border/60' : ''}`}>
                  <div className="font-serif text-[18px] font-bold text-text-muted leading-none">{doc.queue_number}</div>
                  <div>
                    <div className="text-[13px] font-semibold text-text-main mb-0.5">{doc.student_name}</div>
                    <div className="text-[11px] text-text-muted font-mono">{doc.student_id}</div>
                  </div>
                  <div className="text-[12px] font-semibold text-text-main leading-snug">{doc.transaction_type}</div>
                  <div>
                    <div className="text-[12px] font-semibold text-success flex items-center gap-1.5">
                      <Check size={12} strokeWidth={3} />
                      {new Date(doc.confirmed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-text-muted font-semibold mt-0.5">
                      {new Date(doc.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[12px] text-text-sub font-medium bg-surface px-2 py-1 rounded-md border border-border">
                      {doc.released_to || 'Self'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}
