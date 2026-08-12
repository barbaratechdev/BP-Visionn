-- Região de atuação do supervisor. Usa o conjunto atual de estados onde a
-- empresa opera (Pará, Piauí, Maranhão — mesmo confirmado em
-- 20260812000000 pra pendencias.estado), não os dois valores antigos de
-- representantes.regiao (Pará/Piauí) — não mexemos em representantes.
-- Default 'Pará' só pra permitir a coluna ser not null sem quebrar linhas
-- já existentes; todo cadastro novo passa a exigir escolher a região.
alter table public.supervisores add column regiao text not null default 'Pará'
  check (regiao in ('Pará','Piauí','Maranhão'));

comment on column public.supervisores.regiao is 'Região de atuação do supervisor: Pará, Piauí ou Maranhão.';

create index supervisores_regiao_idx on public.supervisores(regiao);

-- supervisores_lista precisa devolver a coluna nova — não é campo sensível
-- (não entra no mascaramento de Demonstração, mesma lógica de cargo/status).
-- Postgres não deixa CREATE OR REPLACE mudar o retorno de uma função
-- RETURNS TABLE (a coluna "regiao" é nova), então recria do zero.
drop function if exists public.supervisores_lista();

create function public.supervisores_lista()
returns table (
  id uuid,
  nome text,
  cpf text,
  email text,
  telefone text,
  data_nascimento date,
  cargo text,
  regiao text,
  data_inicio date,
  data_fim date,
  status text,
  observacoes text,
  foto_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id, s.nome,
    case when public.is_demo() then null else s.cpf end,
    case when public.is_demo() then null else s.email end,
    case when public.is_demo() then null else s.telefone end,
    case when public.is_demo() then null else s.data_nascimento end,
    s.cargo, s.regiao, s.data_inicio, s.data_fim, s.status,
    case when public.is_demo() then null else s.observacoes end,
    s.foto_url, s.created_at, s.updated_at
  from public.supervisores s
  order by s.nome;
$$;

revoke all on function public.supervisores_lista() from public, anon;
grant execute on function public.supervisores_lista() to authenticated;