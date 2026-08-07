-- pendencias: acompanhamento de notas fiscais em negociação com fornecedores
-- (hoje a feature "Incluir NF" da aba Contratos). É uma entidade distinta de
-- "tarefas": uma tarefa pendente é um boleto ainda não pago; uma pendência
-- aqui é uma NF cujo status de negociação com o fornecedor ainda está aberto.
create table public.pendencias (
  id uuid primary key default gen_random_uuid(),
  fornecedor text not null,
  numero_nf text not null,
  vencimento date,
  estado text not null default 'Aguardando retorno'
    check (estado in ('Aguardando retorno','Em negociação','Aprovado','Recusado')),
  contrato_id uuid references public.contratos(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pendencias is 'Notas fiscais em negociação com fornecedores, opcionalmente vinculadas a um contrato.';

create index pendencias_estado_idx on public.pendencias(estado);
create index pendencias_contrato_idx on public.pendencias(contrato_id);

create trigger pendencias_set_updated_at
  before update on public.pendencias
  for each row execute function public.set_updated_at();
