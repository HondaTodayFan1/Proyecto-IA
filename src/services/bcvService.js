import { supabase } from './supabaseClient'

const SELECT_COLUMNS = 'id, fecha, tasa, origen, creado_por, created_at'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export async function getTasaHoy() {
  const { data, error } = await supabase
    .from('tasas_bcv')
    .select(SELECT_COLUMNS)
    .eq('fecha', todayIso())
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getUltimaTasa() {
  const { data, error } = await supabase
    .from('tasas_bcv')
    .select(SELECT_COLUMNS)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listTasas(limit = 30) {
  const { data, error } = await supabase
    .from('tasas_bcv')
    .select(SELECT_COLUMNS)
    .order('fecha', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function createTasaManual(tasa) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { data, error } = await supabase
    .from('tasas_bcv')
    .insert({
      fecha: todayIso(),
      tasa,
      origen: 'manual',
      creado_por: userData.user.id,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) throw error
  return data
}
