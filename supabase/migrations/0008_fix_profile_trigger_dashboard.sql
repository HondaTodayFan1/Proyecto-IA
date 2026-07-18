-- Fix de un defecto real en protect_profile_privileged_columns (0007):
--
-- El trigger revertía rol/activo cuando is_admin(auth.uid()) era falso, pero
-- no distinguía entre "usuario autenticado no-admin" (el caso que sí debe
-- bloquearse) y "sin sesión de usuario en absoluto" (auth.uid() = NULL),
-- que es exactamente lo que ocurre al editar desde el Table Editor/SQL
-- Editor del dashboard de Supabase o desde una Edge Function con
-- service_role. En ambos casos auth.uid() es NULL, is_admin(NULL) = false,
-- y el trigger revertía silenciosamente cualquier cambio de rol/activo hecho
-- desde el dashboard — bloqueando incluso la promoción manual del primer
-- admin, que es la única forma de arrancar el sistema.
--
-- Corrección: solo revertir rol/activo cuando SÍ hay un usuario autenticado
-- (auth.uid() is not null) y ese usuario no es admin. Sin sesión de usuario
-- (dashboard, SQL Editor, service_role, migraciones) pasa sin restricción,
-- que es el nivel de confianza correcto para esos contextos.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.rol := old.rol;
    new.activo := old.activo;
  end if;
  return new;
end;
$$;
