import { useCallback, useEffect, useState } from 'react'
import {
  createEmpleado,
  listEmpleados,
  setEmpleadoActivo,
  updateEmpleado,
} from '../services/empleadosService'

export function useEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listEmpleados()
      setEmpleados(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function load() {
      await refresh()
    }

    load()
  }, [refresh])

  async function addEmpleado(empleado) {
    const created = await createEmpleado(empleado)
    setEmpleados((prev) => [...prev, created].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)))
    return created
  }

  async function editEmpleado(id, changes) {
    const updated = await updateEmpleado(id, changes)
    setEmpleados((prev) => prev.map((e) => (e.id === id ? updated : e)))
    return updated
  }

  async function toggleActivo(id, activo) {
    const updated = await setEmpleadoActivo(id, activo)
    setEmpleados((prev) => prev.map((e) => (e.id === id ? updated : e)))
    return updated
  }

  return { empleados, loading, error, refresh, addEmpleado, editEmpleado, toggleActivo }
}
