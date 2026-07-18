import { NovedadesForm } from './NovedadesForm'

export function NominaTable({ detalle, editable, onGuardarNovedades }) {
  if (detalle.length === 0) {
    return <p className="text-muted">Este periodo no tiene empleados activos asociados.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Novedades</th>
            <th>Salario base (Bs)</th>
            <th>Bono alimentación (Bs)</th>
            <th>Bono nocturno (Bs)</th>
            <th>Deducciones (Bs)</th>
            <th>Neto a pagar (Bs)</th>
          </tr>
        </thead>
        <tbody>
          {detalle.map((fila) => (
            <tr key={fila.id}>
              <td>{fila.empleados?.nombre_completo}</td>
              <td>
                <NovedadesForm fila={fila} disabled={!editable} onSave={onGuardarNovedades} />
              </td>
              <td>{fila.salario_base_bs ?? '—'}</td>
              <td>{fila.bono_alimentacion_bs ?? '—'}</td>
              <td>{fila.bono_nocturno_bs ?? '—'}</td>
              <td>{fila.total_deducciones_bs ?? '—'}</td>
              <td>{fila.neto_a_pagar_bs ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
