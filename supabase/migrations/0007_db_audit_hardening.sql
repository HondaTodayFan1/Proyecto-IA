-- Auditoría de base de datos (2026-07-17) — ver PLAN_MAESTRO.md sección "Auditoría
-- de base de datos" para el detalle completo de cada hallazgo. Resumen de lo que
-- corrige esta migración:
--
-- 1. CRÍTICO: profiles permitía auto-escalación de privilegios (un usuario podía
--    hacer `update profiles set rol = 'admin' where id = auth.uid()` porque la
--    política "profiles_update_own" solo validaba la fila, no las columnas).
-- 2. RLS: nomina_detalle permitía reasignar empleado_id a un empleado ajeno en un
--    UPDATE (el INSERT sí lo validaba, el UPDATE no).
-- 3. FK: empleados.owner_id y periodos_nomina.creado_por tenían ON DELETE CASCADE
--    desde profiles — borrar un usuario borraría en cascada todo su histórico de
--    nómina. Se cambia a RESTRICT.
-- 4. Índices duplicados: nomina_detalle_periodo_id_idx y
--    prestaciones_sociales_empleado_id_idx son redundantes frente a los índices
--    que ya crean sus UNIQUE compuestos (btree usa el prefijo izquierdo).
-- 5. Índices faltantes en columnas FK: tasas_bcv.creado_por,
--    periodos_nomina.tasa_bcv_id, nomina_detalle.empleado_id,
--    prestaciones_sociales.periodo_id.
-- 6. Índice de periodos_nomina mejorado a compuesto (creado_por, created_at desc)
--    para cubrir el patrón real de listPeriodos() (filtro RLS + order by).
-- 7. Constraints faltantes: varias columnas numéricas sin CHECK >= 0, y
--    tasas_bcv sin exigir creado_por cuando origen = 'manual'.
-- 8. Integridad del flujo de negocio: periodos_nomina no impedía saltar de
--    'borrador' directo a 'cerrado' (evitando el cálculo) ni reabrir un periodo
--    'cerrado' vía una llamada REST directa que ignore la app.

-- 1) Protección contra auto-escalación de privilegios en profiles.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    new.rol := old.rol;
    new.activo := old.activo;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_columns();

-- 2) nomina_detalle: el UPDATE debe validar también la propiedad de empleado_id,
--    igual que ya hace el INSERT (si no, se puede reasignar la fila a un
--    empleado que no es del owner del periodo).
drop policy if exists "nomina_detalle_update_own_or_admin" on public.nomina_detalle;

