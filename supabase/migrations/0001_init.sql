-- Fase 1: tabla profiles + trigger de autocreación al registrar usuario

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text,
  rol text not null default 'usuario' check (rol in ('admin', 'usuario')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'admin'
    )
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Trigger: al crear un usuario en auth.users, crea su fila en profiles con rol 'usuario'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre_completo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', ''),
    'usuario'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
