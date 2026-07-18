import { supabase } from './supabaseClient'
import { calcularPrestacionesAcumuladas } from '../lib/calculoPrestaciones'

export async function listPrestacionesPorEmpleado(empleadoId) {
  const { data, error } = await supabase
    .from('prestaciones_sociales')
    .select('id, empleado_id, periodo_id, dias_acumulados, monto_acumulado_bs, tipo, created_at, periodos_nomina(nombre, fecha_inicio, fecha_fin)')
    .eq('empleado_id', empleadoId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Genera el registro de garantía de prestaciones sociales (Art. 142 LOTTT,
// ver src/lib/calculoPrestaciones.js) para cada empleado de un periodo recién
// cerrado. Los tipos 'vacaciones' y 'utilidades' quedan como valores válidos
// en el esquema pero su cálculo automático no está implementado en esta fase
// (fuera del alcance de la Fase 6 — no hay reglas confirmadas para ellos aún).
export async function generarPrestacionesParaPeriodo(periodoId) {
  const { data: periodo, error: periodoError } = await supabase
    .from('periodos_nomina')
    .select('id, fecha_inicio, fecha_fin')
    .eq('id', periodoId)
    .single()
  if (periodoError) throw periodoError

  const { data: parametrosRows, error: parametrosError } = await supabase
    .from('config_parametros_legales')
    .select('clave, valor')
  if (parametrosError) throw parametrosError
  const parametros = Object.fromEntries(parametrosRows.map((row) => [row.clave, row.valor]))

  const { data: detalle, error: detalleError } = await supabase
    .from('nomina_detalle')
    .select('empleado_id, salario_base_bs')
    .eq('periodo_id', periodoId)
  if (detalleError) throw detalleError

  const filas = detalle.map((fila) => {
    const { diasAcumulados, montoAcumuladoBs } = calcularPrestacionesAcumuladas(
      { salarioMensualBs: fila.salario_base_bs },
      { fechaInicio: periodo.fecha_inicio, fechaFin: periodo.fecha_fin },
      { diasGarantiaPorTrimestre: parametros.DIAS_GARANTIA_POR_TRIMESTRE }
    )

    return {
      empleado_id: fila.empleado_id,
      periodo_id: periodoId,
      dias_acumulados: diasAcumulados,
      monto_acumulado_bs: montoAcumuladoBs,
      tipo: 'garantia',
    }
  })

  if (filas.length === 0) return []

  const { data, error } = await supabase
    .from('prestaciones_sociales')
    .upsert(filas, { onConflict: 'empleado_id,periodo_id,tipo', ignoreDuplicates: true })
    .select()

  if (error) throw error
  return data
}
