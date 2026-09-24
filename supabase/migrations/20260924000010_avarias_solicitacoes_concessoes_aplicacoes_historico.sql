-- Tabelas filhas de avarias: solicitação de desconto ao laboratório,
-- concessão (quando o laboratório aprova), aplicação (NF onde o desconto
-- foi efetivamente usado) e o histórico/timeline da avaria. Mesmo padrão
-- de várias tabelas filhas ancoradas em uma tabela cabeçalho já usado em
-- 20260915000000_rh_perfil_completo.sql (funcionario_salarios/exames/
-- documentos/ocorrencias a partir de funcionarios).

-- avaria_solicitacoes ---------------------------------------------------
-- Uma avaria pode ter mais de uma solicitação ao longo do tempo (ex.: a
-- primeira foi negada e o setor tenta de novo com o laboratório, ou foi
-- cancelada por engano) — por isso é 1:N, sem coluna booleana "ativa": a
-- solicitação "atual" é sempre a de created_at mais recente, mesmo
-- raciocínio já usado pra "salário atual" em funcionario_salarios. A view
-- avaria_solicitacoes_atual (criada mais abaixo) centraliza essa consulta.
create table public.avaria_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  avaria_id uuid not null references public.avarias(id) on delete cascade,
  data_solicitacao date not null default current_date,
  solicitante_id uuid references public.profiles(id) on delete set null,
  solicitante_nome text,
  laboratorio text not null,
  canal text not null
    check (canal in ('E-mail','WhatsApp','Sistema','Telefone','Portal do laboratório','Outro')),
  protocolo text,
  referencia_comunicacao text,
  valor_solicitado numeric(12,2) check (valor_solicitado is null or valor_solicitado >= 0),
  observacoes text,
  status text not null default 'SOLICITADO'
    check (status in ('SOLICITADO','EM_ANALISE','CONCEDIDO','NEGADO','CANCELADO')),
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.avaria_solicitacoes is 'Solicitações de desconto ao laboratório por avaria — 1:N; a solicitação atual é a de created_at mais recente (ver view avaria_solicitacoes_atual).';
comment on column public.avaria_solicitacoes.motivo is 'Explicação livre usada em NEGADO/CANCELADO.';

create index avaria_solicitacoes_avaria_idx on public.avaria_solicitacoes(avaria_id, created_at desc);
create index avaria_solicitacoes_status_idx on public.avaria_solicitacoes(status);

create trigger avaria_solicitacoes_set_updated_at
  before update on public.avaria_solicitacoes
  for each row execute function public.set_updated_at();

alter table public.avaria_solicitacoes enable row level security;

create policy "avaria_solicitacoes_select_financeiro"
  on public.avaria_solicitacoes for select
  to authenticated
  using (public.is_financeiro() or public.is_demo());

create policy "avaria_solicitacoes_insert_financeiro"
  on public.avaria_solicitacoes for insert
  to authenticated
  with check (public.is_financeiro() and not public.is_demo());

create policy "avaria_solicitacoes_update_financeiro"
  on public.avaria_solicitacoes for update
  to authenticated
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());

create policy "avaria_solicitacoes_delete_financeiro"
  on public.avaria_solicitacoes for delete
  to authenticated
  using (public.is_financeiro() and not public.is_demo());

-- avaria_concessoes -------------------------------------------------------
-- Só existe uma linha aqui quando o laboratório efetivamente concede o
-- desconto — uma negativa fica só em avaria_solicitacoes.status='NEGADO'
-- + motivo, sem linha de concessão. 1:1 com a solicitação concedida
-- (solicitacao_id unique): cada solicitação só pode ser concedida uma
-- vez; uma nova tentativa depois de negada/cancelada é uma solicitação
-- nova (ver comentário acima).
create table public.avaria_concessoes (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null unique references public.avaria_solicitacoes(id) on delete cascade,
  avaria_id uuid not null references public.avarias(id) on delete cascade,
  data_concessao date not null default current_date,
  valor_solicitado numeric(12,2) check (valor_solicitado is null or valor_solicitado >= 0),
  valor_concedido numeric(12,2) not null check (valor_concedido >= 0),
  percentual numeric(5,2) generated always as (
    case when valor_solicitado is not null and valor_solicitado > 0
      then round((valor_concedido / valor_solicitado) * 100, 2)
      else null
    end
  ) stored,
  confirmado_por_id uuid references public.profiles(id) on delete set null,
  confirmado_por_nome text,
  protocolo text,
  comprovante_referencia text,
  observacoes text,
  created_at timestamptz not null default now()
);

comment on column public.avaria_concessoes.valor_solicitado is 'Snapshot do valor solicitado no momento da concessão, mesmo que a solicitação original seja consultada depois.';
comment on column public.avaria_concessoes.percentual is 'Calculado a partir de valor_concedido/valor_solicitado — nunca gravado diretamente.';
comment on column public.avaria_concessoes.comprovante_referencia is 'Referência textual do comprovante (protocolo, nome de arquivo, link externo) — o projeto não usa Supabase Storage, então não há upload de arquivo aqui.';

create index avaria_concessoes_avaria_idx on public.avaria_concessoes(avaria_id);

alter table public.avaria_concessoes enable row level security;

create policy "avaria_concessoes_select_financeiro"
  on public.avaria_concessoes for select
  to authenticated
  using (public.is_financeiro() or public.is_demo());

