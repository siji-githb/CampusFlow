import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getStudentRecords, uploadStudentRecords, addStudentRecord, deleteStudentRecord, editStudentRecord, bulkDeleteStudentRecords } from '../../services/adminService'
import { FileSpreadsheet, Edit, Trash2, ClipboardList, Search, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/useAuth'

export default function StudentRecordsPage() {
  const { token } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef()

  const [form, setForm] = useState({ student_id: '', first_name: '', last_name: '', course: '', priority_class: 'regular' })
  const [uploadPriority, setUploadPriority] = useState('regular')

  // Edit State
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', course: '', priority_class: 'regular' })
  const [isDeleting, setIsDeleting] = useState(null)
  const [recordToDelete, setRecordToDelete] = useState(null)
  const [courseFilter, setCourseFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRecords, setSelectedRecords] = useState(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)

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
    setError(''); setSuccess('')
    try {
      const ids = Array.from(selectedRecords)
      await bulkDeleteStudentRecords(token, ids)
      setSuccess(`Successfully deleted ${ids.length} records`)
      setSelectedRecords(new Set())
      setShowBulkDeleteModal(false)
      fetchRecords()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await getStudentRecords(token)
      setRecords(res.records || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [token])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError(''); setSuccess('')
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
        setSuccess(res.message)
        fetchRecords()
        setUploading(false)
        setUploadProgress(0)
      }, 500)
    } catch (err) {
      clearInterval(progressInterval)
      setError(err.message)
      setUploading(false)
      setUploadProgress(0)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleManualAdd = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await addStudentRecord(token, form)
      setSuccess('Student added successfully')
      setForm({ student_id: '', first_name: '', last_name: '', course: '', priority_class: 'regular' })
      fetchRecords()
    } catch (err) {
      setError(err.message)
    }
  }

  const promptDelete = (record) => {
    setRecordToDelete(record)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const studentId = recordToDelete.student_id
    setIsDeleting(studentId)
    setError(''); setSuccess('')
    try {
      await deleteStudentRecord(token, studentId)
      setSuccess('Record deleted successfully')
      setRecordToDelete(null)
      fetchRecords()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDeleting(null)
    }
  }

  const startEdit = (record) => {
    setEditingRecord(record.student_id)
    setEditForm({ first_name: record.first_name, last_name: record.last_name, course: record.course, priority_class: record.priority_class || 'regular' })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await editStudentRecord(token, editingRecord, editForm)
      setSuccess('Record updated successfully')
      setEditingRecord(null)
      fetchRecords()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="animate-fade-up font-sans">
      
      <div className="mb-6">
        <p className="text-[11px] font-bold text-gold tracking-widest uppercase m-0 mb-1.5">User Management</p>
        <h1 className="font-serif text-[26px] font-bold text-text-main m-0 flex items-center gap-2">
          <ClipboardList size={24} className="text-maroon" /> Master List
        </h1>
        <p className="text-[12px] text-text-sub mt-2 mb-0">
          Manage the official school directory. Bulk import students via Excel or add them manually.
        </p>
      </div>

      {/* Edit Modal */}
      {editingRecord && createPortal((
        <div className="fixed inset-0 bg-black/40 z-100 flex items-center justify-center animate-fade-up">
          <div className="bg-white p-6 rounded-2xl w-full max-w-100 shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-fade-up">
            <h3 className="text-[18px] font-bold text-maroon m-0 mb-4 font-serif">Edit Record: {editingRecord}</h3>
            <form onSubmit={handleEditSubmit} className="grid gap-3">
              <div>
                <label className="text-[11px] font-semibold text-text-sub mb-1 block">First Name</label>
                <input type="text" required value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text-sub mb-1 block">Last Name</label>
                <input type="text" required value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text-sub mb-1 block">Course</label>
                <div className="relative">
                  <select required value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors appearance-none focus:border-maroon pr-10">
                    <option value="" disabled>Select Course...</option>
                    <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                    <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                    <option value="Bachelor of Elementary Education">Bachelor of Elementary Education</option>
                    <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
                    <option value="Bachelor of Science in Criminology">Bachelor of Science in Criminology</option>
                    <option value="Bachelor of Science in Hospitality Management">Bachelor of Science in Hospitality Management</option>
                    <option value="Bachelor of Science in Tourism Management">Bachelor of Science in Tourism Management</option>
                    <option value="Bachelor of Science in Accountancy">Bachelor of Science in Accountancy</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text-sub mb-2 block tracking-wide uppercase">Priority Class</label>
                <div className="flex items-center gap-4 py-1">
                  <label className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer select-none transition-all duration-300 ease-out border ${editForm.priority_class === 'regular' ? 'text-maroon bg-maroon/5 border-maroon/20 shadow-[0_2px_8px_rgba(123,26,42,0.04)] scale-[1.02]' : 'text-text-sub bg-transparent border-transparent hover:bg-off-white hover:text-text-main'}`}>
                    <input type="radio" name="editPriority" value="regular" checked={editForm.priority_class === 'regular'} onChange={e => setEditForm({ ...editForm, priority_class: e.target.value })} className="accent-maroon w-4 h-4 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                    <span className="transition-colors duration-300">Regular</span>
                  </label>
                  <label className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer select-none transition-all duration-300 ease-out border ${editForm.priority_class === 'alumni' ? 'text-maroon bg-maroon/5 border-maroon/20 shadow-[0_2px_8px_rgba(123,26,42,0.04)] scale-[1.02]' : 'text-text-sub bg-transparent border-transparent hover:bg-off-white hover:text-text-main'}`}>
                    <input type="radio" name="editPriority" value="alumni" checked={editForm.priority_class === 'alumni'} onChange={e => setEditForm({ ...editForm, priority_class: e.target.value })} className="accent-maroon w-4 h-4 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                    <span className="transition-colors duration-300">Alumni</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 p-2.5 rounded-lg border border-border bg-off-white text-text-sub font-semibold cursor-pointer hover:bg-border transition-colors">Cancel</button>
                <button type="submit" className="flex-1 p-2.5 rounded-lg border-none bg-maroon text-white font-semibold cursor-pointer hover:bg-maroon-dark transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Single Delete Modal */}
      {recordToDelete && createPortal((
        <div className="fixed inset-0 bg-black/40 z-100 flex items-center justify-center animate-fade-up">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-fade-up text-center">
            <div className="w-12 h-12 rounded-full bg-danger-light border-2 border-danger-border flex items-center justify-center mx-auto mb-4 text-danger">
              <Trash2 size={24} />
            </div>
            <h3 className="text-[18px] font-bold text-text-main m-0 mb-2 font-serif">Delete Master List Entry?</h3>
            <p className="text-[13px] text-text-sub m-0 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-text-main">{recordToDelete.first_name} {recordToDelete.last_name}</span> (<span className="text-maroon font-medium">{recordToDelete.student_id}</span>)? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRecordToDelete(null)} disabled={!!isDeleting} className="flex-1 p-2.5 rounded-lg border border-border bg-off-white text-text-sub font-semibold cursor-pointer hover:bg-border transition-colors disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={!!isDeleting} className="flex-1 p-2.5 rounded-lg border-none bg-danger text-white font-semibold cursor-pointer hover:bg-danger-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && createPortal((
        <div className="fixed inset-0 bg-black/40 z-100 flex items-center justify-center animate-fade-up">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-fade-up text-center">
            <div className="w-12 h-12 rounded-full bg-danger-light border-2 border-danger-border flex items-center justify-center mx-auto mb-4 text-danger">
              <Trash2 size={24} />
            </div>
            <h3 className="text-[18px] font-bold text-text-main m-0 mb-2 font-serif">Delete Selected Records?</h3>
            <p className="text-[13px] text-text-sub m-0 mb-6">
              You are about to delete {selectedRecords.size} student record(s). This action cannot be undone. Are you sure you want to proceed?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowBulkDeleteModal(false)} disabled={isBulkDeleting} className="flex-1 p-2.5 rounded-lg border border-border bg-off-white text-text-sub font-semibold cursor-pointer hover:bg-border transition-colors disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex-1 p-2.5 rounded-lg border-none bg-danger text-white font-semibold cursor-pointer hover:bg-danger-hover transition-colors disabled:opacity-50 flex items-center justify-center">
                {isBulkDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {error && <div className="px-4 py-3 bg-danger-light text-danger rounded-lg mb-4 text-sm animate-fade-up">{error}</div>}
      {success && <div className="px-4 py-3 bg-success-light text-success rounded-lg mb-4 text-sm animate-fade-up">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-up">

        {/* Upload Excel */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border">
          <h3 className="text-base font-semibold text-text-main m-0 mb-3 font-serif">Bulk Import via Excel</h3>
          <p className="text-[13px] text-text-sub mb-5">Upload an Excel file to quickly import multiple master list records.</p>

          <div className="mb-5">
            <label className="text-[11px] font-semibold text-text-sub mb-2 block tracking-wide uppercase">Priority for this import</label>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-1">
              <label className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer select-none transition-all duration-300 ease-out border ${uploadPriority === 'regular' ? 'text-maroon bg-maroon/5 border-maroon/20 shadow-[0_2px_8px_rgba(123,26,42,0.04)] scale-[1.02]' : 'text-text-sub bg-transparent border-transparent hover:bg-off-white hover:text-text-main'}`}>
                <input type="radio" name="uploadPriority" value="regular" checked={uploadPriority === 'regular'} onChange={e => setUploadPriority(e.target.value)} className="accent-maroon w-4 h-4 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                <span className="transition-colors duration-300">Regular Student</span>
              </label>
              <label className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer select-none transition-all duration-300 ease-out border ${uploadPriority === 'alumni' ? 'text-maroon bg-maroon/5 border-maroon/20 shadow-[0_2px_8px_rgba(123,26,42,0.04)] scale-[1.02]' : 'text-text-sub bg-transparent border-transparent hover:bg-off-white hover:text-text-main'}`}>
                <input type="radio" name="uploadPriority" value="alumni" checked={uploadPriority === 'alumni'} onChange={e => setUploadPriority(e.target.value)} className="accent-maroon w-4 h-4 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                <span className="transition-colors duration-300">Alumni</span>
              </label>
            </div>
          </div>

          <div className={`border-2 border-dashed ${uploading ? 'border-maroon bg-maroon/5' : 'border-maroon-border bg-maroon-light hover:bg-maroon-mid/30'} p-6 sm:p-8 rounded-xl text-center transition-colors relative overflow-hidden`} onClick={() => !uploading && fileInputRef.current?.click()} style={{ cursor: uploading ? 'default' : 'pointer' }}>
            <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={uploading} />
            <div className="mb-2 flex justify-center"><FileSpreadsheet size={24} className="text-maroon" /></div>
            <div className="text-sm font-semibold text-maroon mb-1">{uploading ? `Uploading... ${uploadProgress}%` : 'Click to select Excel file'}</div>
            {uploading && (
              <div className="w-full max-w-50 h-1.5 bg-maroon/20 rounded-full mx-auto mt-3 overflow-hidden">
                <div className="h-full bg-maroon transition-all duration-200 ease-out rounded-full" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Manual Add */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border">
          <h3 className="text-base font-semibold text-text-main m-0 mb-4 font-serif">Manually Add Student</h3>
          <form onSubmit={handleManualAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <input type="text" placeholder="Student ID (e.g. 2020-20049 or 202020049)" pattern="^[0-9-]{8,15}$" title="Format: 8 to 15 numbers or hyphens" required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div>
              <input type="text" placeholder="First Name" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div>
              <input type="text" placeholder="Last Name" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div className="sm:col-span-2 relative">
              <select required value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={`px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white w-full transition-colors appearance-none focus:border-maroon pr-10 ${form.course ? 'text-text-main' : 'text-text-muted'}`}>
                <option value="" disabled>Select Course...</option>
                <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                <option value="Bachelor of Elementary Education">Bachelor of Elementary Education</option>
                <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
                <option value="Bachelor of Science in Criminology">Bachelor of Science in Criminology</option>
                <option value="Bachelor of Science in Hospitality Management">Bachelor of Science in Hospitality Management</option>
                <option value="Bachelor of Science in Tourism Management">Bachelor of Science in Tourism Management</option>
                <option value="Bachelor of Science in Accountancy">Bachelor of Science in Accountancy</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub pointer-events-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-text-sub mb-2 block tracking-wide uppercase">Student Priority</label>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-1">
                <label className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer select-none transition-all duration-300 ease-out border ${form.priority_class === 'regular' ? 'text-maroon bg-maroon/5 border-maroon/20 shadow-[0_2px_8px_rgba(123,26,42,0.04)] scale-[1.02]' : 'text-text-sub bg-transparent border-transparent hover:bg-off-white hover:text-text-main'}`}>
                  <input type="radio" name="manualPriority" value="regular" checked={form.priority_class === 'regular'} onChange={e => setForm({ ...form, priority_class: e.target.value })} className="accent-maroon w-4 h-4 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                  <span className="transition-colors duration-300">Regular Student</span>
                </label>
                <label className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer select-none transition-all duration-300 ease-out border ${form.priority_class === 'alumni' ? 'text-maroon bg-maroon/5 border-maroon/20 shadow-[0_2px_8px_rgba(123,26,42,0.04)] scale-[1.02]' : 'text-text-sub bg-transparent border-transparent hover:bg-off-white hover:text-text-main'}`}>
                  <input type="radio" name="manualPriority" value="alumni" checked={form.priority_class === 'alumni'} onChange={e => setForm({ ...form, priority_class: e.target.value })} className="accent-maroon w-4 h-4 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                  <span className="transition-colors duration-300">Alumni</span>
                </label>
              </div>
            </div>
            <div className="sm:col-span-2 mt-3">
              <button type="submit" className="relative w-full overflow-hidden bg-maroon text-white border-none p-3.5 rounded-xl font-bold text-[14px] cursor-pointer font-sans transition-all duration-300 active:scale-[0.98] hover:bg-maroon-dark shadow-[0_6px_20px_rgba(123,26,42,0.2)] hover:shadow-[0_8px_25px_rgba(123,26,42,0.25)] group">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                <span className="relative z-10">Add to Master List</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border overflow-hidden animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <h3 className="text-base font-semibold text-text-main m-0 font-serif">School Directory</h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {selectedRecords.size > 0 && (
              <button onClick={() => setShowBulkDeleteModal(true)} className="px-3 py-1.5 rounded-lg border border-danger bg-danger-light text-danger text-[12px] font-bold cursor-pointer hover:bg-danger hover:text-white transition-colors flex items-center gap-1.5">
                <Trash2 size={14} /> Delete Selected ({selectedRecords.size})
              </button>
            )}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name or ID..."
                className="py-1.5 pr-3 pl-8 rounded-lg border border-border bg-off-white text-[12px] text-text-main outline-none w-50 font-sans focus:border-maroon transition-colors"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"><Search size={14} /></span>
            </div>
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-off-white text-[12px] text-text-main outline-none cursor-pointer font-sans focus:border-maroon transition-colors"
            >
              <option value="All">All Courses</option>
              <option value="Bachelor of Science in Information Technology">BS Information Technology</option>
              <option value="Bachelor of Science in Business Administration">BS Business Administration</option>
              <option value="Bachelor of Elementary Education">B Elementary Education</option>
              <option value="Bachelor of Secondary Education">B Secondary Education</option>
              <option value="Bachelor of Science in Criminology">BS Criminology</option>
              <option value="Bachelor of Science in Hospitality Management">BS Hospitality Management</option>
              <option value="Bachelor of Science in Tourism Management">BS Tourism Management</option>
              <option value="Bachelor of Science in Accountancy">BS Accountancy</option>
            </select>
            <span className="text-xs text-text-sub bg-off-white px-2.5 py-1 rounded-full font-semibold">
              {displayedRecords.length} Records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] text-left">
            <thead>
              <tr className="bg-off-white text-text-sub font-semibold border-b border-border">
                <th className="px-4 py-3 w-10 text-center">
                  <input type="checkbox" className="cursor-pointer rounded border-border w-3.5 h-3.5 text-maroon focus:ring-maroon accent-maroon" checked={allCurrentSelected} onChange={toggleSelectAll} disabled={currentRecords.length === 0} />
                </th>
                <th className="px-6 py-3">Student ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Date Added</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
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
                ))
              ) : currentRecords.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-text-muted">No matching master list records found.</td></tr>
              ) : (
                currentRecords.map((record, index) => (
                  <tr key={record.student_id} className={`group border-b border-border transition-colors hover:bg-maroon-light/50 animate-fade-up ${selectedRecords.has(record.student_id) ? 'bg-maroon-light/30' : ''}`} style={{ animationDelay: `${index * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="cursor-pointer rounded border-border w-3.5 h-3.5 text-maroon focus:ring-maroon accent-maroon" checked={selectedRecords.has(record.student_id)} onChange={() => toggleSelect(record.student_id)} />
                    </td>
                    <td className="px-6 py-3 font-medium text-maroon">{record.student_id}</td>
                    <td className="px-6 py-3 text-text-main">{record.first_name} {record.last_name}</td>
                    <td className="px-6 py-3 text-text-sub">{record.course}</td>
                    <td className="px-6 py-3">
                      {record.priority_class === 'alumni' ? (
                        <span className="bg-maroon-light text-maroon font-bold px-2 py-1 rounded text-[11px] uppercase tracking-wide">Alumni</span>
                      ) : record.priority_class === 'pwd' ? (
                        <span className="bg-[#fffbeb] text-gold font-bold px-2 py-1 rounded text-[11px] uppercase tracking-wide">PWD</span>
                      ) : record.priority_class === 'pregnant' ? (
                        <span className="bg-pink-50 text-pink-600 font-bold px-2 py-1 rounded text-[11px] uppercase tracking-wide">Pregnant</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded text-[11px] uppercase tracking-wide">Regular</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-text-muted text-xs">{new Date(record.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right flex gap-2 justify-end">
                      <button className="bg-transparent border-none cursor-pointer px-2 py-1 rounded text-xs font-semibold text-blue transition-colors hover:bg-blue-light flex items-center gap-1" onClick={() => startEdit(record)}>
                        <Edit size={14} /> Edit
                      </button>
                      <button className="bg-transparent border-none cursor-pointer px-2 py-1 rounded text-xs font-semibold text-danger transition-colors hover:bg-danger-light flex items-center gap-1" onClick={() => promptDelete(record)} disabled={isDeleting === record.student_id}>
                        <Trash2 size={14} /> {isDeleting === record.student_id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-off-white">
          <div className="text-[13px] text-text-sub font-medium">
            Showing <span className="font-bold text-text-main">{displayedRecords.length === 0 ? 0 : startIndex + 1}-{endIndex}</span> of <span className="font-bold text-text-main">{displayedRecords.length}</span> records
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-[12px] font-semibold cursor-pointer hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-text-main text-[12px] font-semibold cursor-pointer hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}