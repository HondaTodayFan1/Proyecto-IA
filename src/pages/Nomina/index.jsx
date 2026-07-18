import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTasas } from '../../services/bcvService'
import { createPeriodo, listPeriodos } from '../../services/nominaService'
import { PeriodoForm } from '../../components/nomina/PeriodoForm'

const ESTADO_LABEL = { borrador: 'Borrador', calculado: 'Calculado', cerrado: 'Cerrado' }

export default function Nomina() {
  const [periodos, setPeriodos] = useState([])
  const [tasas, setTasas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [periodosData, tasasData] = await Promise.all([listPeriodos(), listTasas()])
      setPeriodos(periodosData)
      setTasas(tasasData)
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

  async function handleCreate(values) {
    await createPeriodo(values)
    await refresh()
  }

  return (
    <div className="page">
      <h1>Periodos de nómina</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Nuevo periodo</h2>
        <PeriodoForm tasas={tasas} onSubmit={handleCreate} />
      </div>

      <h2>Listado</h2>
      {loading && <p className="text-muted">Cargando...</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && periodos.length === 0 && (
        <p className="text-muted">No hay periodos creados todavía.</p>
      )}
      {!loading && !error && periodos.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha inicio</th>
                <th>Fecha fin</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((periodo) => (
                <tr key={periodo.id}>
                  <td>{periodo.nombre}</td>
                  <td>{periodo.fecha_inicio}</td>
                  <td>{periodo.fecha_fin}</td>
                  <td>
                    <span className="badge">{ESTADO_LABEL[periodo.estado] ?? periodo.estado}</span>
                  </td>
                  <td>
                    <Link to={`/nomina/periodos/${periodo.id}`}>Ver</Link>
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
