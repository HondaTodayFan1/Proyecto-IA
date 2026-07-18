export function calcularBonoAlimentacion(diasTrabajados, montoCestaTicket) {
  if (diasTrabajados < 0 || montoCestaTicket < 0) {
    throw new Error('diasTrabajados y montoCestaTicket deben ser mayores o iguales a 0.')
  }
  return diasTrabajados * montoCestaTicket
}

// Recargo nocturno (Art. 156 LOTTT): monto adicional sobre el salario de esas horas.
export function calcularBonoNocturno(horasNocturnas, salarioHoraBs, recargoNocturno) {
  if (horasNocturnas < 0 || salarioHoraBs < 0) {
    throw new Error('horasNocturnas y salarioHoraBs deben ser mayores o iguales a 0.')
  }
  return horasNocturnas * salarioHoraBs * recargoNocturno
}

// Hora extra (Art. 118 LOTTT): pago total de la hora (base + recargo), no solo el recargo.
export function calcularHorasExtra(horas, salarioHoraBs, recargo) {
  if (horas < 0 || salarioHoraBs < 0) {
    throw new Error('horas y salarioHoraBs deben ser mayores o iguales a 0.')
  }
  return horas * salarioHoraBs * (1 + recargo)
}
