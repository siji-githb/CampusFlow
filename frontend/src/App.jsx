import { AuthProvider } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { ToastProvider } from './context/ToastContext'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </WebSocketProvider>
    </AuthProvider>
  )
}
