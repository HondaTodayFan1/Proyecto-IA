export function ResumenPeriodo({ detalle }) {
  const calculado = detalle.every((fila) => fila.neto_a_pagar_bs !== null)
  if (!calculado || detalle.length === 0) return null

  const totalAsignaciones = detalle.reduce((sum, fila) => sum + (fila.total_asignaciones_bs ?? 0), 0)
  const totalDeducciones = detalle.reduce((sum, fila) => sum + (fila.total_deducciones_bs ?? 0), 0)
  const totalNeto = detalle.reduce((sum, fila) => sum + (fila.neto_a_pagar_bs ?? 0), 0)

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Resumen del periodo</h3>
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <dt className="text-muted">Empleados</dt>
          <dd>{detalle.length}</dd>
        </div>
        <div>
          <dt className="text-muted">Total asignaciones</dt>
          <dd>{totalAsignaciones.toFixed(2)} Bs</dd>
        </div>
        <div>
          <dt className="text-muted">Total deducciones</dt>
          <dd>{totalDeducciones.toFixed(2)} Bs</dd>
        </div>
        <div>
          <dt className="text-muted">Total neto a pagar</dt>
          <dd>
            <strong>{totalNeto.toFixed(2)} Bs</strong>
          </dd>
        </div>
      </dl>
    </div>
  )
}
