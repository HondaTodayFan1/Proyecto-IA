import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Navbar } from './Navbar'

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { session, rol, loading, profileLoading } = useAuth()

  if (loading) return <p className="page text-muted">Cargando...</p>
  if (!session) return <Navigate to="/login" replace />
  if (requireAdmin) {
    if (profileLoading) return <p className="page text-muted">Cargando...</p>
    if (rol !== 'admin') return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
