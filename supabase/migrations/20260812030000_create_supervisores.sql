-- Supervisores: cadastro de pessoas da estrutura do CRM, separado de
-- "representantes" (representante comercial, com CPF/CNPJ, região e
-- vínculo/contrato próprios — não mexido aqui) e separado de "profiles"
-- (contas de LOGIN do sistema; profiles.role='admin' já é rotulado
-- "Supervisora" na interface, mas é acesso, não cadastro de pessoa).
-- De propósito, supervisores.id não referencia profiles(id): esta versão
-- não vincula supervisor a uma conta de autenticação.
create table public.supervisores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  email text,
  telefone text,
  data_nascimento date,
  cargo text,
  data_inicio date not null default current_date,
  data_fim date,
  status text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  observacoes text,
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supervisores_fim_apos_inicio check (data_fim is null or data_fim >= data_inicio)
);

comment on table public.supervisores is 'Cadastro de supervisores da empresa — pessoa na estrutura do CRM, não é conta de login.';

create index supervisores_status_idx on public.supervisores(status);
create index supervisores_nome_idx on public.supervisores(nome);

create trigger supervisores_set_updated_at
  before update on public.supervisores
  for each row execute function public.set_updated_at();

-- RLS ------------------------------------------------------------------
alter table public.supervisores enable row level security;

-- Leitura direta na tabela: qualquer autenticada não-demo (Funcionária de
-- qualquer setor, ou admin). Demonstração é bloqueada aqui de propósito —
-- ela só enxerga dado através de supervisores_lista() (abaixo), que
-- mascara os campos sensíveis. Sem essa policy, uma chamada direta à API
-- por Demonstração devolveria linhas completas, sem mascaramento nenhum.
create policy "supervisores_select_authenticated"
  on public.supervisores for select
  to authenticated
  using (not public.is_demo());

create policy "supervisores_insert_admin"
  on public.supervisores for insert
  to authenticated
  with check (public.is_admin());

create policy "supervisores_update_admin"
  on public.supervisores for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "supervisores_delete_admin"
  on public.supervisores for delete
  to authenticated
  using (public.is_admin());

-- supervisores_lista: única fonte de leitura usada pelo frontend (lista e
-- detalhe). Pra Demonstração, mascara CPF/e-mail/telefone/data de
-- nascimento/observações (null) — ela ainda vê nome, cargo, status, datas
-- e foto, o suficiente pra demonstrar a tela sem expor dado pessoal
-- identificável de terceiros. Pra qualquer outra pessoa autenticada, volta
-- tudo. security definer porque, sendo Demonstração, a policy de select
-- acima bloqueia a leitura da tabela por completo — é esta função quem
-- decide o que mostrar no lugar de simplesmente nada.
create or replace function public.supervisores_lista()
returns table (
  id uuid,
  nome text,
  cpf text,
  email text,
  telefone text,
  data_nascimento date,
  cargo text,
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
    s.cargo, s.data_inicio, s.data_fim, s.status,
    case when public.is_demo() then null else s.observacoes end,
    s.foto_url, s.created_at, s.updated_at
  from public.supervisores s
  order by s.nome;
$$;

revoke all on function public.supervisores_lista() from public, anon;
grant execute on function public.supervisores_lista() to authenticated;