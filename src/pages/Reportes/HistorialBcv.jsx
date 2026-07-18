import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHistorialTasasBcv } from '../../services/reportesService'
import { TasaBcvHistorialTable } from '../../components/bcv/TasaBcvHistorialTable'

export default function HistorialBcv() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tasas, setTasas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const desdeId = useId()
  const hastaId = useId()

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await getHistorialTasasBcv({ desde: desde || undefined, hasta: hasta || undefined })
        setTasas(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [desde, hasta])

  return (
    <div className="page page--medium">
      <p>
        <Link to="/reportes">← Volver a Reportes</Link>
      </p>
      <h1>Historial de tasas BCV</h1>

      <div className="field-row" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="field">
          <label htmlFor={desdeId}>Desde</label>
          <input id={desdeId} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={hastaId}>Hasta</label>
          <input id={hastaId} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      {loading && <p className="text-muted">Cargando...</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && <TasaBcvHistorialTable tasas={tasas} />}
    </div>
  )
}
