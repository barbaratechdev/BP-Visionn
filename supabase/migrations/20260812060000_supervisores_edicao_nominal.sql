-- Libera incluir/editar em public.supervisores pra Esmeralda, Ana e Paulo
-- (nome do profile), sem torná-los admin. Critério nominal porque não existe
-- (ainda) controle de acesso por pessoa no sistema — mesmo padrão já usado
-- na aba Supervisores do frontend (ver App.tsx: isSupervisoresExtra/
-- podeEditarSupervisores). \y = fronteira de palavra no regex do Postgres
-- (\b é backspace aqui, não funciona como em outros motores), evita casar
-- "Mariana"/"Carolina" etc.
create or replace function public.pode_editar_supervisores()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and name ~* '\y(esmeralda|ana|paulo)\y'
  );
$$;

-- insert/update: passam a aceitar admin OU Esmeralda/Ana.
alter policy "supervisores_insert_admin"
  on public.supervisores
  with check (public.is_admin() or public.pode_editar_supervisores());

alter policy "supervisores_update_admin"
  on public.supervisores
  using (public.is_admin() or public.pode_editar_supervisores())
  with check (public.is_admin() or public.pode_editar_supervisores());

-- Mas desativar (status -> 'Inativo', ou reativar) continua exclusivo de
-- admin: como insert/update usam a mesma policy pra qualquer coluna, sem
-- este gatilho Esmeralda/Ana também poderiam desativar via update comum
-- (o frontend só esconde o botão — RLS de tabela não distingue coluna).
create or replace function public.proteger_supervisores_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.status is distinct from old.status then
    raise exception 'Apenas a Supervisora pode ativar/desativar um supervisor.';
  end if;
  return new;
end;
$$;

create trigger supervisores_protect_status
  before update on public.supervisores
  for each row execute function public.proteger_supervisores_status();
