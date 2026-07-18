import { supabase } from './supabaseClient'
import { listEmpleados } from './empleadosService'
import { calcularBonoAlimentacion, calcularBonoNocturno, calcularHorasExtra } from '../lib/calculoBonos'
import {
  calcularDeduccionFaov,
  calcularDeduccionIvss,
  calcularDeduccionRpe,
} from '../lib/calculoDeducciones'
import { calcularNetoAPagar, calcularSalarioBs } from '../lib/calculoNomina'
import { generarPrestacionesParaPeriodo } from './prestacionesService'

const DETALLE_COLUMNS =
  'id, periodo_id, empleado_id, salario_base_usd, salario_base_bs, horas_extra, horas_nocturnas, dias_trabajados, bono_nocturno_bs, bono_alimentacion_bs, total_asignaciones_bs, deduccion_ivss_bs, deduccion_rpe_bs, deduccion_faov_bs, total_deducciones_bs, neto_a_pagar_bs, created_at, updated_at, empleados(nombre_completo, cedula, tipo_nomina)'

export async function listPeriodos() {
  const { data, error } = await supabase
    .from('periodos_nomina')
    .select('id, nombre, fecha_inicio, fecha_fin, tasa_bcv_id, estado, creado_por, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getPeriodo(id) {
  const { data, error } = await supabase
    .from('periodos_nomina')
    .select('id, nombre, fecha_inicio, fecha_fin, tasa_bcv_id, estado, creado_por, created_at, tasas_bcv(fecha, tasa)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function listNominaDetalle(periodoId) {
  const { data, error } = await supabase
    .from('nomina_detalle')
    .select(DETALLE_COLUMNS)
    .eq('periodo_id', periodoId)

  if (error) throw error
  return data
}

export async function getParametrosLegales() {
  const { data, error } = await supabase.from('config_parametros_legales').select('clave, valor')
  if (error) throw error

  return Object.fromEntries(data.map((row) => [row.clave, row.valor]))
}

function diasPorDefecto(tipoNomina) {
  return tipoNomina === 'quincenal' ? 15 : 30
}

function sumar(montos) {
  return montos.reduce((total, monto) => total + monto, 0)
}

export async function createPeriodo({ nombre, fecha_inicio, fecha_fin, tasa_bcv_id }) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { data: periodo, error: periodoError } = await supabase
    .from('periodos_nomina')
    .insert({ nombre, fecha_inicio, fecha_fin, tasa_bcv_id, creado_por: userData.user.id })
    .select('id, nombre, fecha_inicio, fecha_fin, tasa_bcv_id, estado, creado_por, created_at')
    .single()

  if (periodoError) throw periodoError

  const empleados = await listEmpleados()
  const empleadosActivos = empleados.filter((e) => e.activo)

  if (empleadosActivos.length > 0) {
    const filas = empleadosActivos.map((empleado) => ({
      periodo_id: periodo.id,
      empleado_id: empleado.id,
      salario_base_usd: empleado.salario_base_usd,
      dias_trabajados: diasPorDefecto(empleado.tipo_nomina),
    }))

    const { error: detalleError } = await supabase.from('nomina_detalle').insert(filas)
    if (detalleError) throw detalleError
  }

  return periodo
}

export async function updateNovedades(detalleId, { horas_extra, horas_nocturnas, dias_trabajados }) {
  const { data, error } = await supabase
    .from('nomina_detalle')
    .update({ horas_extra, horas_nocturnas, dias_trabajados })
    .eq('id', detalleId)
    .select(DETALLE_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function calcularPeriodo(periodoId) {
  const periodo = await getPeriodo(periodoId)
  const tasaBcv = periodo.tasas_bcv?.tasa
  if (!tasaBcv) {
    throw new Error('El periodo no tiene una tasa BCV asociada.')
  }

  const parametros = await getParametrosLegales()
  const detalle = await listNominaDetalle(periodoId)

  const filasCalculadas = detalle.map((fila) => {
    const salarioBaseBs = calcularSalarioBs(fila.salario_base_usd, tasaBcv)
    const salarioHoraBs = salarioBaseBs / (30 * 8)

    const bonoAlimentacionBs = calcularBonoAlimentacion(
      fila.dias_trabajados,
      parametros.CESTA_TICKET_BS
    )
    const bonoNocturnoBs = calcularBonoNocturno(
      fila.horas_nocturnas,
      salarioHoraBs,
      parametros.RECARGO_BONO_NOCTURNO
    )
    const horasExtraBs = calcularHorasExtra(
      fila.horas_extra,
      salarioHoraBs,
      parametros.RECARGO_HORA_EXTRA
    )

    const totalAsignacionesBs = sumar([salarioBaseBs, bonoAlimentacionBs, bonoNocturnoBs, horasExtraBs])

    const deduccionIvssBs = calcularDeduccionIvss(salarioBaseBs, parametros.PORCENTAJE_IVSS)
    const deduccionRpeBs = calcularDeduccionRpe(salarioBaseBs, parametros.PORCENTAJE_RPE)
    const deduccionFaovBs = calcularDeduccionFaov(salarioBaseBs, parametros.PORCENTAJE_FAOV)

    const totalDeduccionesBs = sumar([deduccionIvssBs, deduccionRpeBs, deduccionFaovBs])

    const netoAPagarBs = calcularNetoAPagar({
      asignaciones: [totalAsignacionesBs],
      deducciones: [totalDeduccionesBs],
    })

    return {
      // Se incluyen las columnas not-null existentes (no solo las calculadas):
      // upsert() hace INSERT ... ON CONFLICT DO UPDATE, y Postgres exige valores
      // válidos para las columnas not-null del intento de INSERT aunque termine
      // en UPDATE. Omitirlas aplicaría sus DEFAULT (ej. horas_extra = 0),
      // borrando las novedades ya cargadas por el analista.
      id: fila.id,
      periodo_id: fila.periodo_id,
      empleado_id: fila.empleado_id,
      salario_base_usd: fila.salario_base_usd,
      horas_extra: fila.horas_extra,
      horas_nocturnas: fila.horas_nocturnas,
      dias_trabajados: fila.dias_trabajados,
      salario_base_bs: salarioBaseBs,
      bono_alimentacion_bs: bonoAlimentacionBs,
      bono_nocturno_bs: bonoNocturnoBs,
      total_asignaciones_bs: totalAsignacionesBs,
      deduccion_ivss_bs: deduccionIvssBs,
      deduccion_rpe_bs: deduccionRpeBs,
      deduccion_faov_bs: deduccionFaovBs,
      total_deducciones_bs: totalDeduccionesBs,
      neto_a_pagar_bs: netoAPagarBs,
    }
  })

  if (filasCalculadas.length > 0) {
    const { error: upsertError } = await supabase
      .from('nomina_detalle')
      .upsert(filasCalculadas, { onConflict: 'id' })
    if (upsertError) throw upsertError
  }

  const { error: estadoError } = await supabase
    .from('periodos_nomina')
    .update({ estado: 'calculado' })
    .eq('id', periodoId)

  if (estadoError) throw estadoError

  return listNominaDetalle(periodoId)
}

export async function cerrarPeriodo(periodoId) {
  const { data, error } = await supabase
    .from('periodos_nomina')
    .update({ estado: 'cerrado' })
    .eq('id', periodoId)
    .eq('estado', 'calculado')
    .select('id, nombre, fecha_inicio, fecha_fin, tasa_bcv_id, estado, creado_por, created_at')
    .single()

  if (error) throw error

  await generarPrestacionesParaPeriodo(periodoId)

  return data
}
