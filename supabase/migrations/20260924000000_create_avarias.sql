-- Controle de Avarias: avaria de produto identificada em uma NF, que pode
-- gerar uma solicitação de desconto/concessão junto ao laboratório
-- fornecedor. Hoje esse controle é feito em planilha, por filial, sem
-- histórico centralizado — o objetivo desta tabela (e das tabelas filhas
-- criadas na migration seguinte) é dar uma fonte única de consulta: "essa
-- avaria já teve desconto concedido?".
--
-- filial usa a mesma lista fechada já usada em funcionarios.estado_filial
-- (20260821000020) — não existe tabela "filiais" normalizada no projeto,
-- então o padrão aqui é reaproveitar o mesmo texto fechado por CHECK, não
-- criar uma tabela nova só pra isso. Acesso ao módulo não é restrito por
-- filial (decisão de negócio confirmada com a usuária): quem tem
-- is_financeiro() enxerga avarias de todas as filiais, e o campo é só um
-- dado/filtro, igual pendencias.estado já é hoje.
--
-- produto_nome/produto_codigo/identificado_por ficam como texto livre,
-- mesmo raciocínio de fornecedor/numero_nf em pendencias/tarefas: o
-- projeto não tem tabela de produtos nem de fornecedores/laboratórios, e
-- criar uma agora seria escopo maior que o pedido original.
--
-- status é o resumo do ciclo de vida (avaria -> solicitação -> concessão
-- -> aplicação), mantido em sincronia pelo cliente a cada transição —
-- mesmo padrão já usado em pendencias.estado/tarefas.status (sem trigger
-- de sincronização no banco).
create table public.avarias (
  id uuid primary key default gen_random_uuid(),
  filial text not null
    check (filial in ('PA — Benevides','PA — Ananindeua (Filial)','MA','PI')),
  numero_nf text not null,
  data_nf date,
  produto_nome text not null,
  produto_codigo text,
  quantidade numeric(12,3) not null check (quantidade > 0),
  tipo_avaria text not null,
  descricao text,
  valor_produto numeric(12,2) check (valor_produto is null or valor_produto >= 0),
  valor_avaria numeric(12,2) check (valor_avaria is null or valor_avaria >= 0),
  data_identificacao date not null default current_date,
  identificado_por text not null,
  observacoes text,
  status text not null default 'ABERTA'
    check (status in ('ABERTA','SOLICITADO','EM_ANALISE','CONCEDIDO','NEGADO','APLICADO','CANCELADO')),
  created_by uuid references public.profiles(id) on delete set null,
  created_by_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.avarias is 'Avarias de produto identificadas em NF, com ciclo de vida até a aplicação do desconto concedido pelo laboratório.';
comment on column public.avarias.status is 'Resumo do ciclo de vida — sincronizado pelo cliente a cada transição em avaria_solicitacoes/avaria_concessoes/avaria_aplicacoes.';
comment on column public.avarias.tipo_avaria is 'Texto livre — o pedido original não enumera tipos fechados de avaria.';

create index avarias_filial_idx on public.avarias(filial);
create index avarias_numero_nf_idx on public.avarias(numero_nf);
create index avarias_produto_codigo_idx on public.avarias(produto_codigo);
create index avarias_status_idx on public.avarias(status);
create index avarias_data_identificacao_idx on public.avarias(data_identificacao);
create index avarias_dup_check_idx on public.avarias(filial, numero_nf, tipo_avaria);

create trigger avarias_set_updated_at
  before update on public.avarias
  for each row execute function public.set_updated_at();

-- RLS: mesmo público de Prorrogação de Boletos — is_financeiro() (admin ou
-- setor Financeiro) grava, is_financeiro() ou is_demo() lê, demo nunca
-- escreve. Exclusão liberada pra is_financeiro() (não só admin), mesmo
-- precedente de 20260917000000_prorrogacao_edicao_exclusao_financeiro.sql
-- (Financeiro é dono do dado no dia a dia, não só um corretor de exceção).
alter table public.avarias enable row level security;

create policy "avarias_select_financeiro"
  on public.avarias for select
  to authenticated
  using (public.is_financeiro() or public.is_demo());

create policy "avarias_insert_financeiro"
  on public.avarias for insert
  to authenticated
  with check (public.is_financeiro() and not public.is_demo());

create policy "avarias_update_financeiro"
  on public.avarias for update
  to authenticated
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());

create policy "avarias_delete_financeiro"
  on public.avarias for delete
  to authenticated
  using (public.is_financeiro() and not public.is_demo());
