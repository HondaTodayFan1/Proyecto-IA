export function TasaBcvHistorialTable({ tasas }) {
  if (tasas.length === 0) {
    return <p className="text-muted">No hay tasas BCV registradas en el rango seleccionado.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tasa (Bs/USD)</th>
            <th>Origen</th>
          </tr>
        </thead>
        <tbody>
          {tasas.map((tasa) => (
            <tr key={tasa.id}>
              <td>{tasa.fecha}</td>
              <td>{tasa.tasa}</td>
              <td>
                <span className="badge">{tasa.origen}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
