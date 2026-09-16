import { useState, useRef, useEffect, useCallback } from 'react'
import DeleteAccountModal from '../../components/common/DeleteAccountModal'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import StudentLayout from '../../components/layout/StudentLayout'
import { useAuth } from '../../context/useAuth'
import { useStaffEvent } from '../../context/WebSocketContext'
import { useToast } from '../../context/ToastContext'
import { Edit2, IdCard, Tag, LogOut, Trash2, X, Camera, Loader2, Eye, EyeOff, ShieldAlert, ShieldCheck, Clock, FileText, CheckCircle, Upload, Sparkles, Bell, BellOff, Check, AlertCircle, Lock } from 'lucide-react'
import { changePassword, logoutAllDevices, deleteAccount, updateProfilePicture, removeProfilePicture } from '../../services/authService'
import { getMyPriorityStatus, submitPriorityRequest } from '../../services/priorityService'
import { uploadMedia } from '../../services/appointmentService'
import { isNotificationSupported, getPushStatus, setPushEnabled, requestNotificationPermission, sendBrowserNotification } from '../../utils/browserNotifications'

export default function StudentProfile({ embedded = false }) {
  const { user, token, updateUser, logout } = useAuth()
  const toast = useToast()
  
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [pushStatus, setPushStatus] = useState(() => getPushStatus())

  useEffect(() => {
    const handlePushToggle = () => {
      setPushStatus(getPushStatus())
    }
    window.addEventListener('campusflow-push-toggle', handlePushToggle)
    return () => window.removeEventListener('campusflow-push-toggle', handlePushToggle)
  }, [])

  const handleTogglePush = async () => {
    if (!isNotificationSupported()) {
      toast.error('Browser notifications are not supported on this browser.')
      return
    }

    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked in your browser settings. Please allow notifications in site permissions.')
      return
    }

    if (pushStatus === 'active') {
      setPushEnabled(false)
      setPushStatus('disabled')
      toast.info('Push notifications turned OFF.')
    } else {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        setPushStatus('active')
        toast.success('Push notifications turned ON! You will receive real-time queue & release alerts.')
        sendBrowserNotification('Notifications Activated 🔔', 'CampusFlow alerts are now active on this device!')
      } else {
        setPushStatus(getPushStatus())
        toast.error('Notification permission was not granted.')
      }
    }
  }
  
  // Password Visibility State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
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

  const fetchStatus = useCallback(() => {
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
  }, [token, user, updateUser])

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
  }, [token, fetchStatus])

  const handlePrioritySubmit = async (e) => {
    e.preventDefault()
    if (!priorityForm.file) {
      setPriorityMsg({ type: 'error', text: 'Please upload a supporting document.' })
      toast.error('Please upload a supporting document.')
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
      const mediaRes = await uploadMedia(token, priorityForm.file)
      setUploadProgress(92)
      await submitPriorityRequest(token, priorityForm.type, mediaRes.url)

      setUploadProgress(100)
      setTimeout(() => {
        clearInterval(progressTimer)
        setIsSubmittingPriority(false)
        setPriorityForm({ type: 'pwd', file: null })
        setPriorityMsg({ type: 'success', text: 'Priority status request submitted successfully!' })
        toast.success('Priority status request submitted successfully!')
        fetchStatus()
      }, 400)
    } catch (err) {
      clearInterval(progressTimer)
      setIsSubmittingPriority(false)
      setPriorityMsg({ type: 'error', text: err.message || 'Failed to submit priority request' })
      toast.error(err.message || 'Failed to submit priority request')
    }
  }

  const handleOpenEditModal = () => {
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
    
    if (!pendingProfilePicture && !pendingRemovePicture) {
      toast.info('No changes made.')
      handleCloseEditModal()
      return
    }
    
    setIsSavingProfile(true)
    try {
      let finalProfileImage = user?.profile_image
      
      if (pendingRemovePicture) {
         await removeProfilePicture(token)
         finalProfileImage = null
      } else if (pendingProfilePicture) {
         const picRes = await updateProfilePicture(pendingProfilePicture, token)
         finalProfileImage = `${picRes.profile_image}?t=${new Date().getTime()}`
      }
      
      updateUser({ 
          ...user,
          profile_image: finalProfileImage 
      })
      
      toast.success('Profile photo updated successfully!')
      handleCloseEditModal()
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' })
      toast.error(err.message || 'Failed to update profile')
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
      toast.success('Password changed successfully!')
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' })
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => {
        setIsChangingPassword(false)
        setPasswordMsg({ type: '', text: '' })
      }, 1500)
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' })
      toast.error(err.message || 'Failed to change password')
    } finally {
      setIsSavingPassword(false)
    }
  }
  
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
    setIsDeletingAccount(true)
    try {
      await deleteAccount(token)
      logout()
    } catch (err) {
      toast.error(err.message || 'Failed to delete account')
      setIsDeletingAccount(false)
      setShowDeleteModal(false)
    }
  }

  if (loadingPriority && !priorityStatus) {
    const skeleton = (
      <div className="flex-1 w-full pt-4 sm:pt-5 md:pt-0 pb-22 md:pb-0 px-4 md:px-0 animate-pulse">
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
      <div className="flex-1 w-full pt-4 sm:pt-5 md:pt-0 pb-22 md:pb-0 px-4 md:px-0 animate-fade-up">
        
        {/* Header */}
        <div className="hidden md:flex justify-between items-center mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <h1 className="font-serif text-[28px] font-bold text-maroon m-0">Profile</h1>
          <div className="text-[13px] text-text-sub font-medium flex items-center gap-2">
            <Link to="/student/dashboard" className="text-maroon hover:underline cursor-pointer">Home</Link>
            <span className="text-border-strong">›</span>
            <span>Profile</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-border p-4 sm:p-6 md:p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.1s' }}>
          
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 text-left">
            <div className="flex flex-col gap-1.5 md:gap-2">
              <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">First Name</span>
              <span className="text-[15px] font-semibold text-text-main">{user?.first_name || '-'}</span>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2">
              <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Last Name</span>
              <span className="text-[15px] font-semibold text-text-main">{user?.last_name || '-'}</span>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2 sm:col-span-2 lg:col-span-2">
              <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Email Address</span>
              <span className="text-[15px] font-semibold text-text-main flex items-center gap-2">
                {user?.email || 'student@crmc.edu.ph'}
              </span>
            </div>
          </div>
          
        </div>

        {/* Account Settings Header */}
        <div className="flex justify-between items-center mt-8 md:mt-12 mb-5 md:mb-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <h2 className="font-serif text-[22px] md:text-[28px] font-bold text-maroon m-0">Account Settings</h2>
        </div>

        {/* Settings Sections */}
        <div className="flex flex-col gap-6">

          {/* Priority Status Card */}
          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.2s' }}>
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
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.25s' }}>
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
          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.3s' }}>
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
          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.35s' }}>
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
              <button onClick={() => setShowDeleteModal(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-[14px] font-semibold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-colors shadow-sm cursor-pointer w-full md:w-auto">
                <Trash2 size={16} /> Delete account
              </button>
            </div>
          </div>
          
        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && createPortal((
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-3.5 sm:p-4 bg-black/60">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-120 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-border overflow-hidden animate-fade-up">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border/80 bg-off-white/70">
              <div>
                <h2 className="font-serif text-lg sm:text-[21px] font-bold text-maroon m-0 leading-tight">
                  Edit Profile
                </h2>
                <p className="text-[11.5px] sm:text-xs text-text-sub m-0 mt-0.5 font-normal">
                  Update your photo and view your verified credentials.
                </p>
              </div>
              <button 
                type="button"
                onClick={handleCloseEditModal}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-black/5 transition-colors cursor-pointer border-none bg-transparent shrink-0 -mr-1 -mt-1"
                aria-label="Close modal"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 flex flex-col gap-4.5 max-h-[calc(85vh-130px)] overflow-y-auto">
              
              {profileMsg.text && (
                <div className={`p-3 rounded-xl text-[12.5px] font-medium flex items-center gap-2 ${profileMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {profileMsg.text}
                </div>
              )}

              {/* Profile Photo Studio Section */}
              <div className="p-4 rounded-2xl bg-off-white/80 border border-border/70 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-text-main uppercase tracking-wider">Profile Photo</span>
                  <span className="text-[11px] text-text-muted font-medium">PNG or JPG, max 5MB</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-17 sm:h-17 rounded-full bg-maroon-light border-2 border-maroon/20 ring-4 ring-maroon/5 flex items-center justify-center text-maroon text-[20px] sm:text-[22px] font-bold font-serif overflow-hidden shadow-sm shrink-0">
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

                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSavingProfile}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-maroon/30 text-[12px] font-semibold text-maroon bg-white hover:bg-maroon hover:text-white transition-all shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Camera size={13} /> 
                      <span>Upload Photo</span>
                    </button>

                    {(previewImage || user?.profile_image) && (
                      <button 
                        type="button"
                        onClick={handleRemovePicture}
                        disabled={isSavingProfile || !previewImage} 
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Locked School Records Notice */}
              <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-[11.5px] sm:text-xs leading-relaxed">
                <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lock size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-amber-900 block leading-tight">School Credentials Locked</span>
                  <span className="text-amber-800/90 font-normal">Official student name and email account cannot be edited. Please contact the Registrar's Office for name corrections or change of email.</span>
                </div>
              </div>

              {/* Read-Only Verified Credential Fields */}
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11.5px] font-bold text-text-sub uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={user?.first_name || ''} 
                        disabled 
                        readOnly 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-[#F8F7F5] text-[13px] font-semibold text-text-main cursor-not-allowed pr-8 select-none focus:outline-none" 
                      />
                      <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-bold text-text-sub uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={user?.last_name || ''} 
                        disabled 
                        readOnly 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-[#F8F7F5] text-[13px] font-semibold text-text-main cursor-not-allowed pr-8 select-none focus:outline-none" 
                      />
                      <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-text-sub uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      disabled 
                      readOnly 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-[#F8F7F5] text-[13px] font-semibold text-text-main cursor-not-allowed pr-8 select-none focus:outline-none" 
                    />
                    <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-border/80 bg-off-white/80 flex items-center justify-end gap-2.5">
              <button 
                type="button"
                onClick={handleCloseEditModal}
                disabled={isSavingProfile}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-border text-[12.5px] font-semibold text-text-main bg-white hover:bg-off-white transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleUpdateProfile} 
                disabled={isSavingProfile} 
                className="flex items-center gap-1.5 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-maroon text-white text-[12.5px] font-bold hover:bg-maroon-dark transition-all shadow-sm cursor-pointer border-none disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>

          </div>
        </div>
      ), document.body)}

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setIsDeletingAccount(false) }}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeletingAccount}
        userEmail={user?.email}
      />
    </>
  );

  if (embedded) return content;
  return <StudentLayout mobileTitle="Profile" backTo="/student/dashboard">{content}</StudentLayout>;
}