create policy "nomina_detalle_update_own_or_admin"
  on public.nomina_detalle for update
  using (
    exists (
      select 1 from public.periodos_nomina p
      where p.id = periodo_id
        and (p.creado_por = auth.uid() or public.is_admin(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.periodos_nomina p
      where p.id = periodo_id
        and (p.creado_por = auth.uid() or public.is_admin(auth.uid()))
    )
    and exists (
      select 1 from public.empleados e
      where e.id = empleado_id
        and (e.owner_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

-- 3) FK hardening: no permitir que borrar un profile arrastre en cascada el
--    histórico de nómina. Fuerza a reasignar/archivar explícitamente en vez de
--    perder datos en silencio.
alter table public.empleados
  drop constraint if exists empleados_owner_id_fkey,
  add constraint empleados_owner_id_fkey
    foreign key (owner_id) references public.profiles (id) on delete restrict;

alter table public.periodos_nomina
  drop constraint if exists periodos_nomina_creado_por_fkey,
  add constraint periodos_nomina_creado_por_fkey
    foreign key (creado_por) references public.profiles (id) on delete restrict;

-- 4) Índices redundantes: ya cubiertos por el prefijo izquierdo de un UNIQUE
--    compuesto existente.
drop index if exists public.nomina_detalle_periodo_id_idx;
drop index if exists public.prestaciones_sociales_empleado_id_idx;

-- 5) Índices faltantes en columnas FK.
create index if not exists tasas_bcv_creado_por_idx on public.tasas_bcv (creado_por);
create index if not exists periodos_nomina_tasa_bcv_id_idx on public.periodos_nomina (tasa_bcv_id);
create index if not exists nomina_detalle_empleado_id_idx on public.nomina_detalle (empleado_id);
create index if not exists prestaciones_sociales_periodo_id_idx on public.prestaciones_sociales (periodo_id);

-- 6) Índice de periodos_nomina: compuesto para cubrir filtro RLS (creado_por) +
--    order by created_at desc (patrón real de listPeriodos()).
drop index if exists public.periodos_nomina_creado_por_idx;
create index if not exists periodos_nomina_creado_por_created_at_idx
  on public.periodos_nomina (creado_por, created_at desc);

-- 7) Constraints de no-negatividad faltantes.
alter table public.nomina_detalle
  add constraint nomina_detalle_horas_extra_check check (horas_extra >= 0),
  add constraint nomina_detalle_horas_nocturnas_check check (horas_nocturnas >= 0),
  add constraint nomina_detalle_dias_trabajados_check check (dias_trabajados >= 0),
  add constraint nomina_detalle_salario_base_bs_check check (salario_base_bs is null or salario_base_bs >= 0),
  add constraint nomina_detalle_bono_nocturno_bs_check check (bono_nocturno_bs is null or bono_nocturno_bs >= 0),
  add constraint nomina_detalle_bono_alimentacion_bs_check check (bono_alimentacion_bs is null or bono_alimentacion_bs >= 0),
  add constraint nomina_detalle_total_asignaciones_bs_check check (total_asignaciones_bs is null or total_asignaciones_bs >= 0),
  add constraint nomina_detalle_deduccion_ivss_bs_check check (deduccion_ivss_bs is null or deduccion_ivss_bs >= 0),
  add constraint nomina_detalle_deduccion_rpe_bs_check check (deduccion_rpe_bs is null or deduccion_rpe_bs >= 0),
  add constraint nomina_detalle_deduccion_faov_bs_check check (deduccion_faov_bs is null or deduccion_faov_bs >= 0),
  add constraint nomina_detalle_total_deducciones_bs_check check (total_deducciones_bs is null or total_deducciones_bs >= 0);

alter table public.prestaciones_sociales
  add constraint prestaciones_sociales_dias_acumulados_check check (dias_acumulados >= 0),
  add constraint prestaciones_sociales_monto_acumulado_bs_check check (monto_acumulado_bs >= 0);

alter table public.config_parametros_legales
  add constraint config_parametros_legales_valor_check check (valor >= 0);

alter table public.tasas_bcv
  add constraint tasas_bcv_manual_requires_creado_por
    check (origen = 'api' or (origen = 'manual' and creado_por is not null));

-- 8) Máquina de estados de periodos_nomina: no permitir saltar 'borrador' ->
--    'cerrado' directo (evitando el cálculo), ni modificar un periodo ya
--    'cerrado'. Complementa (no reemplaza) el guard ya existente en
--    nominaService.cerrarPeriodo — esto protege también contra llamadas REST
--    directas que ignoren la app.
create or replace function public.enforce_periodo_estado_transition()
returns trigger
language plpgsql
as $$
begin
  if old.estado = 'borrador' and new.estado = 'calculado' then
    return new;
  end if;

  if old.estado = 'calculado' and new.estado in ('borrador', 'cerrado') then
    return new;
  end if;

  raise exception 'Transición de estado de periodo inválida: % -> %', old.estado, new.estado;
end;
$$;

drop trigger if exists periodos_nomina_estado_transition on public.periodos_nomina;

create trigger periodos_nomina_estado_transition
  before update on public.periodos_nomina
  for each row
  when (old.estado is distinct from new.estado)
  execute function public.enforce_periodo_estado_transition();
