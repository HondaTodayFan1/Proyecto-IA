const MS_POR_DIA = 1000 * 60 * 60 * 24

function diasEntre(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  const dias = Math.round((fin - inicio) / MS_POR_DIA) + 1
  if (Number.isNaN(dias) || dias <= 0) {
    throw new Error('fechaInicio y fechaFin del periodo son inválidas.')
  }
  return dias
}

// Simplificación de la garantía de prestaciones sociales (Art. 142 LOTTT):
// 15 días de salario integral por cada trimestre completado, prorrateado por
// los días del periodo liquidado. No contempla aún antigüedad especial ni topes —
// pendiente de verificación profesional antes de usarse en producción.
export function calcularPrestacionesAcumuladas(empleado, periodo, parametrosLegales) {
  const { salarioMensualBs } = empleado
  const { fechaInicio, fechaFin } = periodo
  const { diasGarantiaPorTrimestre } = parametrosLegales

  if (salarioMensualBs < 0) {
    throw new Error('salarioMensualBs debe ser mayor o igual a 0.')
  }
  if (typeof diasGarantiaPorTrimestre !== 'number' || diasGarantiaPorTrimestre <= 0) {
    throw new Error('diasGarantiaPorTrimestre es requerido y debe ser mayor a 0.')
  }

  const dias = diasEntre(fechaInicio, fechaFin)
  const salarioDiarioIntegral = salarioMensualBs / 30
  const diasAcumulados = (dias / 90) * diasGarantiaPorTrimestre
  const montoAcumuladoBs = diasAcumulados * salarioDiarioIntegral

  return { diasAcumulados, montoAcumuladoBs }
}
