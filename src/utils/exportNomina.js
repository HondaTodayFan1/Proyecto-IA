const COLUMNAS = [
  'Empleado',
  'Cédula',
  'Salario base (Bs)',
  'Bono alimentación (Bs)',
  'Bono nocturno (Bs)',
  'Total deducciones (Bs)',
  'Neto a pagar (Bs)',
]

function filasReporte(detalle) {
  return detalle.map((fila) => [
    fila.empleados?.nombre_completo ?? '',
    fila.empleados?.cedula ?? '',
    fila.salario_base_bs ?? 0,
    fila.bono_alimentacion_bs ?? 0,
    fila.bono_nocturno_bs ?? 0,
    fila.total_deducciones_bs ?? 0,
    fila.neto_a_pagar_bs ?? 0,
  ])
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  link.click()
  URL.revokeObjectURL(url)
}

export function exportarReporteCsv(periodo, detalle) {
  const filas = filasReporte(detalle)
  const contenido = [COLUMNAS, ...filas]
    .map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  descargarBlob(blob, `nomina-${periodo.nombre}.csv`)
}

// jspdf/jspdf-autotable se cargan de forma diferida: son pesadas (arrastran
// html2canvas) y solo hacen falta cuando el analista realmente exporta un PDF,
// no en el bundle inicial de toda la app.
export async function exportarReportePdf(periodo, detalle) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()

  doc.text(`Reporte de nómina — ${periodo.nombre}`, 14, 16)
  doc.setFontSize(10)
  doc.text(`${periodo.fecha_inicio} al ${periodo.fecha_fin}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [COLUMNAS],
    body: filasReporte(detalle),
  })

  doc.save(`nomina-${periodo.nombre}.pdf`)
}
