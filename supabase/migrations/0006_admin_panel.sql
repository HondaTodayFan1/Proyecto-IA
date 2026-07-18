-- Fase 8: política RLS adicional para que admin pueda gestionar usuarios.
--
-- config_parametros_legales ya tiene su política de escritura solo-admin desde
-- la Fase 5 (0004_periodos_nomina.sql) — no se toca aquí. profiles solo tenía
-- "profiles_update_own" (Fase 1), que no permite a un admin cambiar el rol de
-- otro usuario; se agrega una política adicional (RLS combina políticas
-- permisivas del mismo comando con OR, no reemplaza la existente).

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
