-- tarefas: boletos/obrigações a pagar, atribuídos a um responsável.
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  fornecedor text not null,
  valor numeric(12,2),
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente','vencido','prorrogado','pago')),
  responsavel_id uuid not null references public.profiles(id) on delete restrict,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tarefas is 'Tarefas/boletos atribuídos a um responsável (profiles.id).';

create index tarefas_responsavel_idx on public.tarefas(responsavel_id);
create index tarefas_status_idx on public.tarefas(status);
create index tarefas_vencimento_idx on public.tarefas(vencimento);

create trigger tarefas_set_updated_at
  before update on public.tarefas
  for each row execute function public.set_updated_at();

-- tarefas_historico: histórico de prorrogações de uma tarefa.
-- Substitui o array "historico" embutido em cada tarefa por uma tabela
-- filha própria (1 tarefa -> N prorrogações), evitando dado semiestruturado.
create table public.tarefas_historico (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  novo_vencimento date not null,
  motivo text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.tarefas_historico is 'Histórico de prorrogações de vencimento de uma tarefa (tarefas.id).';

create index tarefas_historico_tarefa_idx on public.tarefas_historico(tarefa_id);
