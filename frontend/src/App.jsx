import { AuthProvider } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppRouter />
      </WebSocketProvider>
    </AuthProvider>
  )
}