create policy "avaria_concessoes_insert_financeiro"
  on public.avaria_concessoes for insert
  to authenticated
  with check (public.is_financeiro() and not public.is_demo());

create policy "avaria_concessoes_update_financeiro"
  on public.avaria_concessoes for update
  to authenticated
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());

create policy "avaria_concessoes_delete_financeiro"
  on public.avaria_concessoes for delete
  to authenticated
  using (public.is_financeiro() and not public.is_demo());

-- avaria_aplicacoes -------------------------------------------------------
-- Onde o desconto concedido foi de fato usado — sempre ligado a uma
-- concessão (não dá pra aplicar um desconto que não foi concedido). Sem
-- unique em concessao_id: nada no pedido original proíbe dividir uma
-- concessão entre mais de uma NF de aplicação.
create table public.avaria_aplicacoes (
  id uuid primary key default gen_random_uuid(),
  concessao_id uuid not null references public.avaria_concessoes(id) on delete cascade,
  avaria_id uuid not null references public.avarias(id) on delete cascade,
  nf_origem text not null,
  nf_aplicacao text not null,
  data_aplicacao date not null default current_date,
  valor_aplicado numeric(12,2) not null check (valor_aplicado >= 0),
  responsavel_id uuid references public.profiles(id) on delete set null,
  responsavel_nome text,
  observacoes text,
  created_at timestamptz not null default now()
);

create index avaria_aplicacoes_concessao_idx on public.avaria_aplicacoes(concessao_id);
create index avaria_aplicacoes_avaria_idx on public.avaria_aplicacoes(avaria_id);

alter table public.avaria_aplicacoes enable row level security;

create policy "avaria_aplicacoes_select_financeiro"
  on public.avaria_aplicacoes for select
  to authenticated
  using (public.is_financeiro() or public.is_demo());

create policy "avaria_aplicacoes_insert_financeiro"
  on public.avaria_aplicacoes for insert
  to authenticated
  with check (public.is_financeiro() and not public.is_demo());

create policy "avaria_aplicacoes_update_financeiro"
  on public.avaria_aplicacoes for update
  to authenticated
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());

create policy "avaria_aplicacoes_delete_financeiro"
  on public.avaria_aplicacoes for delete
  to authenticated
  using (public.is_financeiro() and not public.is_demo());

-- avaria_historico ----------------------------------------------------------
-- Linha do tempo da avaria — além de (não em vez de) a tabela auditoria já
-- existente: auditoria é o feed global do sistema (alimentado por addA()
-- no frontend), avaria_historico é a trilha detalhada de uma avaria
-- específica, igual funcionario_ocorrencias é pra um funcionário.
-- Append-only por design (mesmo padrão de auditoria/tarefas_historico/
-- funcionario_ocorrencias): sem policy de update/delete, nem pra admin —
-- é isso que garante, na prática, que ninguém apaga histórico.
-- criado_por_nome é snapshot (não depende do profile continuar
-- existindo), mesmo raciocínio de auditoria.usuario_nome.
create table public.avaria_historico (
  id bigint generated always as identity primary key,
  avaria_id uuid not null references public.avarias(id) on delete cascade,
  tipo text not null check (tipo in (
    'AVARIA_CRIADA','AVARIA_EDITADA','SOLICITACAO_CRIADA','STATUS_ALTERADO',
    'DESCONTO_CONCEDIDO','DESCONTO_NEGADO','DESCONTO_APLICADO',
    'SOLICITACAO_CANCELADA','TENTATIVA_DUPLICIDADE'
  )),
  descricao text not null,
  valor_anterior text,
  valor_novo text,
  referencia_avaria_id uuid references public.avarias(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

comment on table public.avaria_historico is 'Linha do tempo/auditoria de uma avaria específica — append-only, nunca editável ou excluível mesmo por admin.';
comment on column public.avaria_historico.referencia_avaria_id is 'Só preenchido em TENTATIVA_DUPLICIDADE: aponta pra avaria anterior encontrada pela checagem de duplicidade.';

create index avaria_historico_avaria_idx on public.avaria_historico(avaria_id, created_at desc);

alter table public.avaria_historico enable row level security;

create policy "avaria_historico_select_financeiro"
  on public.avaria_historico for select
  to authenticated
  using (public.is_financeiro() or public.is_demo());

create policy "avaria_historico_insert_financeiro"
  on public.avaria_historico for insert
  to authenticated
  with check (public.is_financeiro() and not public.is_demo());

-- Sem update/delete: histórico da avaria é append-only.

-- avaria_solicitacoes_atual --------------------------------------------
-- View com a solicitação mais recente de cada avaria — usada pela lista,
-- pelo dashboard e pela checagem de duplicidade, pra não repetir a mesma
-- lógica de "distinct on" em três lugares diferentes. security_invoker
-- garante que a RLS de avaria_solicitacoes seja avaliada com o usuário
-- que está consultando a view, não com o dono da view.
create view public.avaria_solicitacoes_atual
  with (security_invoker = true) as
  select distinct on (avaria_id) *
  from public.avaria_solicitacoes
  order by avaria_id, created_at desc, id desc;

comment on view public.avaria_solicitacoes_atual is 'Solicitação mais recente por avaria — deriva de avaria_solicitacoes, nunca gravada diretamente.';
