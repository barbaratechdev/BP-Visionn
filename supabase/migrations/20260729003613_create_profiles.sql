-- Função utilitária: mantém "updated_at" sempre atualizado em qualquer tabela que a use.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: dados de perfil de cada usuário do sistema.
-- Complementa auth.users (que guarda e-mail/senha) com os campos que a
-- aplicação já usa hoje: nome, cargo, setor, avatar e status de presença.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'func' check (role in ('admin','func')),
  setor text not null default '—',
  initials text,
  color text default '#2563EB',
  photo_url text,
  status text not null default 'offline' check (status in ('online','away','offline')),
  last_access timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuário do BP-Visionn (1:1 com auth.users).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile quando uma conta é criada no Supabase Auth,
-- evitando que a aplicação precise gerenciar essa sincronização manualmente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
