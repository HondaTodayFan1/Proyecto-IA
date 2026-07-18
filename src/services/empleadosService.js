import { supabase } from './supabaseClient'

const SELECT_COLUMNS =
  'id, owner_id, nombre_completo, cedula, cargo, fecha_ingreso, salario_base_usd, tipo_nomina, activo, created_at, updated_at'

export async function listEmpleados() {
  const { data, error } = await supabase
    .from('empleados')
    .select(SELECT_COLUMNS)
    .order('nombre_completo', { ascending: true })

  if (error) throw error
  return data
}

export async function getEmpleado(id) {
  const { data, error } = await supabase
    .from('empleados')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createEmpleado(empleado) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { data, error } = await supabase
    .from('empleados')
    .insert({ ...empleado, owner_id: userData.user.id })
    .select(SELECT_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function updateEmpleado(id, changes) {
  const { data, error } = await supabase
    .from('empleados')
    .update(changes)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function setEmpleadoActivo(id, activo) {
  return updateEmpleado(id, { activo })
}
