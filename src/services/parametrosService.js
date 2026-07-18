import { supabase } from './supabaseClient'

export async function listParametros() {
  const { data, error } = await supabase
    .from('config_parametros_legales')
    .select('clave, valor, vigente_desde')
    .order('clave', { ascending: true })

  if (error) throw error
  return data
}

export async function updateParametro(clave, valor) {
  const { data, error } = await supabase
    .from('config_parametros_legales')
    .update({ valor, vigente_desde: new Date().toISOString().slice(0, 10) })
    .eq('clave', clave)
    .select('clave, valor, vigente_desde')
    .single()

  if (error) throw error
  return data
}
