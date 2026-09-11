import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import StudentLayout from '../../components/layout/StudentLayout'
import StudentDashboard from './StudentDashboard'
import BookAppointment from './BookAppointment'
import MyAppointments from './MyAppointments'
import MyQueue from './MyQueue'
import StudentProfile from './StudentProfile'

const TAB_CONFIG = {
  dashboard: { title: null, activeNav: 'home', backTo: null },
  book: { title: 'Book Appointment', activeNav: 'book', backTo: null },
  appointments: { title: 'My Appointments', activeNav: 'appointments', backTo: null },
  queue: { title: 'My Queue', activeNav: 'queue', backTo: null },
  profile: { title: 'Profile', activeNav: '', backTo: '/student/dashboard' },
}

export default function StudentPortalShell() {
  const location = useLocation()

  const currentTab = useMemo(() => {
    const p = location.pathname.toLowerCase()
    if (p.includes('/student/book')) return 'book'
    if (p.includes('/student/appointments')) return 'appointments'
    if (p.includes('/student/queue')) return 'queue'
    if (p.includes('/student/profile') || p.includes('/student/settings')) return 'profile'
    return 'dashboard'
  }, [location.pathname])

  const [prevTab, setPrevTab] = useState(currentTab)
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([currentTab]))

  if (currentTab !== prevTab) {
    setPrevTab(currentTab)
    setVisitedTabs(new Set([...visitedTabs, currentTab]))
  }

  const currentConfig = TAB_CONFIG[currentTab] || TAB_CONFIG.dashboard

  return (
    <StudentLayout 
      activeTab={currentConfig.activeNav} 
      mobileTitle={currentConfig.title} 
      backTo={currentConfig.backTo}
    >
      {visitedTabs.has('dashboard') && (
        <div className={currentTab === 'dashboard' ? 'block w-full animate-fade-up' : 'hidden'}>
          <StudentDashboard embedded={true} />
        </div>
      )}

      {visitedTabs.has('book') && (
        <div className={currentTab === 'book' ? 'block w-full animate-fade-up' : 'hidden'}>
          <BookAppointment embedded={true} />
        </div>
      )}

      {visitedTabs.has('appointments') && (
        <div className={currentTab === 'appointments' ? 'block w-full animate-fade-up' : 'hidden'}>
          <MyAppointments embedded={true} />
        </div>
      )}

      {visitedTabs.has('queue') && (
        <div className={currentTab === 'queue' ? 'block w-full animate-fade-up' : 'hidden'}>
          <MyQueue embedded={true} />
        </div>
      )}

      {visitedTabs.has('profile') && (
        <div className={currentTab === 'profile' ? 'block w-full animate-fade-up' : 'hidden'}>
          <StudentProfile embedded={true} />
        </div>
      )}
    </StudentLayout>
  )
}
