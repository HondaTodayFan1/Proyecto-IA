import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReporteConsolidado, listPeriodosCalculados } from '../../services/reportesService'
import { ReporteConsolidadoTable } from '../../components/reportes/ReporteConsolidadoTable'
import { ExportPdfButton } from '../../components/reportes/ExportPdfButton'

export default function Reportes() {
  const [periodos, setPeriodos] = useState([])
  const [periodoId, setPeriodoId] = useState('')
  const [reporte, setReporte] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const selectId = useId()

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await listPeriodosCalculados()
        setPeriodos(data)
        if (data.length > 0) setPeriodoId(data[0].id)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function loadReporte() {
      if (!periodoId) {
        setReporte(null)
        return
      }
      setError('')
      try {
        const data = await getReporteConsolidado(periodoId)
        setReporte(data)
      } catch (err) {
        setError(err.message)
      }
    }
    loadReporte()
  }, [periodoId])

  return (
    <div className="page">
      <h1>Reporte consolidado de nómina</h1>
      <p>
        <Link to="/reportes/historial-bcv">Ver historial de tasas BCV →</Link>
      </p>

      {loading && <p className="text-muted">Cargando...</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {!loading && periodos.length === 0 && (
        <p className="text-muted">No hay periodos calculados o cerrados todavía. Calcula un periodo desde Nómina.</p>
      )}

      {!loading && periodos.length > 0 && (
        <div className="field" style={{ maxWidth: 360, marginBottom: 'var(--space-4)' }}>
          <label htmlFor={selectId}>Periodo</label>
          <select id={selectId} value={periodoId} onChange={(e) => setPeriodoId(e.target.value)}>
            {periodos.map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nombre} ({periodo.estado})
              </option>
            ))}
          </select>
        </div>
      )}

      {reporte && (
        <>
          <ExportPdfButton periodo={reporte.periodo} detalle={reporte.detalle} />
          <ReporteConsolidadoTable detalle={reporte.detalle} />
        </>
      )}
    </div>
  )
}
