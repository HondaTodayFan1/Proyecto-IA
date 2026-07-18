-- Fix: "infinite recursion detected in policy for relation profiles".
--
-- profiles_select_own_or_admin (0001_init.sql) se escribió antes de que
-- existiera public.is_admin() (introducida en 0002_empleados.sql) y usaba un
-- EXISTS(select ... from public.profiles ...) inline. Esa subconsulta vuelve
-- a activar la misma política RLS de profiles sobre sí misma -> recursión
-- infinita, detectada y abortada por Postgres. is_admin() evita esto porque
-- es SECURITY DEFINER (bypassa RLS en su consulta interna) — se usa en todas
-- las políticas escritas después de la Fase 1, pero esta, la primera y más
-- crítica (permite leer el propio perfil), se quedó con el patrón inseguro.

drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin(auth.uid())
  );
