import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Empleados from '../pages/Empleados'
import EmpleadoDetallePage from '../pages/Empleados/Detalle'
import Nomina from '../pages/Nomina'
import Periodo from '../pages/Nomina/Periodo'
import Reportes from '../pages/Reportes'
import HistorialBcv from '../pages/Reportes/HistorialBcv'
import Configuracion from '../pages/Configuracion'
import Usuarios from '../pages/Usuarios'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empleados"
        element={
          <ProtectedRoute>
            <Empleados />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empleados/:id"
        element={
          <ProtectedRoute>
            <EmpleadoDetallePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nomina"
        element={
          <ProtectedRoute>
            <Nomina />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nomina/periodos/:id"
        element={
          <ProtectedRoute>
            <Periodo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <Reportes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes/historial-bcv"
        element={
          <ProtectedRoute>
            <HistorialBcv />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute requireAdmin>
            <Configuracion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requireAdmin>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
