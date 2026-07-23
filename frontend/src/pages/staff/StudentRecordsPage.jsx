import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getStudentRecords, uploadStudentRecords, addStudentRecord, deleteStudentRecord, editStudentRecord } from '../../services/adminService'
import { FileSpreadsheet, Edit, Trash2, ClipboardList, Search } from 'lucide-react'
import { useAuth } from '../../context/useAuth'

export default function StudentRecordsPage() {
  const { token } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef()

  const [form, setForm] = useState({ student_id: '', first_name: '', last_name: '', course: '', priority_class: 'regular' })

  // Edit State
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', course: '', priority_class: 'regular' })
  const [isDeleting, setIsDeleting] = useState(null)
  const [courseFilter, setCourseFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadStudentRecords(token, formData)
      setSuccess(res.message)
      fetchRecords()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
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

  const handleDelete = async (studentId) => {
    if (!window.confirm(`Are you sure you want to delete record ${studentId}?`)) return
    setIsDeleting(studentId)
    setError(''); setSuccess('')
    try {
      await deleteStudentRecord(token, studentId)
      setSuccess('Record deleted successfully')
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
          <ClipboardList size={24} className="text-maroon" /> Student Records
        </h1>
        <p className="text-[12px] text-text-sub mt-2 mb-0">
          Manage the official school directory. Bulk import students via Excel or add them manually.
        </p>
      </div>

      {/* Edit Modal */}
      {editingRecord && createPortal((
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-100 flex items-center justify-center animate-fade-up">
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
                <select required value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors appearance-none focus:border-maroon">
                  <option value="" disabled>Select Course...</option>
                  <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                  <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                  <option value="Bachelor of Elementary Education">Bachelor of Elementary Education</option>
                  <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
                  <option value="Bachelor of Science in Criminology">Bachelor of Science in Criminology</option>
                  <option value="Bachelor of Science in Hospitality Management">Bachelor of Science in Hospitality Management</option>
                  <option value="Bachelor of Science in Tourism Management">Bachelor of Science in Tourism Management</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text-sub mb-1 block">Priority Class</label>
                <select required value={editForm.priority_class} onChange={e => setEditForm({ ...editForm, priority_class: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors appearance-none focus:border-maroon">
                  <option value="regular">Regular</option>
                  <option value="graduating">Graduating</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 p-2.5 rounded-lg border border-border bg-off-white text-text-sub font-semibold cursor-pointer hover:bg-border transition-colors">Cancel</button>
                <button type="submit" className="flex-1 p-2.5 rounded-lg border-none bg-maroon text-white font-semibold cursor-pointer hover:bg-maroon-dark transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {error && <div className="px-4 py-3 bg-danger-light text-danger rounded-lg mb-4 text-sm animate-fade-up">{error}</div>}
      {success && <div className="px-4 py-3 bg-success-light text-success rounded-lg mb-4 text-sm animate-fade-up">{success}</div>}

      <div className="grid grid-cols-2 gap-6 mb-6 animate-fade-up">

        {/* Upload Excel */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border">
          <h3 className="text-base font-semibold text-text-main m-0 mb-4 font-serif">Bulk Import via Excel</h3>
          <p className="text-[13px] text-text-sub mb-5">Upload an `.xlsx` file containing headers: <strong>Student ID, First Name, Last Name, Course, Priority Class</strong>.</p>

          <div className="border-2 border-dashed border-maroon-border bg-maroon-light p-8 rounded-xl text-center cursor-pointer transition-colors hover:bg-maroon-mid/30" onClick={() => fileInputRef.current?.click()}>
            <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <div className="mb-2 flex justify-center"><FileSpreadsheet size={24} className="text-maroon" /></div>
            <div className="text-sm font-semibold text-maroon">{uploading ? 'Uploading...' : 'Click to select Excel file'}</div>
          </div>
        </div>

        {/* Manual Add */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border">
          <h3 className="text-base font-semibold text-text-main m-0 mb-4 font-serif">Manually Add Student</h3>
          <form onSubmit={handleManualAdd} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input type="text" placeholder="Student ID (9 to 13 digits)" pattern="^\d{9,13}$" title="Format: 9 to 13 numbers" required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div>
              <input type="text" placeholder="First Name" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div>
              <input type="text" placeholder="Last Name" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white text-text-main w-full transition-colors focus:border-maroon" />
            </div>
            <div className="col-span-2">
              <select required value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className={`px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white w-full transition-colors appearance-none focus:border-maroon ${form.course ? 'text-text-main' : 'text-text-muted'}`}>
                <option value="" disabled>Select Course...</option>
                <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                <option value="Bachelor of Elementary Education">Bachelor of Elementary Education</option>
                <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
                <option value="Bachelor of Science in Criminology">Bachelor of Science in Criminology</option>
                <option value="Bachelor of Science in Hospitality Management">Bachelor of Science in Hospitality Management</option>
                <option value="Bachelor of Science in Tourism Management">Bachelor of Science in Tourism Management</option>
              </select>
            </div>
            <div className="col-span-2">
              <select required value={form.priority_class} onChange={e => setForm({ ...form, priority_class: e.target.value })} className="px-3.5 py-2.5 rounded-lg border border-border text-[13px] outline-none bg-white w-full transition-colors appearance-none focus:border-maroon text-text-main">
                <option value="regular">Regular Student</option>
                <option value="graduating">Graduating Student</option>
              </select>
            </div>
            <div className="col-span-2 mt-2">
              <button type="submit" className="w-full bg-gold text-white border-none p-3 rounded-lg font-semibold cursor-pointer font-sans transition-transform active:scale-95 hover:opacity-90">
                Add Student
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border overflow-hidden animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="px-6 py-5 border-b border-border flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-base font-semibold text-text-main m-0 font-serif">School Directory</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
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
                    <td colSpan={5} className="px-6 py-4">
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
                <tr><td colSpan={5} className="p-6 text-center text-text-muted">No matching student records found.</td></tr>
              ) : (
                currentRecords.map((record, index) => (
                  <tr key={record.student_id} className="group border-b border-border transition-colors hover:bg-maroon-light/50 animate-fade-up" style={{ animationDelay: `${index * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}>
                    <td className="px-6 py-3 font-medium text-maroon">{record.student_id}</td>
                    <td className="px-6 py-3 text-text-main">{record.first_name} {record.last_name}</td>
                    <td className="px-6 py-3 text-text-sub">{record.course}</td>
                    <td className="px-6 py-3">
                      {record.priority_class === 'graduating' ? (
                        <span className="bg-maroon-light text-maroon font-bold px-2 py-1 rounded text-[11px] uppercase tracking-wide">Graduating</span>
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
                      <button className="bg-transparent border-none cursor-pointer px-2 py-1 rounded text-xs font-semibold text-danger transition-colors hover:bg-danger-light flex items-center gap-1" onClick={() => handleDelete(record.student_id)} disabled={isDeleting === record.student_id}>
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
