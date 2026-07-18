import { supabase } from './supabaseClient'

export async function listUsuarios() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre_completo, rol, activo, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function updateUsuario(id, { rol, activo }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ rol, activo })
    .eq('id', id)
    .select('id, nombre_completo, rol, activo, created_at')
    .single()

  if (error) throw error
  return data
}
