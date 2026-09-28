import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage     from './pages/LoginPage'
import AppShell      from './components/AppShell'
import Dashboard     from './pages/Dashboard'
import NewEntry      from './pages/NewEntry'
import MyEntries     from './pages/MyEntries'
import CollectedPage from './pages/CollectedPage'
import AllEntries    from './pages/AllEntries'
import ActivityLog   from './pages/ActivityLog'
import AdminPanel    from './pages/AdminPanel'

function Guard({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Guard><AppShell /></Guard>}>
            <Route index        element={<Dashboard />} />
            <Route path="new"       element={<NewEntry />} />
            <Route path="mine"      element={<MyEntries />} />
            <Route path="collected" element={<CollectedPage />} />
            <Route path="all"       element={<Guard adminOnly><AllEntries /></Guard>} />
            <Route path="log"       element={<Guard adminOnly><ActivityLog /></Guard>} />
            <Route path="admin"     element={<Guard adminOnly><AdminPanel /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
