import { exportarReporteCsv, exportarReportePdf } from '../../utils/exportNomina'

export function ExportPdfButton({ periodo, detalle }) {
  return (
    <div className="actions" style={{ marginBottom: 'var(--space-4)' }}>
      <button type="button" className="btn btn-primary" onClick={() => exportarReportePdf(periodo, detalle)}>
        Descargar PDF
      </button>
      <button type="button" className="btn" onClick={() => exportarReporteCsv(periodo, detalle)}>
        Descargar CSV
      </button>
    </div>
  )
}
