export function EmpleadoDetalle({ empleado, prestaciones }) {
  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{empleado.nombre_completo}</h2>
        <span className="badge">{empleado.activo ? 'Activo' : 'Inactivo'}</span>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-4)',
          }}
        >
          <div>
            <dt className="text-muted">Cédula</dt>
            <dd>{empleado.cedula}</dd>
          </div>
          <div>
            <dt className="text-muted">Cargo</dt>
            <dd>{empleado.cargo || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Salario base</dt>
            <dd>{empleado.salario_base_usd} USD</dd>
          </div>
          <div>
            <dt className="text-muted">Tipo de nómina</dt>
            <dd>{empleado.tipo_nomina}</dd>
          </div>
        </dl>
      </div>

      <h3>Prestaciones sociales acumuladas</h3>
      {prestaciones.length === 0 ? (
        <p className="text-muted">
          Todavía no hay prestaciones acumuladas (se generan al cerrar un periodo de nómina).
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Tipo</th>
                <th>Días acumulados</th>
                <th>Monto acumulado (Bs)</th>
              </tr>
            </thead>
            <tbody>
              {prestaciones.map((registro) => (
                <tr key={registro.id}>
                  <td>{registro.periodos_nomina?.nombre}</td>
                  <td>{registro.tipo}</td>
                  <td>{registro.dias_acumulados.toFixed(2)}</td>
                  <td>{registro.monto_acumulado_bs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
