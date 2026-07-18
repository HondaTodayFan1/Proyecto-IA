function calcularDeduccion(salarioBs, porcentaje, nombreParametro) {
  if (salarioBs < 0) {
    throw new Error('salarioBs debe ser mayor o igual a 0.')
  }
  if (typeof porcentaje !== 'number' || porcentaje < 0) {
    throw new Error(`${nombreParametro} es requerido y debe ser un porcentaje mayor o igual a 0.`)
  }
  return salarioBs * porcentaje
}

export function calcularDeduccionIvss(salarioBs, porcentajeIvss) {
  return calcularDeduccion(salarioBs, porcentajeIvss, 'porcentajeIvss')
}

export function calcularDeduccionRpe(salarioBs, porcentajeRpe) {
  return calcularDeduccion(salarioBs, porcentajeRpe, 'porcentajeRpe')
}

export function calcularDeduccionFaov(salarioBs, porcentajeFaov) {
  return calcularDeduccion(salarioBs, porcentajeFaov, 'porcentajeFaov')
}
