export function ReporteConsolidadoTable({ detalle }) {
  if (detalle.length === 0) {
    return <p className="text-muted">Este periodo no tiene empleados en su detalle de nómina.</p>
  }

  const totalNeto = detalle.reduce((sum, fila) => sum + (fila.neto_a_pagar_bs ?? 0), 0)

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Cédula</th>
            <th>Salario base (Bs)</th>
            <th>Bono alimentación (Bs)</th>
            <th>Bono nocturno (Bs)</th>
            <th>Total deducciones (Bs)</th>
            <th>Neto a pagar (Bs)</th>
          </tr>
        </thead>
        <tbody>
          {detalle.map((fila) => (
            <tr key={fila.id}>
              <td>{fila.empleados?.nombre_completo}</td>
              <td>{fila.empleados?.cedula}</td>
              <td>{fila.salario_base_bs ?? '—'}</td>
              <td>{fila.bono_alimentacion_bs ?? '—'}</td>
              <td>{fila.bono_nocturno_bs ?? '—'}</td>
              <td>{fila.total_deducciones_bs ?? '—'}</td>
              <td>{fila.neto_a_pagar_bs ?? '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6}>
              <strong>Total neto</strong>
            </td>
            <td>
              <strong>{totalNeto.toFixed(2)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
