import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEmpleado } from '../../services/empleadosService'
import { listPrestacionesPorEmpleado } from '../../services/prestacionesService'
import { EmpleadoDetalle } from '../../components/empleados/EmpleadoDetalle'

export default function Detalle() {
  const { id } = useParams()
  const [empleado, setEmpleado] = useState(null)
  const [prestaciones, setPrestaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [empleadoData, prestacionesData] = await Promise.all([
          getEmpleado(id),
          listPrestacionesPorEmpleado(id),
        ])
        setEmpleado(empleadoData)
        setPrestaciones(prestacionesData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <div className="page">
      <p>
        <Link to="/empleados">← Volver a Empleados</Link>
      </p>

      {loading && <p className="text-muted">Cargando...</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && empleado && (
        <EmpleadoDetalle empleado={empleado} prestaciones={prestaciones} />
      )}
    </div>
  )
}
