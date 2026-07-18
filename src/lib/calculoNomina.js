export function calcularSalarioBs(salarioUsd, tasaBcv) {
  if (typeof salarioUsd !== 'number' || salarioUsd < 0) {
    throw new Error('salarioUsd debe ser un número mayor o igual a 0.')
  }
  if (typeof tasaBcv !== 'number' || tasaBcv <= 0) {
    throw new Error('tasaBcv es requerida y debe ser mayor a 0 (no hay tasa BCV disponible).')
  }
  return salarioUsd * tasaBcv
}

export function calcularNetoAPagar({ asignaciones, deducciones }) {
  const totalAsignaciones = asignaciones.reduce((sum, monto) => sum + monto, 0)
  const totalDeducciones = deducciones.reduce((sum, monto) => sum + monto, 0)
  return totalAsignaciones - totalDeducciones
}
