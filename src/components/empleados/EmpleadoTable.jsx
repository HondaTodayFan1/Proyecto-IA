import { Link } from 'react-router-dom'

export function EmpleadoTable({ empleados, onToggleActivo, onEdit }) {
  if (empleados.length === 0) {
    return <p className="text-muted">No hay empleados registrados todavía.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>Cargo</th>
            <th>Salario base (USD)</th>
            <th>Tipo nómina</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {empleados.map((empleado) => (
            <tr key={empleado.id}>
              <td>{empleado.nombre_completo}</td>
              <td>{empleado.cedula}</td>
              <td>{empleado.cargo}</td>
              <td>{empleado.salario_base_usd}</td>
              <td>{empleado.tipo_nomina}</td>
              <td>
                <span className="badge">{empleado.activo ? 'Activo' : 'Inactivo'}</span>
              </td>
              <td>
                <div className="actions">
                  <Link to={`/empleados/${empleado.id}`}>Ver</Link>
                  <button type="button" className="btn btn-small" onClick={() => onEdit(empleado)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => onToggleActivo(empleado.id, !empleado.activo)}
                  >
                    {empleado.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
