import { useEffect, useState } from 'react'
import { listUsuarios, updateUsuario } from '../../services/usuariosService'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await listUsuarios()
        setUsuarios(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleCambiarRol(usuario, rol) {
    if (rol === 'admin' && !window.confirm(`¿Dar permisos de administrador a "${usuario.nombre_completo || usuario.id}"?`)) {
      return
    }

    setError('')
    try {
      const actualizado = await updateUsuario(usuario.id, { rol, activo: usuario.activo })
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? actualizado : u)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleActivo(usuario) {
    setError('')
    try {
      const actualizado = await updateUsuario(usuario.id, { rol: usuario.rol, activo: !usuario.activo })
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? actualizado : u)))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page page--medium">
      <h1>Usuarios</h1>

      {loading && <p className="text-muted">Cargando...</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nombre_completo || '—'}</td>
                  <td>
                    <select
                      aria-label={`Rol de ${usuario.nombre_completo || usuario.id}`}
                      value={usuario.rol}
                      onChange={(e) => handleCambiarRol(usuario, e.target.value)}
                    >
                      <option value="usuario">usuario</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <span className="badge">{usuario.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-small" onClick={() => handleToggleActivo(usuario)}>
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
