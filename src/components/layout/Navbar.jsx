import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const linkClassName = ({ isActive }) => (isActive ? 'active' : undefined)

export function Navbar() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.rol === 'admin'

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">Calculadora de Nómina</span>
        <div className="navbar-links">
          <NavLink to="/dashboard" end className={linkClassName}>
            Dashboard
          </NavLink>
          <NavLink to="/empleados" className={linkClassName}>
            Empleados
          </NavLink>
          <NavLink to="/nomina" className={linkClassName}>
            Nómina
          </NavLink>
          <NavLink to="/reportes" className={linkClassName}>
            Reportes
          </NavLink>
          {isAdmin && (
            <NavLink to="/configuracion" className={linkClassName}>
              Configuración
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/usuarios" className={linkClassName}>
              Usuarios
            </NavLink>
          )}
          <button type="button" className="btn btn-small" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  )
}
