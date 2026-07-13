import { useState, useRef } from 'react'
import { useAuth } from '../../context/useAuth'
import { Edit2, IdCard, Tag, LogOut, Trash2, X, Camera, Loader2, Eye, EyeOff } from 'lucide-react'
import { updateProfile, changePassword, logoutAllDevices, deleteAccount, updateProfilePicture, removeProfilePicture } from '../../services/authService'

export default function StaffProfilePage({ setActiveNav }) {
  const { user, token, updateUser, logout } = useAuth()
  
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
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
    setProfileMsg({ type: '', text: '' })
    // Clear preview memory
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
      }, 2000)
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

  return (
    <>
      <div className="w-full max-w-[1050px] mx-auto px-4 py-6 md:px-0 md:py-0 pb-24 md:pb-0">
        
        {/* Header */}
        <div className="hidden md:flex justify-between items-center mb-8">
          <h1 className="font-serif text-[28px] font-bold text-maroon m-0">Profile</h1>
          <div className="text-[13px] text-text-sub font-medium flex items-center gap-2">
            <button onClick={() => setActiveNav('overview')} className="bg-transparent border-none p-0 text-maroon hover:underline cursor-pointer font-sans">Home</button>
            <span className="text-border-strong">›</span>
            <span>Profile</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-[24px] border border-border p-8 shadow-sm animate-fade-up">
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between pb-6 md:pb-8 mb-6 md:mb-8 border-b border-border gap-5 md:gap-0 w-full">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left w-full md:w-auto">
              <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full bg-maroon-light border-[3px] border-maroon-border flex items-center justify-center text-maroon text-[28px] md:text-[32px] font-bold overflow-hidden shadow-sm">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.first_name?.[0]?.toUpperCase() || 'S'
                )}
              </div>
              <div>
                <h2 className="font-serif text-[24px] font-bold text-text-main m-0 mb-2">
                  {user?.first_name} {user?.last_name}
                </h2>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-4 text-[13px] md:text-[14px] text-text-sub font-medium">
                  <span className="flex items-center gap-1.5"><IdCard size={16} className="text-gold" /> ID: {user?.staff_id || user?.id?.substring(0,8) || 'STAFF'}</span>
                  <span className="hidden md:inline-block w-1 h-1 rounded-full bg-border-strong" />
                  <span className="flex items-center gap-1.5"><Tag size={16} className="text-gold" /> {user?.role === 'admin' ? 'ADMIN' : 'STAFF'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleOpenEditModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-[14px] font-semibold text-text-main bg-white hover:bg-off-white hover:border-maroon-border hover:text-maroon transition-colors shadow-sm cursor-pointer w-full md:w-auto"
            >
              <Edit2 size={16} /> Edit
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
                {user?.email || 'staff@crmc.edu.ph'}
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
          
          {/* Security Card */}
          <div className="bg-white rounded-[24px] border border-border p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.1s' }}>
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

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isChangingPassword ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
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
          <div className="bg-white rounded-[24px] border border-border p-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.2s' }}>
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
          <div className="bg-white rounded-[24px] w-full max-w-[500px] shadow-2xl overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between p-6 border-b border-border bg-off-white">
              <h2 className="font-serif text-[22px] font-bold text-maroon m-0">Edit Profile</h2>
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
    </>
  )
}
