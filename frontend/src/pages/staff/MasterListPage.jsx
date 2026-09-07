import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getStudentRecords, uploadStudentRecords, addStudentRecord, deleteStudentRecord, editStudentRecord, bulkDeleteStudentRecords } from '../../services/adminService'
import { FileSpreadsheet, Edit, Trash2, ClipboardList, Search, ChevronDown, Check, AlertTriangle, X, User, GraduationCap, ShieldCheck, UserCheck, Calendar } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'

const COURSES = [
  'Bachelor of Science in Information Technology',
  'Bachelor of Science in Financial Management',
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education',
  'Bachelor of Science in Psychology',
  'Bachelor of Science in Criminology',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Tourism Management',
  'Bachelor of Science in Accountancy'
]

const COURSE_FILTER_OPTIONS = [
  { v: 'All', l: 'All Courses' },
  { v: 'Bachelor of Science in Information Technology', l: 'BS Information Technology' },
  { v: 'Bachelor of Science in Financial Management', l: 'BS Financial Management' },
  { v: 'Bachelor of Elementary Education', l: 'B Elementary Education' },
  { v: 'Bachelor of Secondary Education', l: 'B Secondary Education' },
  { v: 'Bachelor of Science in Psychology', l: 'BS Psychology' },
  { v: 'Bachelor of Science in Criminology', l: 'BS Criminology' },
  { v: 'Bachelor of Science in Hospitality Management', l: 'BS Hospitality Management' },
  { v: 'Bachelor of Science in Tourism Management', l: 'BS Tourism Management' },
  { v: 'Bachelor of Science in Accountancy', l: 'BS Accountancy' }
]

const PRIORITY_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'alumni', label: 'Alumni' }
]

