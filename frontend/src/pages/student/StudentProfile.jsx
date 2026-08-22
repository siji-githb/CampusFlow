import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StudentLayout from '../../components/layout/StudentLayout'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { Edit2, IdCard, Tag, LogOut, Trash2, X, Camera, Loader2, Eye, EyeOff, ShieldAlert, ShieldCheck, Clock, FileText, CheckCircle, Upload, Sparkles, Bell, BellOff, Check, AlertCircle } from 'lucide-react'
import { updateProfile, changePassword, logoutAllDevices, deleteAccount, updateProfilePicture, removeProfilePicture } from '../../services/authService'
import { getMyPriorityStatus, submitPriorityRequest } from '../../services/priorityService'
import { uploadMedia } from '../../services/appointmentService'
import { isNotificationSupported, getPushStatus, setPushEnabled, requestNotificationPermission } from '../../utils/browserNotifications'

export default function StudentProfile({ embedded = false }) {
  const { user, token, updateUser, logout } = useAuth()
  
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [pushStatus, setPushStatus] = useState(() => getPushStatus())
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  useEffect(() => {
    const handlePushToggle = () => {
      setPushStatus(getPushStatus())
    }
    window.addEventListener('campusflow-push-toggle', handlePushToggle)
    return () => window.removeEventListener('campusflow-push-toggle', handlePushToggle)
  }, [])

  const handleTogglePush = async () => {
    if (!isNotificationSupported()) {
      showToast('Browser notifications are not supported on this browser.', 'error')
      return
    }

    if (Notification.permission === 'denied') {
      showToast('Notifications are blocked in your browser settings. Please allow notifications in site permissions.', 'error')
      return
    }

    if (pushStatus === 'active') {
      setPushEnabled(false)
      setPushStatus('disabled')
      showToast('Desktop push notifications turned OFF.', 'info')
    } else {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        setPushStatus('active')
        showToast('Desktop push notifications turned ON! You will receive real-time queue & release alerts.', 'success')
      } else {
        setPushStatus(getPushStatus())
        showToast('Notification permission was not granted.', 'error')
      }
    }
  }
  
  // Password Visibility State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Profile Form State
  const [editData, setEditData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  
  // Password Form State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })
  
  const fileInputRef = useRef(null)
  const [pendingProfilePicture, setPendingProfilePicture] = useState(null)
  const [pendingRemovePicture, setPendingRemovePicture] = useState(false)
  const [previewImage, setPreviewImage] = useState(user?.profile_image || null)

  // Priority Status State
  const [priorityStatus, setPriorityStatus] = useState(null)
  const [loadingPriority, setLoadingPriority] = useState(true)
  const [priorityForm, setPriorityForm] = useState({ type: 'pwd', file: null })
  const [isSubmittingPriority, setIsSubmittingPriority] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [priorityMsg, setPriorityMsg] = useState({ type: '', text: '' })

  const fetchStatus = () => {
    if (!token) return
    getMyPriorityStatus(token)
      .then(status => {
        setPriorityStatus(status)
        if (status?.latest_request?.status === 'approved' && user?.priority_class !== status.latest_request.priority_type) {
          updateUser({ ...user, priority_class: status.latest_request.priority_type })
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPriority(false))
  }

  // Real-time WebSocket event listener for instant 0ms updates
  useStaffEvent('PRIORITY_REQUESTS_UPDATED', () => {
    fetchStatus()
  })

  useEffect(() => {
    let interval;
    if (token) {
      fetchStatus()
      interval = setInterval(fetchStatus, 60000)
    }
    return () => clearInterval(interval)
  }, [token, user, updateUser])

  const handlePrioritySubmit = async (e) => {
    e.preventDefault()
    if (!priorityForm.file) {
      setPriorityMsg({ type: 'error', text: 'Please upload a supporting document.' })
      return
    }
    
    setIsSubmittingPriority(true)
    setUploadProgress(6)
    setPriorityMsg({ type: '', text: '' })

    let phase = 1
    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (phase === 1) {
          if (prev < 42) return prev + Math.floor(Math.random() * 8) + 4
          phase = 2
          return 46
        }
        if (prev < 86) return prev + Math.floor(Math.random() * 6) + 3
        return prev
      })
    }, 280)

    try {
      const mediaRes = await uploadMedia(priorityForm.file, token)
      setUploadProgress(92)
      await submitPriorityRequest({
        priority_type: priorityForm.type,
        document_url: mediaRes.url
      }, token)

      setUploadProgress(100)
      setTimeout(() => {
        clearInterval(progressTimer)
        setIsSubmittingPriority(false)
        setPriorityForm({ type: 'pwd', file: null })
        setPriorityMsg({ type: 'success', text: 'Priority status request submitted successfully!' })
        fetchStatus()
      }, 400)
    } catch (err) {
      clearInterval(progressTimer)
      setIsSubmittingPriority(false)
      setPriorityMsg({ type: 'error', text: err.message || 'Failed to submit priority request' })
    }
  }

  const handleOpenEditModal = () => {
    setEditData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    })
    setPendingProfilePicture(null)
    setPendingRemovePicture(false)
    setPreviewImage(user?.profile_image || null)
    setProfileMsg({ type: '', text: '' })
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setPendingProfilePicture(null)
    setPendingRemovePicture(false)
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }
  }

  const handleRemovePicture = () => {
    setPendingProfilePicture(null)
    setPendingRemovePicture(true)
    setPreviewImage(null)
    setProfileMsg({ type: '', text: '' })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Quick frontend validation
    const allowedTypes = ['image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setProfileMsg({ type: 'error', text: 'Only PNG and JPEG images are allowed.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image size exceeds 5MB limit.' })
      return
    }

    setPendingProfilePicture(file)
    setPendingRemovePicture(false)
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }
    setPreviewImage(URL.createObjectURL(file))
    setProfileMsg({ type: '', text: '' })
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpdateProfile = async () => {
    setProfileMsg({ type: '', text: '' })
    if (!editData.first_name || !editData.last_name || !editData.email) {
      setProfileMsg({ type: 'error', text: 'All fields are required.' })
      return
    }
    
    setIsSavingProfile(true)
    try {
      // 1. Update text profile
      const res = await updateProfile(editData, token)
      
      let finalProfileImage = user?.profile_image
      
      // 2. Handle picture changes if any
      if (pendingRemovePicture) {
         await removeProfilePicture(token)
         finalProfileImage = null
      } else if (pendingProfilePicture) {
         const picRes = await updateProfilePicture(pendingProfilePicture, token)
         finalProfileImage = `${picRes.profile_image}?t=${new Date().getTime()}`
      }
      
      updateUser({ 
          ...res.user,
          profile_image: finalProfileImage 
      })
      
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
      setTimeout(() => {
        handleCloseEditModal()
      }, 1500)
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordMsg({ type: '', text: '' })
    if (!passwordData.current_password || !passwordData.new_password) {
      setPasswordMsg({ type: 'error', text: 'Please fill out all fields.' })
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    
    setIsSavingPassword(true)
    try {
      await changePassword({ 
        current_password: passwordData.current_password, 
        new_password: passwordData.new_password 
      }, token)
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' })
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => {
        setIsChangingPassword(false)
        setPasswordMsg({ type: '', text: '' })
      }, 1500)
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' })
    } finally {
      setIsSavingPassword(false)
    }
  }
  
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const handleLogoutAll = async () => {
    setIsLoggingOutAll(true)
    try {
      await logoutAllDevices(token)
      logout()
    } catch (err) {
      alert(err.message || 'Failed to logout from all devices')
      setIsLoggingOutAll(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
      return
    }
    setIsDeletingAccount(true)
    try {
      await deleteAccount(token)
      logout()
    } catch (err) {
      alert(err.message || 'Failed to delete account')
      setIsDeletingAccount(false)
    }
  }

  if (loadingPriority && !priorityStatus) {
    const skeleton = (
      <div className="flex-1 w-full pb-22 md:pb-0 px-4 md:px-0 animate-pulse">
        {/* Header Skeleton */}
        <div className="hidden md:flex justify-between items-center mb-8">
          <div className="h-8 w-32 bg-border/80 rounded-lg" />
          <div className="h-4 w-24 bg-border/40 rounded" />
        </div>

        <div className="flex flex-col gap-6">
          {/* Profile Card Skeleton */}
          <div className="bg-white rounded-3xl border border-border p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-border/60 shrink-0" />
            <div className="flex-1 text-center md:text-left">
              <div className="h-6 w-48 bg-border/70 rounded mb-2 mx-auto md:mx-0" />
              <div className="h-4 w-36 bg-border/50 rounded mb-3 mx-auto md:mx-0" />
              <div className="h-6 w-28 bg-border/40 rounded-full mx-auto md:mx-0" />
            </div>
            <div className="h-10 w-32 bg-border/50 rounded-xl shrink-0" />
          </div>

          {/* Priority Status Skeleton */}
          <div className="bg-white rounded-3xl border border-border p-6 md:p-8">
            <div className="h-5 w-36 bg-border/70 rounded mb-4" />
            <div className="h-3.5 w-72 bg-border/40 rounded mb-6" />
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="h-16 bg-off-white rounded-xl border border-border" />
              <div className="h-16 bg-off-white rounded-xl border border-border" />
            </div>
            <div className="h-24 bg-off-white rounded-xl border-2 border-dashed border-border" />
          </div>

          {/* Push Notification Card Skeleton */}
          <div className="bg-white rounded-3xl border border-border p-6 md:p-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-border/50 shrink-0" />
              <div>
                <div className="h-5 w-44 bg-border/70 rounded mb-2" />
                <div className="h-3.5 w-64 bg-border/40 rounded" />
              </div>
            </div>
            <div className="h-8 w-14 rounded-full bg-border/50" />
          </div>

          {/* Security Skeleton */}
          <div className="bg-white rounded-3xl border border-border p-6 md:p-8 flex justify-between items-center">
            <div>
              <div className="h-5 w-36 bg-border/70 rounded mb-2" />
              <div className="h-3.5 w-56 bg-border/40 rounded" />
            </div>
            <div className="h-10 w-36 bg-border/50 rounded-xl" />
          </div>
        </div>
      </div>
    );
    if (embedded) return skeleton;
    return <StudentLayout activeTab="profile" mobileTitle="Profile" backTo="/student/dashboard">{skeleton}</StudentLayout>;
  }

  const content = (
    <>
      <div className="flex-1 w-full pb-22 md:pb-0 px-4 md:px-0">
        
        {/* Header */}
        <div className="hidden md:flex justify-between items-center mb-8">
          <h1 className="font-serif text-[28px] font-bold text-maroon m-0">Profile</h1>
          <div className="text-[13px] text-text-sub font-medium flex items-center gap-2">
            <Link to="/student/dashboard" className="text-maroon hover:underline cursor-pointer">Home</Link>
            <span className="text-border-strong">›</span>
            <span>Profile</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-border p-4 sm:p-6 md:p-8 shadow-sm animate-fade-up">
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between pb-5 sm:pb-6 md:pb-8 mb-5 sm:mb-6 md:mb-8 border-b border-border gap-4 md:gap-0 w-full">
            <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-6 text-center sm:text-left w-full md:w-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 rounded-full bg-maroon-light border-[3px] border-maroon-border flex items-center justify-center text-maroon text-2xl sm:text-3xl font-bold overflow-hidden shadow-sm">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.first_name?.[0]?.toUpperCase() || 'S'
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-lg sm:text-2xl font-bold text-text-main m-0 mb-1 sm:mb-2 truncate">
                  {user?.first_name} {user?.last_name}
                </h2>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-4 text-xs sm:text-sm text-text-sub font-medium">
                  <span className="flex items-center gap-1.5"><IdCard size={14} className="text-gold" /> ID: {user?.student_id || 'Not set'}</span>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-border-strong" />
                  <span className="flex items-center gap-1.5"><Tag size={14} className="text-gold" /> {user?.priority_class ? `${user.priority_class === 'pwd' ? 'PWD' : user.priority_class.charAt(0).toUpperCase() + user.priority_class.slice(1)} Student` : 'Student'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleOpenEditModal}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-border text-xs sm:text-sm font-bold text-text-main bg-white hover:bg-off-white hover:border-maroon-border hover:text-maroon transition-colors shadow-2xs cursor-pointer w-full md:w-auto mt-2 md:mt-0"
            >
              <Edit2 size={14} /> Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-left">
            <div className="flex flex-col gap-1.5 md:gap-2">
              <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">First Name</span>
              <span className="text-[15px] font-semibold text-text-main">{user?.first_name || '-'}</span>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2">
              <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Last Name</span>
              <span className="text-[15px] font-semibold text-text-main">{user?.last_name || '-'}</span>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2 sm:col-span-2 md:col-span-2">
              <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Email Address</span>
              <span className="text-[15px] font-semibold text-text-main flex items-center gap-2">
                {user?.email || 'student@crmc.edu.ph'}
              </span>
            </div>
          </div>
          
        </div>

        {/* Account Settings Header */}
        <div className="flex justify-between items-center mt-8 md:mt-12 mb-5 md:mb-8">
          <h2 className="font-serif text-[22px] md:text-[28px] font-bold text-maroon m-0">Account Settings</h2>
        </div>

        {/* Settings Sections */}
        <div className="flex flex-col gap-6">

          {/* Priority Status Card */}
          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm animate-fade-up">
            <h3 className="font-serif text-[18px] md:text-[20px] font-bold text-text-main m-0 mb-5 md:mb-6">Priority Status</h3>
            
            {loadingPriority ? (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="animate-spin text-maroon" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {priorityMsg.text && (
                  <div className={`p-3 rounded-lg text-[13px] font-medium ${priorityMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {priorityMsg.text}
                  </div>
                )}
                
                {/* STATE 1: PENDING */}
                {priorityStatus?.latest_request?.status === 'pending' && (
                  <div className="bg-gold-light/30 border border-gold-border rounded-xl p-5 flex items-start gap-4">
                    <Clock size={24} className="text-gold shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">Under Review</h4>
                      <p className="text-[13px] text-text-sub m-0 leading-relaxed">
                        Your {priorityStatus.latest_request.priority_type === 'pwd' ? 'PWD' : 'Pregnancy'} priority request is currently being reviewed by staff. You will be notified once it is approved.
                        <br />
                        <span className="text-[12px] font-medium text-text-muted mt-2 block">Submitted on {new Date(priorityStatus.latest_request.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* STATE 2: APPROVED */}
                {priorityStatus?.latest_request?.status === 'approved' && (
                  <div className="bg-success-light border border-success-border rounded-xl p-5 flex items-start gap-4">
                    <CheckCircle size={24} className="text-success shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[15px] font-bold text-text-main m-0 mb-1">
                        {priorityStatus.latest_request.priority_type === 'pwd' ? 'PWD' : 'Pregnancy'} Priority Active
                      </h4>
                      <p className="text-[13px] text-text-sub m-0 leading-relaxed">
                        You currently have priority status when booking appointments and joining queues.
                        {priorityStatus.latest_request.priority_type === 'pregnant' && priorityStatus.latest_request.expires_at && (
                          <span className="block mt-2 font-semibold text-text-main">
                            Active until {new Date(priorityStatus.latest_request.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {priorityStatus.latest_request.priority_type === 'pwd' && (
                          <span className="block mt-2 font-semibold text-text-main">
                            This status does not expire.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* STATE 3: NO REQUEST or REJECTED */}
                {(!priorityStatus?.latest_request || priorityStatus?.latest_request?.status === 'rejected') && (
                  <>
                    {priorityStatus?.latest_request?.status === 'rejected' && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <h4 className="text-[14px] font-bold text-red-700 m-0 mb-1 flex items-center gap-2"><X size={16} /> Request Rejected</h4>
                        <p className="text-[13px] text-red-600 m-0">Reason: {priorityStatus.latest_request.rejection_reason}</p>
                      </div>
                    )}
                    
                    <div className="text-[14px] text-text-sub mb-4">
                      Are you a PWD or currently pregnant? Submit a document to get priority queuing for your appointments. Our staff will review your submission.
                    </div>
                    
                    <form onSubmit={handlePrioritySubmit} className="flex flex-col gap-5">
                      <div className="flex gap-4">
                        <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${priorityForm.type === 'pwd' ? 'border-maroon bg-maroon-light/20' : 'border-border bg-white hover:bg-off-white'}`}>
                          <input type="radio" name="priority_type" value="pwd" checked={priorityForm.type === 'pwd'} onChange={() => setPriorityForm({ ...priorityForm, type: 'pwd' })} className="accent-maroon w-4 h-4 cursor-pointer" />
                          <span className="text-[14px] font-bold text-text-main">PWD</span>
                        </label>
                        <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${priorityForm.type === 'pregnant' ? 'border-maroon bg-maroon-light/20' : 'border-border bg-white hover:bg-off-white'}`}>
                          <input type="radio" name="priority_type" value="pregnant" checked={priorityForm.type === 'pregnant'} onChange={() => setPriorityForm({ ...priorityForm, type: 'pregnant' })} className="accent-maroon w-4 h-4 cursor-pointer" />
                          <span className="text-[14px] font-bold text-text-main">Pregnant</span>
                        </label>
                      </div>
                      
                      <div>
                        <label className="block text-[13px] font-semibold text-text-main mb-2">
                          Supporting Document ({priorityForm.type === 'pwd' ? 'PWD ID or Barangay Certificate' : 'Pre-Natal Certificate'})
                        </label>
                        <label className="flex items-center justify-center w-full h-22 sm:h-24 border-2 border-dashed border-border rounded-xl bg-off-white hover:bg-gray-50 transition-colors cursor-pointer relative overflow-hidden group px-4">
                          {priorityForm.file ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-success-light flex items-center justify-center text-success shrink-0">
                                <CheckCircle size={18} />
                              </div>
                              <div className="text-left min-w-0">
                                <p className="text-[13px] font-bold text-text-main truncate m-0 max-w-xs">{priorityForm.file.name}</p>
                                <span className="text-[11px] text-text-muted font-medium">Click to change file</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted group-hover:text-maroon group-hover:bg-maroon-light transition-colors shrink-0">
                                <Upload size={18} />
                              </div>
                              <div className="text-left">
                                <p className="text-[13px] font-bold text-text-main m-0 leading-tight">Click to upload document</p>
                                <span className="text-[11px] text-text-muted font-medium">JPEG or PNG, max 5MB</span>
                              </div>
                            </div>
                          )}
                          <input type="file" accept=".png, .jpg, .jpeg" className="hidden" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const allowedTypes = ['image/jpeg', 'image/png'];
                              if (!allowedTypes.includes(file.type)) {
                                setPriorityMsg({ type: 'error', text: 'Only PNG and JPEG images are allowed.' });
                                return;
                              }
                              if (file.size > 5 * 1024 * 1024) {
                                setPriorityMsg({ type: 'error', text: 'Image size exceeds 5MB limit.' });
                                return;
                              }
                              setPriorityMsg({ type: '', text: '' });
                              setPriorityForm({ ...priorityForm, file: file });
                            }
                          }} />
                        </label>
                      </div>
                      
                      {/* Modern Upload Progress Bar (0 - 100%) */}
                      {isSubmittingPriority && (
                        <div className="mt-3 p-4 rounded-2xl bg-linear-to-b from-white to-slate-50/70 border border-maroon-border/40 shadow-[0_4px_20px_rgba(123,26,42,0.06)] animate-fade-up">
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-maroon-light flex items-center justify-center text-maroon shrink-0 shadow-2xs border border-maroon-border/30">
                                {uploadProgress < 85 ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Sparkles size={14} className="animate-pulse" />
                                )}
                              </div>
                              <div className="truncate">
                                <p className="text-[13px] font-bold text-text-main leading-tight truncate m-0">
                                  {uploadProgress < 40
                                    ? 'Uploading document...'
                                    : uploadProgress < 85
                                    ? 'Analyzing document with AI...'
                                    : uploadProgress < 100
                                    ? 'Finalizing submission...'
                                    : 'Upload complete!'}
                                </p>
                                <p className="text-[11px] text-text-muted font-medium leading-tight truncate m-0 mt-0.5">
                                  {priorityForm.file?.name}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-maroon-light text-maroon font-bold font-sans text-[12px] border border-maroon-border/40 shrink-0 shadow-2xs">
                              {uploadProgress}%
                            </span>
                          </div>

                          {/* Progress Track */}
                          <div className="w-full h-2 bg-slate-100/90 rounded-full overflow-hidden border border-slate-200/60 p-0.5 relative">
                            <div
                              className="h-full bg-linear-to-r from-maroon via-maroon to-[#9c2436] rounded-full transition-all duration-300 ease-out relative shadow-2xs"
                              style={{ width: `${uploadProgress}%` }}
                            >
                              <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end mt-4">
                        <button
                          type="submit"
                          disabled={isSubmittingPriority || !priorityForm.file}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-maroon text-white text-[14px] font-semibold hover:bg-maroon-dark transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isSubmittingPriority ? (
                            <>
                              <Loader2 size={16} className="animate-spin" /> Submitting {uploadProgress}%
                            </>
                          ) : (
                            'Submit Request'
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Push Notifications Card (Directly Below Priority Status) */}
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  pushStatus === 'active' 
                    ? 'bg-success-light/40 border-success-border text-success' 
                    : pushStatus === 'denied'
                    ? 'bg-red-50 border-red-200 text-danger'
                    : 'bg-gold-light/40 border-gold-border text-gold'
                }`}>
                  {pushStatus === 'active' ? <Bell size={22} /> : <BellOff size={22} />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-serif text-[18px] md:text-[20px] font-bold text-text-main m-0">
                      Push Notifications & Alerts
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider border ${
                      pushStatus === 'active'
                        ? 'bg-success-light text-success border-success-border'
                        : pushStatus === 'denied'
                        ? 'bg-red-50 text-danger border-red-200'
                        : 'bg-surface text-text-muted border-border'
                    }`}>
                      {pushStatus === 'active' ? 'Active' : pushStatus === 'denied' ? 'Blocked by Browser' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[13px] text-text-sub m-0 mt-1 leading-relaxed max-w-xl">
                    Receive instant notifications when your number is called, requirements are verified, or documents are ready for pickup.
                  </p>
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-center flex items-center gap-3">
                <span className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${
                  pushStatus === 'active' ? 'text-maroon' : 'text-text-muted'
                }`}>
                  {pushStatus === 'active' ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pushStatus === 'active'}
                  onClick={handleTogglePush}
                  title={pushStatus === 'active' ? 'Click to turn off alerts' : 'Click to turn on alerts'}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-maroon/20 shadow-inner ${
                    pushStatus === 'active' ? 'bg-maroon' : 'bg-slate-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                      pushStatus === 'active' ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {pushStatus === 'active' ? (
                      <Bell size={13} className="text-maroon" />
                    ) : (
                      <BellOff size={13} className="text-text-muted" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {pushStatus === 'denied' && (
              <div className="mt-4 p-3.5 bg-red-50/80 border border-red-200/80 rounded-xl flex items-center gap-2.5 text-[12px] text-red-700 font-medium">
                <AlertCircle size={16} className="shrink-0 text-danger" />
                <span>
                  Notifications are blocked in your browser site settings. Click the lock/settings icon in your browser URL bar to allow notifications for CampusFlow.
                </span>
              </div>
            )}
          </div>
          
          {/* Security Card */}
          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="font-serif text-[18px] md:text-[20px] font-bold text-text-main m-0 mb-5 md:mb-6">Security</h3>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
              <div>
                <h4 className="text-[16px] font-bold text-text-main m-0 mb-1">Change Password</h4>
                <p className="text-[13px] text-text-sub m-0">Receive real-time notifications after changing.</p>
              </div>
              <button 
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-[14px] font-semibold text-text-main bg-white hover:bg-off-white hover:border-maroon-border hover:text-maroon transition-colors shadow-sm cursor-pointer w-full md:w-auto"
              >
                <Edit2 size={16} /> {isChangingPassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isChangingPassword ? 'max-h-125 opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
              <div className="pt-6 border-t border-border flex flex-col gap-4">
                
                {passwordMsg.text && (
                  <div className={`p-3 rounded-lg text-[13px] font-medium ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {passwordMsg.text}
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-semibold text-text-main mb-1.5">Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPassword ? "text" : "password"} placeholder="Enter current password" 
                      value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-white text-[14px] text-text-main focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon transition-colors" />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main transition-colors cursor-pointer">
                      {showCurrentPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-text-main mb-1.5">New Password</label>
                    <div className="relative">
                      <input type={showNewPassword ? "text" : "password"} placeholder="Enter new password" 
                        value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-white text-[14px] text-text-main focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon transition-colors" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main transition-colors cursor-pointer">
                        {showNewPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-text-main mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" 
                        value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-white text-[14px] text-text-main focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon transition-colors" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main transition-colors cursor-pointer">
                        {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={handleChangePassword} disabled={isSavingPassword} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-maroon text-white text-[14px] font-semibold hover:bg-maroon-dark transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSavingPassword ? <><Loader2 size={16} className="animate-spin" /> Saving</> : 'Save Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-serif text-[18px] md:text-[20px] font-bold text-text-main m-0 mb-5 md:mb-6">Danger Zone</h3>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-border gap-4 md:gap-0">
              <div>
                <h4 className="text-[16px] font-bold text-text-main m-0 mb-1">Logout all devices</h4>
                <p className="text-[13px] text-text-sub m-0">Sign out from every active session.</p>
              </div>
              <button onClick={handleLogoutAll} disabled={isLoggingOutAll} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-[14px] font-semibold text-text-main bg-white hover:bg-off-white hover:border-maroon-border hover:text-maroon transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto">
                {isLoggingOutAll ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} 
                {isLoggingOutAll ? 'Logging out...' : 'Logout'}
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
              <div>
                <h4 className="text-[16px] font-bold text-text-main m-0 mb-1">Delete account</h4>
                <p className="text-[13px] text-text-sub m-0">Once you delete your account, there is no going back. Please be certain.</p>
              </div>
              <button onClick={handleDeleteAccount} disabled={isDeletingAccount} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-[14px] font-semibold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto">
                {isDeletingAccount ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} 
                {isDeletingAccount ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
          
        </div>

      </div>

      {/* Manage Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/50" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
          <div className="bg-white rounded-3xl w-full max-w-125 shadow-2xl overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between p-6 border-b border-border bg-off-white">
              <h2 className="font-serif text-[22px] font-bold text-maroon m-0">Manage Profile</h2>
              <button 
                onClick={handleCloseEditModal}
                className="p-2 rounded-full hover:bg-border transition-colors text-text-sub hover:text-text-main cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              
              {profileMsg.text && (
                <div className={`p-3 rounded-lg text-[13px] font-medium ${profileMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {profileMsg.text}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <label className="block text-[13px] font-semibold text-text-main">Profile Picture</label>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-maroon-light border-2 border-maroon-border flex items-center justify-center text-maroon text-[22px] font-bold overflow-hidden shadow-sm">
                    {previewImage ? (
                      <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.first_name?.[0]?.toUpperCase() || 'S'
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/png, image/jpeg" 
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-[13px] font-semibold text-text-main bg-white hover:bg-off-white hover:border-maroon-border hover:text-maroon transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Camera size={14} /> 
                    Change Picture
                  </button>
                  <button 
                    onClick={handleRemovePicture}
                    disabled={isSavingProfile || !previewImage} 
                    className="flex items-center gap-2 text-[13px] font-semibold text-red hover:text-red-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="h-px bg-border w-full" />
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-semibold text-text-main mb-1.5">First Name</label>
                  <input type="text" value={editData.first_name} onChange={e => setEditData({...editData, first_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-[14px] text-text-main focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon transition-colors" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-text-main mb-1.5">Last Name</label>
                  <input type="text" value={editData.last_name} onChange={e => setEditData({...editData, last_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-[14px] text-text-main focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-text-main mb-1.5">Email Address</label>
                <input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-[14px] text-text-main focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon transition-colors" />
              </div>
            </div>
            <div className="p-6 border-t border-border bg-off-white flex justify-end gap-3">
              <button 
                onClick={handleCloseEditModal}
                className="px-6 py-2.5 rounded-xl border border-border text-[14px] font-semibold text-text-main bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button onClick={handleUpdateProfile} disabled={isSavingProfile} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-maroon text-white text-[14px] font-semibold hover:bg-maroon-dark transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                {isSavingProfile ? <><Loader2 size={16} className="animate-spin" /> Saving</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-10 right-8 z-9999 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border text-[13.5px] font-bold animate-fade-up ${
          toastMsg.type === 'error'
            ? 'bg-danger text-white border-danger-border'
            : toastMsg.type === 'info'
            ? 'bg-slate-800 text-white border-slate-700'
            : 'bg-[#006600] text-white border-[#005200]'
        }`}>
          {toastMsg.type === 'error' ? (
            <AlertCircle size={17} className="shrink-0 text-white" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Check size={13} className="text-white stroke-3" />
            </div>
          )}
          <span className="text-white">{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2.5 bg-transparent border-none text-white/80 hover:text-white cursor-pointer p-0 flex items-center shrink-0 transition-opacity">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </>
  );

  if (embedded) return content;
  return <StudentLayout mobileTitle="Profile" backTo="/student/dashboard">{content}</StudentLayout>;
}
