import { supabase } from './supabaseClient'
import { getPeriodo, listNominaDetalle, listPeriodos } from './nominaService'

export async function listPeriodosCalculados() {
  const periodos = await listPeriodos()
  return periodos.filter((p) => p.estado === 'calculado' || p.estado === 'cerrado')
}

export async function getReporteConsolidado(periodoId) {
  const [periodo, detalle] = await Promise.all([getPeriodo(periodoId), listNominaDetalle(periodoId)])
  return { periodo, detalle }
}

export async function getHistorialTasasBcv({ desde, hasta } = {}) {
  let query = supabase
    .from('tasas_bcv')
    .select('id, fecha, tasa, origen, creado_por, created_at')
    .order('fecha', { ascending: false })

  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)

  const { data, error } = await query
  if (error) throw error
  return data
}