export default function MasterListPage() {
  const { token } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadFileMeta, setUploadFileMeta] = useState(null)
  const toast = useToast()
  const fileInputRef = useRef()
  const showToast = useCallback((msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else if (type === 'info') toast.info(text)
    else toast.success(text)
  }, [toast])

  const [form, setForm] = useState({ student_id: '', first_name: '', last_name: '', course: '', priority_class: 'regular' })
  const [uploadPriority, setUploadPriority] = useState('regular')

  // Edit State
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', course: '', priority_class: 'regular' })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)
  const [recordToDelete, setRecordToDelete] = useState(null)
  const [courseFilter, setCourseFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRecords, setSelectedRecords] = useState(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)

  const displayedRecords = records.filter(r => {
    const matchCourse = courseFilter === 'All' || r.course === courseFilter
    const searchLower = searchQuery.toLowerCase()
    const matchSearch = !searchQuery || 
      r.student_id.toLowerCase().includes(searchLower) ||
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchLower)
    return matchCourse && matchSearch
  })

  // Reset page to 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [courseFilter, searchQuery])

  const itemsPerPage = 10
  const totalPages = Math.ceil(displayedRecords.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, displayedRecords.length)
  const currentRecords = displayedRecords.slice(startIndex, startIndex + itemsPerPage)

  const allCurrentSelected = currentRecords.length > 0 && currentRecords.every(r => selectedRecords.has(r.student_id))

  const toggleSelectAll = () => {
    const newSet = new Set(selectedRecords)
    if (allCurrentSelected) {
      currentRecords.forEach(r => newSet.delete(r.student_id))
    } else {
      currentRecords.forEach(r => newSet.add(r.student_id))
    }
    setSelectedRecords(newSet)
  }

  const toggleSelect = (id) => {
    const newSet = new Set(selectedRecords)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedRecords(newSet)
  }

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true)
    try {
      const ids = Array.from(selectedRecords)
      await bulkDeleteStudentRecords(token, ids)
      showToast(`Successfully deleted ${ids.length} records`)
      setSelectedRecords(new Set())
      setShowBulkDeleteModal(false)
      fetchRecords()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStudentRecords(token)
      setRecords(res.records || [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [token, showToast])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadFileMeta({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    })
    setUploading(true)
    setUploadProgress(0)

    const progressInterval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 90) return 90
        return p + 10
      })
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('default_priority', uploadPriority)
      const res = await uploadStudentRecords(token, formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        showToast(res.message || 'Excel file imported successfully!')
        fetchRecords()
        setUploading(false)
        setUploadProgress(0)
        setUploadFileMeta(null)
      }, 600)
    } catch (err) {
      clearInterval(progressInterval)
      showToast(err.message, 'error')
      setUploading(false)
      setUploadProgress(0)
      setUploadFileMeta(null)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleManualAdd = async (e) => {
    e.preventDefault()
    if (!form.course) {
      showToast('Please select a course.', 'error')
      return
    }
    try {
      await addStudentRecord(token, form)
      showToast('Student added successfully to Master List!')
      setForm({ student_id: '', first_name: '', last_name: '', course: '', priority_class: 'regular' })
      fetchRecords()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const promptDelete = (record) => {
    setRecordToDelete(record)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const studentId = recordToDelete.student_id
    setIsDeleting(studentId)
    try {
      await deleteStudentRecord(token, studentId)
      showToast('Record deleted successfully!')
      setRecordToDelete(null)
      fetchRecords()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsDeleting(null)
    }
  }

  const startEdit = (record) => {
    setEditingRecord(record.student_id)
    setEditForm({ first_name: record.first_name, last_name: record.last_name, course: record.course, priority_class: record.priority_class || 'regular' })
    setOpenDropdown(null)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.course) {
      showToast('Please select a course.', 'error')
      return
    }
    setIsSaving(true)
    try {
      await editStudentRecord(token, editingRecord, editForm)
      showToast('Record updated successfully!')
      setEditingRecord(null)
      setOpenDropdown(null)
      fetchRecords()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const renderPriorityPill = (priorityClass) => {
    switch (priorityClass) {
      case 'alumni':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-fluid-11 font-bold bg-maroon-light text-maroon border border-maroon/20 tracking-wide uppercase">Alumni</span>
      case 'pwd':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-fluid-11 font-bold bg-[#fffbeb] text-gold border border-gold-border tracking-wide uppercase">PWD</span>
      case 'pregnant':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-fluid-11 font-bold bg-pink-50 text-pink-600 border border-pink-200 tracking-wide uppercase">Pregnant</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-fluid-11 font-bold bg-surface text-text-sub border border-border tracking-wide uppercase">Regular</span>
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="animate-fade-up font-sans w-full pb-10">
      
      <div className="mb-6">
        <p className="text-fluid-11 font-bold text-gold tracking-widest uppercase m-0 mb-1.5">Directory Management</p>
        <h1 className="font-serif text-fluid-22 sm:text-fluid-26 font-bold text-text-main m-0 mb-2 flex items-center gap-2.5 sm:gap-3">
          <ClipboardList size={26} className="text-maroon shrink-0" /> Student Master List
        </h1>
        <p className="text-fluid-12 sm:text-fluid-13 text-text-sub mt-1.5 sm:mt-2 mb-0 leading-relaxed max-w-2xl">
          Manage the official school directory. Bulk import student records via Excel or add them manually.
        </p>
      </div>

      {/* Edit Modal */}
      {editingRecord && createPortal((
        <div 
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" 
          onClick={() => { setEditingRecord(null); setOpenDropdown(null); }}
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />
          
          <div 
            className="animate-fade-up relative my-auto w-full max-w-xl bg-white text-text-main rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.18)] border border-border z-10 font-sans overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-maroon via-maroon-dark to-gold" />

            {/* Header */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-border gap-4 pt-1">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon-light text-maroon text-fluid-11 font-extrabold uppercase tracking-wider border border-maroon-border">
                    <UserCheck size={13} /> Master List Directory
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-off-white text-text-sub text-fluid-11 font-mono font-bold border border-border">
                    ID: <strong className="text-maroon">{editingRecord}</strong>
                  </span>
                </div>
                <h2 className="font-serif text-fluid-22 sm:text-fluid-26 font-extrabold text-maroon m-0 leading-tight tracking-tight">
                  Edit Student Record
                </h2>
                <p className="text-fluid-12 text-text-muted mt-1 mb-0 font-medium">
                  Update student identification details, curriculum, or priority classification.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setEditingRecord(null); setOpenDropdown(null); }}
                className="w-10 h-10 rounded-full bg-surface text-text-muted hover:bg-border/80 hover:text-text-main transition-all flex items-center justify-center border border-border cursor-pointer shrink-0 shadow-xs hover:scale-105 active:scale-95"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User size={13} className="text-maroon" /> First Name <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={editForm.first_name} 
                    onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} 
                    placeholder="First name"
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-off-white/60 text-fluid-13 font-semibold text-text-main placeholder:text-text-muted/50 outline-none focus:border-maroon focus:bg-white focus:ring-4 focus:ring-maroon/5 transition-all shadow-xs" 
                  />
                </div>
                <div>
                  <label className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User size={13} className="text-maroon" /> Last Name <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={editForm.last_name} 
                    onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} 
                    placeholder="Last name"
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-off-white/60 text-fluid-13 font-semibold text-text-main placeholder:text-text-muted/50 outline-none focus:border-maroon focus:bg-white focus:ring-4 focus:ring-maroon/5 transition-all shadow-xs" 
                  />
                </div>
              </div>

              {/* Course Selector */}
              <div className="relative">
                <label className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-maroon" /> Enrolled Degree Program <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'editCourse' ? null : 'editCourse')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-off-white/60 text-fluid-13 font-semibold cursor-pointer hover:border-maroon/40 hover:bg-white focus:border-maroon focus:ring-4 focus:ring-maroon/5 transition-all shadow-xs text-left ${editForm.course ? 'text-text-main' : 'text-text-muted'}`}
                >
                  <span className="truncate pr-2 font-medium">{editForm.course || 'Select Enrolled Course...'}</span>
                  <ChevronDown size={16} className={`text-text-muted shrink-0 transition-transform duration-200 ${openDropdown === 'editCourse' ? 'rotate-180 text-maroon' : ''}`} />
                </button>
                
                {openDropdown === 'editCourse' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-border shadow-[0_15px_45px_rgba(0,0,0,0.14)] p-2 z-50 animate-fade-up max-h-56 overflow-y-auto custom-scrollbar" style={{ animationDuration: '0.2s' }}>
                      {COURSES.map(c => {
                        const isActive = editForm.course === c
                        return (
                          <div
                            key={c}
                            onClick={() => { setEditForm({ ...editForm, course: c }); setOpenDropdown(null); }}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between ${isActive ? 'bg-maroon-light text-maroon font-bold' : 'hover:bg-off-white text-text-main font-medium'}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon bg-white' : 'border-text-muted/40'}`}>
                                {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                              </div>
                              <span className="text-fluid-12 truncate">{c}</span>
                            </div>
                            {isActive && <Check size={15} className="text-maroon shrink-0" />}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Priority Class Selector */}
              <div>
                <label className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-maroon" /> Priority Classification
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PRIORITY_OPTIONS.map(opt => {
                    const isSelected = editForm.priority_class === opt.value
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setEditForm({ ...editForm, priority_class: opt.value })}
                        className={`py-3.5 px-4 rounded-2xl border cursor-pointer select-none transition-all duration-200 text-center flex items-center justify-center ${
                          isSelected 
                            ? 'bg-maroon/5 border-maroon text-maroon shadow-xs ring-2 ring-maroon/10 scale-[1.01]' 
                            : 'bg-white border-border text-text-sub hover:border-maroon/30 hover:bg-off-white/60'
                        }`}
                      >
                        <span className={`text-fluid-13 font-bold capitalize ${isSelected ? 'text-maroon' : 'text-text-main'}`}>
                          {opt.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-3">
                <button 
                  type="button" 
                  onClick={() => { setEditingRecord(null); setOpenDropdown(null); }} 
                  disabled={isSaving}
                  className="px-4 py-2 sm:py-2.25 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50 min-w-20"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-4.5 py-2 sm:py-2.25 rounded-xl bg-maroon text-white hover:bg-maroon-dark text-xs font-bold transition-all cursor-pointer shadow-[0_4px_14px_rgba(123,26,42,0.18)] hover:shadow-[0_6px_18px_rgba(123,26,42,0.25)] active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={14} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Single Delete Modal */}
      {recordToDelete && createPortal((
        <div 
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" 
          onClick={() => setRecordToDelete(null)}
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />
          <div 
            className="animate-fade-up relative my-auto w-full max-w-md bg-white text-text-main rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.2)] border border-border z-10 text-center font-sans overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-danger" />
            <div className="w-14 h-14 rounded-2xl bg-danger-light border border-danger-border flex items-center justify-center mx-auto mb-4 text-danger shadow-xs">
              <Trash2 size={26} />
            </div>
            <h3 className="text-fluid-20 font-bold text-text-main m-0 mb-2 font-serif">Delete Student Record?</h3>
            <p className="text-fluid-13 text-text-sub m-0 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-text-main font-bold">{recordToDelete.first_name} {recordToDelete.last_name}</strong> (<span className="text-maroon font-mono font-bold">{recordToDelete.student_id}</span>)? This will permanently remove the student from the master list.
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setRecordToDelete(null)} 
                disabled={!!isDeleting} 
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-fluid-13 font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDelete} 
                disabled={!!isDeleting} 
                className="flex-1 px-4 py-3 rounded-xl border-none bg-danger text-white hover:bg-danger-hover text-fluid-13 font-bold cursor-pointer transition-all shadow-[0_6px_20px_rgba(220,38,38,0.2)] hover:shadow-[0_8px_25px_rgba(220,38,38,0.28)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && createPortal((
        <div 
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" 
          onClick={() => setShowBulkDeleteModal(false)}
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in" />
          <div 
            className="animate-fade-up relative my-auto w-full max-w-md bg-white text-text-main rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.2)] border border-border z-10 text-center font-sans overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-danger" />
            <div className="w-14 h-14 rounded-2xl bg-danger-light border border-danger-border flex items-center justify-center mx-auto mb-4 text-danger shadow-xs">
              <Trash2 size={26} />
            </div>
            <h3 className="text-fluid-20 font-bold text-text-main m-0 mb-2 font-serif">Delete Selected Records?</h3>
            <p className="text-fluid-13 text-text-sub m-0 mb-6 leading-relaxed">
              You are about to permanently delete <strong className="text-maroon font-bold">{selectedRecords.size}</strong> selected student record(s) from the master list. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setShowBulkDeleteModal(false)} 
                disabled={isBulkDeleting} 
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-text-sub hover:text-text-main hover:bg-border/60 text-fluid-13 font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleBulkDelete} 
                disabled={isBulkDeleting} 
                className="flex-1 px-4 py-3 rounded-xl border-none bg-danger text-white hover:bg-danger-hover text-fluid-13 font-bold cursor-pointer transition-all shadow-[0_6px_20px_rgba(220,38,38,0.2)] hover:shadow-[0_8px_25px_rgba(220,38,38,0.28)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isBulkDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-up relative z-20">

        {/* Upload Excel */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border">
          <h3 className="text-base font-semibold text-text-main m-0 mb-1.5 font-serif">Bulk Import via Excel</h3>
          <p className="text-fluid-13 text-text-sub mb-4">Upload an Excel file to quickly import multiple master list records.</p>

          <div className="mb-4">
            <label className="text-fluid-11 font-extrabold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-maroon" /> Priority for this import
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'regular', label: 'Regular Student' },
                { value: 'alumni', label: 'Alumni' }
              ].map(opt => {
                const isSelected = uploadPriority === opt.value
                return (
                  <div
                    key={opt.value}
                    onClick={() => !uploading && setUploadPriority(opt.value)}
                    className={`py-3.5 px-4 rounded-2xl border cursor-pointer select-none transition-all duration-200 text-center flex items-center justify-center ${
                      isSelected 
                        ? 'bg-maroon/5 border-maroon text-maroon shadow-xs ring-2 ring-maroon/10 scale-[1.01]' 
                        : 'bg-white border-border text-text-sub hover:border-maroon/30 hover:bg-off-white/60'
                    } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`text-fluid-13 font-bold capitalize ${isSelected ? 'text-maroon' : 'text-text-main'}`}>
                      {opt.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div 
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all duration-300 relative overflow-hidden group ${
              uploading 
                ? 'border-maroon/40 bg-maroon/5 shadow-inner' 
                : 'border-maroon/20 bg-linear-to-b from-maroon-light/40 to-off-white/80 hover:border-maroon/60 hover:bg-maroon-light/60 hover:shadow-xs cursor-pointer'
            }`} 
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={uploading} />
            
            {!uploading ? (
              <div className="py-2">
                <div className="w-14 h-14 rounded-2xl bg-white border border-maroon-border/80 shadow-xs flex items-center justify-center mx-auto mb-3 text-maroon group-hover:scale-105 group-hover:border-maroon transition-all duration-200">
                  <FileSpreadsheet size={26} className="text-maroon group-hover:scale-110 transition-transform duration-200" />
                </div>
                <h4 className="text-fluid-14 font-bold text-text-main m-0 mb-1 group-hover:text-maroon transition-colors">
                  Click to select Excel spreadsheet
                </h4>
                <p className="text-fluid-12 text-text-muted m-0 font-medium">
                  Supports <span className="font-semibold text-text-sub font-mono">.xlsx</span> files with master list records
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-border text-[11px] font-bold text-text-sub uppercase tracking-wider shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready for upload
                </div>
              </div>
            ) : (
              <div className="py-1 animate-fade-in text-left">
                {/* File Header Info */}
                <div className="flex items-center justify-between gap-3 mb-3 bg-white p-3.5 rounded-xl border border-maroon/15 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-maroon-light text-maroon flex items-center justify-center shrink-0 border border-maroon-border">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-fluid-13 font-bold text-text-main truncate">
                        {uploadFileMeta?.name || 'student_records.xlsx'}
                      </div>
                      <div className="text-fluid-11 text-text-muted font-medium flex items-center gap-2 mt-0.5">
                        <span>{uploadFileMeta?.size || 'Excel File'}</span>
                        <span>•</span>
                        <span className="text-maroon font-bold capitalize">
                          {uploadPriority === 'alumni' ? 'Alumni Priority' : 'Regular Priority'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-fluid-18 font-mono font-extrabold text-maroon">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-2">
                  <div className="w-full h-3.5 bg-maroon/10 rounded-full overflow-hidden p-0.5 border border-maroon/15 relative shadow-inner">
                    <div 
                      className="h-full bg-linear-to-r from-maroon via-maroon-dark to-gold rounded-full animate-progress-stripes transition-all duration-300 ease-out shadow-[0_0_12px_rgba(123,26,42,0.35)]" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-between text-fluid-11 font-medium text-text-muted px-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-maroon animate-ping shrink-0" />
                      <span className="text-text-sub font-semibold">
                        {uploadProgress < 30 ? 'Reading spreadsheet records...' :
                         uploadProgress < 70 ? 'Validating student IDs and programs...' :
                         uploadProgress < 100 ? 'Writing to Master List database...' :
                         'Finalizing import...'}
                      </span>
                    </span>
                    <span className="font-mono text-text-muted font-semibold">
                      {uploadProgress === 100 ? 'Done' : 'Importing'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Add */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border">
          <h3 className="text-base font-semibold text-text-main m-0 mb-4 font-serif">Manually Add Student</h3>
          <form onSubmit={handleManualAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <input type="text" placeholder="Student ID (e.g. 2020-20049 or 202020049)" pattern="[-0-9]{8,15}" title="Format: 8 to 15 numbers or hyphens" required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-fluid-13 outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div>
              <input type="text" placeholder="First Name" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-fluid-13 outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div>
              <input type="text" placeholder="Last Name" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-fluid-13 outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div className="sm:col-span-2 relative z-10">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'addCourse' ? null : 'addCourse')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-white text-fluid-13 font-semibold cursor-pointer hover:border-maroon/30 transition-colors ${form.course ? 'text-text-main' : 'text-text-muted'}`}
              >
                <span className="truncate pr-2">{form.course || 'Select Course...'}</span>
                <ChevronDown size={16} className={`text-text-sub shrink-0 transition-transform duration-200 ${openDropdown === 'addCourse' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'addCourse' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-border shadow-lg p-2 z-50 animate-fade-up max-h-62.5 overflow-y-auto" style={{ animationDuration: '0.2s' }}>
                    {COURSES.map(c => {
                      const isActive = form.course === c
                      return (
                        <div
                          key={c}
                          onClick={() => { setForm({ ...form, course: c }); setOpenDropdown(null); }}
                          className={`p-2.5 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-maroon/5 border border-maroon/20' : 'hover:bg-off-white border border-transparent'}`}
                        >
                          <div className="flex items-center gap-3">
                             <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                               {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                             </div>
                             <span className={`text-fluid-12 font-semibold truncate ${isActive ? 'text-maroon' : 'text-text-main'}`}>{c}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-fluid-11 font-semibold text-text-sub mb-2 block tracking-wide uppercase">Student Priority</label>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-1">
                {[
                  { value: 'regular', label: 'Regular Student' },
                  { value: 'alumni', label: 'Alumni' }
                ].map(opt => (
                  <label key={opt.value} className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-fluid-13 font-semibold cursor-pointer select-none transition-all duration-300 ease-out border ${form.priority_class === opt.value ? 'text-maroon bg-maroon/5 border-maroon/20 shadow-[0_2px_8px_rgba(123,26,42,0.04)] scale-[1.02]' : 'text-text-sub bg-transparent border-transparent hover:bg-off-white hover:text-text-main'}`}>
                    <input type="radio" name="manualPriority" value={opt.value} checked={form.priority_class === opt.value} onChange={e => setForm({ ...form, priority_class: e.target.value })} className="accent-maroon w-4 h-4 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                    <span className="transition-colors duration-300">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 mt-3">
              <button type="submit" className="relative w-full overflow-hidden bg-maroon text-white border-none p-3.5 rounded-xl font-bold text-fluid-14 cursor-pointer font-sans transition-all duration-300 active:scale-[0.98] hover:bg-maroon-dark shadow-[0_6px_20px_rgba(123,26,42,0.2)] hover:shadow-[0_8px_25px_rgba(123,26,42,0.25)] group">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                <span className="relative z-10">Add to Master List</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Records Table & Cards Container */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border animate-fade-up relative z-10" style={{ animationDelay: '0.2s' }}>
        {/* Directory Toolbar */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 rounded-t-2xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-text-main m-0 font-serif flex items-center gap-2">
              School Directory
              <span className="text-xs text-text-sub bg-off-white border border-border/80 px-2.5 py-0.5 rounded-full font-semibold">
                {displayedRecords.length}
              </span>
            </h3>

            {/* Mobile-only selected badge */}
            {selectedRecords.size > 0 && (
              <span className="inline-flex md:hidden text-fluid-11 font-bold text-maroon bg-maroon-light px-2.5 py-0.5 rounded-full border border-maroon/20">
                {selectedRecords.size} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            {selectedRecords.size > 0 && (
              <button 
                type="button"
                onClick={() => setShowBulkDeleteModal(true)} 
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-danger/30 bg-danger-light text-danger text-fluid-12 font-bold cursor-pointer hover:bg-danger hover:text-white transition-all shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Trash2 size={14} /> Delete Selected ({selectedRecords.size})
              </button>
            )}

            {/* Search Input with Fluid Sizing & Clear Button */}
            <div className="relative flex-1 min-w-42.5:min-w-55 sm:flex-initial">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name or ID..."
                className="w-full py-2 pr-8 pl-8.5 rounded-xl border border-border bg-off-white text-fluid-12 text-text-main outline-none font-sans focus:border-maroon focus:bg-white transition-all"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <Search size={14} />
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer p-0.5 rounded hover:bg-surface transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Course Filter Dropdown */}
            <div className="relative z-20 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'courseFilter' ? null : 'courseFilter')}
                className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border bg-off-white hover:bg-surface text-fluid-12 text-text-main font-semibold cursor-pointer hover:border-maroon/30 transition-all active:scale-[0.98]"
              >
                <span className="truncate max-w-32.5 sm:max-w-45">
                  {courseFilter === 'All' ? 'All Courses' : courseFilter.replace('Bachelor of Science in ', 'BS ').replace('Bachelor of ', 'B ')}
                </span>
                <ChevronDown size={14} className={`text-text-muted shrink-0 transition-transform duration-200 ${openDropdown === 'courseFilter' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'courseFilter' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute right-0 sm:left-0 top-full mt-2 bg-white rounded-xl border border-border shadow-xl p-2 z-50 min-w-65 max-w-[calc(100vw-2rem)] animate-fade-up max-h-75 overflow-y-auto custom-scrollbar" style={{ animationDuration: '0.15s' }}>
                    {COURSE_FILTER_OPTIONS.map(c => {
                      const isActive = courseFilter === c.v
                      return (
                        <div
                          key={c.v}
                          onClick={() => { setCourseFilter(c.v); setOpenDropdown(null); }}
                          className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-maroon/5 text-maroon font-bold' : 'text-text-main hover:bg-off-white font-medium'}`}
                        >
                          <div className="flex items-center gap-2.5">
                             <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isActive ? 'border-maroon' : 'border-text-muted/40'}`}>
                               {isActive && <div className="w-1.5 h-1.5 bg-maroon rounded-full" />}
                             </div>
                             <span className="text-fluid-12">{c.l}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content: Loading, Empty, or Data Views */}
        {loading ? (
          <div>
            {/* Mobile Loading Skeletons (< lg) */}
            <div className="lg:hidden p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-white animate-pulse space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-surface rounded" />
                    <div className="h-4 w-16 bg-surface rounded" />
                  </div>
                  <div className="h-4 w-40 bg-surface rounded" />
                  <div className="h-3 w-56 bg-surface rounded" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="h-8 bg-surface rounded-lg" />
                    <div className="h-8 bg-surface rounded-lg" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Loading Table (>= lg) */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-220 border-collapse text-left">
                <thead>
                  <tr className="bg-off-white text-text-sub font-semibold border-b border-border">
                    <th className="px-4 py-3.5 w-12 text-center" />
                    <th className="px-6 py-3.5">Student ID</th>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Course</th>
                    <th className="px-6 py-3.5">Priority</th>
                    <th className="px-6 py-3.5">Date Added</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="flex gap-5 items-center">
                          <div className="animate-pulse h-5 w-[20%] rounded bg-border" />
                          <div className="animate-pulse h-5 w-[30%] rounded bg-border" />
                          <div className="animate-pulse h-5 w-[15%] rounded bg-border" />
                          <div className="animate-pulse h-5 w-[10%] rounded bg-border" />
                          <div className="animate-pulse h-5 w-[15%] rounded bg-border" />
                          <div className="animate-pulse h-5 w-[10%] rounded bg-border ml-auto" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentRecords.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-text-muted flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mb-3">
              <Search size={22} />
            </div>
            <p className="font-semibold text-text-main text-fluid-14 m-0 mb-1">No matching master list records found</p>
            <p className="text-fluid-12 text-text-sub m-0 max-w-sm">
              {searchQuery || courseFilter !== 'All' 
                ? 'Try adjusting your search keywords or filter to find what you are looking for.' 
                : 'No student records have been uploaded or added yet.'}
            </p>
            {(searchQuery || courseFilter !== 'All') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setCourseFilter('All'); }}
                className="mt-3 px-3.5 py-1.5 rounded-lg border border-border bg-white text-maroon text-fluid-12 font-bold hover:bg-surface transition-colors cursor-pointer"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View (< lg) */}
            <div className="lg:hidden">
              {/* Select All on Page Bar */}
              <div className="px-4 py-2.5 bg-off-white/80 border-b border-border flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="cursor-pointer rounded border-border w-4 h-4 text-maroon focus:ring-maroon accent-maroon" 
                    checked={allCurrentSelected} 
                    onChange={toggleSelectAll} 
                    disabled={currentRecords.length === 0} 
                  />
                  <span className="text-fluid-12 font-semibold text-text-main">
                    Select all on page ({currentRecords.length})
                  </span>
                </label>
                {selectedRecords.size > 0 && (
                  <span className="text-fluid-11 font-bold text-maroon">
                    {selectedRecords.size} selected
                  </span>
                )}
              </div>

              {/* Cards Grid */}
              <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentRecords.map((record, index) => {
                  const isSelected = selectedRecords.has(record.student_id)
                  return (
                    <div
                      key={record.student_id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 animate-fade-up ${
                        isSelected 
                          ? 'bg-maroon-light/35 border-maroon/30 shadow-xs' 
                          : 'bg-white border-border hover:border-maroon/25 hover:shadow-2xs'
                      }`}
                      style={{ animationDelay: `${index * 0.04}s`, animationFillMode: 'forwards' }}
                    >
                      {/* Top Row: Checkbox + Student ID & Priority Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            className="cursor-pointer rounded border-border w-4 h-4 text-maroon focus:ring-maroon accent-maroon shrink-0"
                            checked={isSelected}
                            onChange={() => toggleSelect(record.student_id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-mono font-bold text-fluid-13 text-maroon truncate">
                            {record.student_id}
                          </span>
                        </label>
                        <div className="shrink-0">
                          {renderPriorityPill(record.priority_class)}
                        </div>
                      </div>

                      {/* Student Info */}
                      <div className="space-y-1.5">
                        <h4 className="m-0 text-fluid-14 font-bold text-text-main leading-tight">
                          {record.first_name} {record.last_name}
                        </h4>
                        <div className="flex items-start gap-1.5 text-fluid-12 text-text-sub leading-snug">
                          <GraduationCap size={14} className="text-text-muted shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{record.course}</span>
                        </div>
                      </div>

                      {/* Date Added */}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-fluid-11 text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-text-muted/80" />
                          <span>Added:</span>
                        </span>
                        <span className="font-medium text-text-sub">{formatDate(record.created_at)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => startEdit(record)}
                          className="py-2 px-3 rounded-lg bg-blue-light/70 hover:bg-blue-light text-blue text-fluid-12 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-blue/20 active:scale-[0.98]"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDelete(record)}
                          disabled={isDeleting === record.student_id}
                          className="py-2 px-3 rounded-lg bg-danger-light/70 hover:bg-danger-light text-danger text-fluid-12 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-danger/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                          <Trash2 size={13} /> {isDeleting === record.student_id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Desktop Table View (>= lg) */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-220 border-collapse text-fluid-13 text-left">
                <thead>
                  <tr className="bg-off-white text-text-sub font-semibold border-b border-border">
                    <th className="px-4 py-3.5 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="cursor-pointer rounded border-border w-3.5 h-3.5 text-maroon focus:ring-maroon accent-maroon" 
                        checked={allCurrentSelected} 
                        onChange={toggleSelectAll} 
                        disabled={currentRecords.length === 0} 
                      />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-text-sub">Student ID</th>
                    <th className="px-6 py-3.5 font-semibold text-text-sub">Name</th>
                    <th className="px-6 py-3.5 font-semibold text-text-sub">Course</th>
                    <th className="px-6 py-3.5 font-semibold text-text-sub">Priority</th>
                    <th className="px-6 py-3.5 font-semibold text-text-sub">Date Added</th>
                    <th className="px-6 py-3.5 font-semibold text-text-sub text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {currentRecords.map((record, index) => {
                    const isSelected = selectedRecords.has(record.student_id)
                    return (
                      <tr 
                        key={record.student_id} 
                        className={`group border-b border-border transition-colors hover:bg-maroon-light/40 animate-fade-up ${
                          isSelected ? 'bg-maroon-light/30' : ''
                        }`} 
                        style={{ animationDelay: `${index * 0.03}s`, opacity: 0, animationFillMode: 'forwards' }}
                      >
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="cursor-pointer rounded border-border w-3.5 h-3.5 text-maroon focus:ring-maroon accent-maroon" 
                            checked={isSelected} 
                            onChange={() => toggleSelect(record.student_id)} 
                          />
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-maroon whitespace-nowrap">
                          {record.student_id}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-text-main whitespace-nowrap">
                          {record.first_name} {record.last_name}
                        </td>
                        <td className="px-6 py-3.5 text-text-sub max-w-xs xl:max-w-md">
                          <span className="line-clamp-1" title={record.course}>{record.course}</span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {renderPriorityPill(record.priority_class)}
                        </td>
                        <td className="px-6 py-3.5 text-text-muted text-xs whitespace-nowrap">
                          {formatDate(record.created_at)}
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <div className="flex gap-2 justify-end items-center">
                            <button 
                              type="button" 
                              className="bg-transparent border-none cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue hover:bg-blue-light transition-colors flex items-center gap-1.5" 
                              onClick={() => startEdit(record)}
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button 
                              type="button" 
                              className="bg-transparent border-none cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-bold text-danger hover:bg-danger-light transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed" 
                              onClick={() => promptDelete(record)} 
                              disabled={isDeleting === record.student_id}
                            >
                              <Trash2 size={14} /> {isDeleting === record.student_id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* Responsive Fluid Pagination Controls */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-off-white/80 rounded-b-2xl">
          <div className="text-fluid-12 sm:text-fluid-13 text-text-sub font-medium text-center sm:text-left">
            Showing <span className="font-bold text-text-main">{displayedRecords.length === 0 ? 0 : startIndex + 1}-{endIndex}</span> of <span className="font-bold text-text-main">{displayedRecords.length}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-white text-text-main text-fluid-12 font-semibold cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
            >
              Prev
            </button>
            <span className="text-fluid-12 font-bold text-text-sub px-1">
              Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
            </span>
            <button 
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-white text-text-main text-fluid-12 font-semibold cursor-pointer hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
