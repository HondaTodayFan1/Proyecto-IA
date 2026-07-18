export function TasaBcvBadge({ tasaHoy, ultimaTasa, loading }) {
  if (loading) return <p className="text-muted">Consultando tasa BCV...</p>

  if (tasaHoy) {
    return (
      <p>
        Tasa BCV de hoy ({tasaHoy.fecha}): <strong>{tasaHoy.tasa} Bs/USD</strong>{' '}
        <span className="badge">{tasaHoy.origen === 'api' ? 'automática' : 'manual'}</span>
      </p>
    )
  }

  if (ultimaTasa) {
    return (
      <p className="alert alert-warning" role="status">
        No hay tasa BCV registrada hoy. Última disponible ({ultimaTasa.fecha}):{' '}
        <strong>{ultimaTasa.tasa} Bs/USD</strong>
      </p>
    )
  }

  return (
    <p className="alert alert-warning" role="status">
      No hay ninguna tasa BCV registrada todavía.
    </p>
  )
}
