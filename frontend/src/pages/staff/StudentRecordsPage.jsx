import { useState, useEffect, useRef } from 'react'
import { getStudentRecords, uploadStudentRecords, addStudentRecord, deleteStudentRecord, editStudentRecord } from '../../services/adminService'
import { FileSpreadsheet, Edit, Trash2 } from 'lucide-react'

const M = {
  maroon: '#7B1A2A', maroonDark: '#5C1320', maroonLight: '#F9F0F1', maroonBorder: 'rgba(123,26,42,0.15)',
  gold: '#B8900A', goldLight: '#FDF6E3', goldBorder: 'rgba(184,144,10,0.25)',
  white: '#FFFFFF', offWhite: '#F9F7F4', border: '#EAE7E2', text: '#1C1917', textSub: '#57534E', textMuted: '#A8A29E',
  green: '#15803D', greenLight: '#F0FDF4',
  red: '#DC2626', redLight: '#FEF2F2',
}

export default function StudentRecordsPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef()

  const [form, setForm] = useState({ student_id: '', first_name: '', last_name: '', course: '' })

  // Edit State
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', course: '' })
  const [isDeleting, setIsDeleting] = useState(null)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await getStudentRecords(token)
      setRecords(res.records || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError(''); setSuccess('')
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
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
      const token = localStorage.getItem('token')
      await addStudentRecord(token, form)
      setSuccess('Student added successfully')
      setForm({ student_id: '', first_name: '', last_name: '', course: '' })
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
      const token = localStorage.getItem('token')
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
    setEditForm({ first_name: record.first_name, last_name: record.last_name, course: record.course })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      const token = localStorage.getItem('token')
      await editStudentRecord(token, editingRecord, editForm)
      setSuccess('Record updated successfully')
      setEditingRecord(null)
      fetchRecords()
    } catch (err) {
      setError(err.message)
    }
  }

  const inp = {
    padding: '10px 14px', borderRadius: '8px', border: `1px solid ${M.border}`,
    fontSize: '13px', outline: 'none', background: M.white, color: M.text, width: '100%',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .table-row {
            transition: background-color 0.2s, transform 0.2s;
            animation: slideUp 0.4s ease-out forwards;
            opacity: 0;
          }
          .table-row:hover {
            background-color: ${M.maroonLight} !important;
          }
          .action-btn {
            background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px;
            font-size: 12px; font-weight: 600; transition: all 0.2s;
          }
          .action-btn.edit { color: ${M.blue}; }
          .action-btn.edit:hover { background: ${M.blueLight}; }
          .action-btn.delete { color: ${M.red}; }
          .action-btn.delete:hover { background: ${M.redLight}; }
        `}</style>

      {/* Edit Modal */}
      {editingRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: M.white, padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: M.maroon, margin: '0 0 16px', fontFamily: "'Fraunces', serif" }}>Edit Record: {editingRecord}</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: M.textSub, marginBottom: '4px', display: 'block' }}>First Name</label>
                <input type="text" required value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: M.textSub, marginBottom: '4px', display: 'block' }}>Last Name</label>
                <input type="text" required value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: M.textSub, marginBottom: '4px', display: 'block' }}>Course</label>
                <select required value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value })} style={{ ...inp, appearance: 'none' }}>
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
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingRecord(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${M.border}`, background: M.offWhite, color: M.textSub, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: M.maroon, color: M.white, fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <div style={{ padding: '12px 16px', background: M.maroonLight, color: M.maroon, borderRadius: '8px', marginBottom: '16px', fontSize: '14px', animation: 'fadeIn 0.3s' }}>{error}</div>}
      {success && <div style={{ padding: '12px 16px', background: M.greenLight, color: M.green, borderRadius: '8px', marginBottom: '16px', fontSize: '14px', animation: 'fadeIn 0.3s' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', animation: 'slideUp 0.4s ease-out' }}>

        {/* Upload Excel */}
        <div style={{ background: M.white, padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${M.border}` }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: M.text, margin: '0 0 16px', fontFamily: "'Fraunces', serif" }}>Bulk Import via Excel</h3>
          <p style={{ fontSize: '13px', color: M.textSub, marginBottom: '20px' }}>Upload an `.xlsx` file containing headers: <strong>Student ID, First Name, Last Name, Course</strong>.</p>

          <div style={{ border: `2px dashed ${M.maroonBorder}`, background: M.maroonLight, padding: '32px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => fileInputRef.current?.click()}>
            <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><FileSpreadsheet size={24} color={M.maroon} /></div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: M.maroon }}>{uploading ? 'Uploading...' : 'Click to select Excel file'}</div>
          </div>
        </div>

        {/* Manual Add */}
        <div style={{ background: M.white, padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${M.border}` }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: M.text, margin: '0 0 16px', fontFamily: "'Fraunces', serif" }}>Manually Add Student</h3>
          <form onSubmit={handleManualAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <input type="text" placeholder="Student ID (9 to 13 digits)" pattern="^\d{9,13}$" title="Format: 9 to 13 numbers" required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} style={inp} onFocus={e => e.target.style.borderColor = M.maroon} onBlur={e => e.target.style.borderColor = M.border} />
            </div>
            <div>
              <input type="text" placeholder="First Name" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} style={inp} onFocus={e => e.target.style.borderColor = M.maroon} onBlur={e => e.target.style.borderColor = M.border} />
            </div>
            <div>
              <input type="text" placeholder="Last Name" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} style={inp} onFocus={e => e.target.style.borderColor = M.maroon} onBlur={e => e.target.style.borderColor = M.border} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <select required value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} style={{ ...inp, appearance: 'none', color: form.course ? M.text : M.textMuted }} onFocus={e => e.target.style.borderColor = M.maroon} onBlur={e => e.target.style.borderColor = M.border}>
                <option value="" disabled>Select Course...</option>
                <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                <option value="Bachelor of Science in Computer Science">Bachelor of Science in Computer Science</option>
                <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                <option value="Bachelor of Elementary Education">Bachelor of Elementary Education</option>
                <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
                <option value="Bachelor of Science in Criminology">Bachelor of Science in Criminology</option>
                <option value="Bachelor of Science in Hospitality Management">Bachelor of Science in Hospitality Management</option>
                <option value="Bachelor of Science in Tourism Management">Bachelor of Science in Tourism Management</option>
                <option value="Bachelor of Science in Nursing">Bachelor of Science in Nursing</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
              <button type="submit" style={{ width: '100%', background: M.gold, color: M.white, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", transition: 'transform 0.1s' }} onMouseDown={e => e.target.style.transform = 'scale(0.98)'} onMouseUp={e => e.target.style.transform = 'scale(1)'}>
                Add Student
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Records Table */}
      <div style={{ background: M.white, borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${M.border}`, overflow: 'hidden', animation: 'slideUp 0.6s ease-out' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${M.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: M.text, margin: 0, fontFamily: "'Fraunces', serif" }}>School Directory</h3>
          <span style={{ fontSize: '12px', color: M.textSub, background: M.offWhite, padding: '4px 10px', borderRadius: '100px', fontWeight: 600 }}>{records.length} Records</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: M.offWhite, color: M.textSub, fontWeight: 600, borderBottom: `1px solid ${M.border}` }}>
                <th style={{ padding: '12px 24px' }}>Student ID</th>
                <th style={{ padding: '12px 24px' }}>Name</th>
                <th style={{ padding: '12px 24px' }}>Course</th>
                <th style={{ padding: '12px 24px' }}>Date Added</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${M.border}` }}>
                    <td colSpan={5} style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div className="animate-shimmer" style={{ height: '20px', width: '20%', borderRadius: '4px', background: '#E2E8F0' }} />
                        <div className="animate-shimmer" style={{ height: '20px', width: '30%', borderRadius: '4px', background: '#E2E8F0' }} />
                        <div className="animate-shimmer" style={{ height: '20px', width: '15%', borderRadius: '4px', background: '#E2E8F0' }} />
                        <div className="animate-shimmer" style={{ height: '20px', width: '15%', borderRadius: '4px', background: '#E2E8F0' }} />
                        <div className="animate-shimmer" style={{ height: '20px', width: '10%', borderRadius: '4px', background: '#E2E8F0', marginLeft: 'auto' }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: M.textMuted }}>No student records found. Upload an Excel file to get started.</td></tr>
              ) : (
                records.map((record, index) => (
                  <tr key={record.student_id} className="table-row" style={{ borderBottom: `1px solid ${M.border}`, animationDelay: `${index * 0.05}s` }}>
                    <td style={{ padding: '12px 24px', fontWeight: 500, color: M.maroon }}>{record.student_id}</td>
                    <td style={{ padding: '12px 24px', color: M.text }}>{record.first_name} {record.last_name}</td>
                    <td style={{ padding: '12px 24px', color: M.textSub }}>{record.course}</td>
                    <td style={{ padding: '12px 24px', color: M.textMuted, fontSize: '12px' }}>{new Date(record.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 24px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="action-btn edit" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => startEdit(record)}>
                        <Edit size={14} /> Edit
                      </button>
                      <button className="action-btn delete" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDelete(record.student_id)} disabled={isDeleting === record.student_id}>
                        <Trash2 size={14} /> {isDeleting === record.student_id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
