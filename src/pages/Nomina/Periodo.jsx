import { Link, useParams } from 'react-router-dom'
import { useNominaPeriodo } from '../../hooks/useNominaPeriodo'
import { NominaTable } from '../../components/nomina/NominaTable'
import { ResumenPeriodo } from '../../components/nomina/ResumenPeriodo'

const ESTADO_LABEL = { borrador: 'Borrador', calculado: 'Calculado', cerrado: 'Cerrado' }

export default function Periodo() {
  const { id } = useParams()
  const { periodo, detalle, loading, error, processing, guardarNovedades, calcular, cerrar } =
    useNominaPeriodo(id)

  if (loading) return <p className="page text-muted">Cargando...</p>
  if (error)
    return (
      <p className="page alert alert-error" role="alert">
        {error}
      </p>
    )
  if (!periodo) return <p className="page text-muted">Periodo no encontrado.</p>

  const editable = periodo.estado === 'borrador'

  async function handleCerrar() {
    if (window.confirm('¿Cerrar este periodo? Ya no se podrán editar sus novedades.')) {
      await cerrar()
    }
  }

  return (
    <div className="page">
      <p>
        <Link to="/nomina">← Volver a periodos</Link>
      </p>
      <h1>{periodo.nombre}</h1>
      <p className="text-muted">
        {periodo.fecha_inicio} — {periodo.fecha_fin} ·{' '}
        <span className="badge">{ESTADO_LABEL[periodo.estado] ?? periodo.estado}</span> · Tasa BCV:{' '}
        {periodo.tasas_bcv?.tasa} Bs/USD ({periodo.tasas_bcv?.fecha})
      </p>

      <NominaTable detalle={detalle} editable={editable} onGuardarNovedades={guardarNovedades} />

      <div className="actions" style={{ marginBottom: 'var(--space-4)' }}>
        {editable && (
          <button type="button" className="btn btn-primary" onClick={calcular} disabled={processing}>
            {processing ? 'Calculando...' : 'Calcular periodo'}
          </button>
        )}
        {periodo.estado === 'calculado' && (
          <button type="button" className="btn btn-primary" onClick={handleCerrar} disabled={processing}>
            {processing ? 'Cerrando...' : 'Cerrar periodo'}
          </button>
        )}
      </div>

      <ResumenPeriodo detalle={detalle} />
    </div>
  )
}
