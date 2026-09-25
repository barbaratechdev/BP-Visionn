-- Controle de Abatimentos: registro simples de descontos/abatimentos
-- recebidos em boletos, pro Financeiro ter um controle centralizado (hoje
-- não existe nenhuma tabela relacionada a isso no projeto — verificado
-- antes de criar esta). Módulo independente: não referencia avarias nem
-- qualquer outra tabela, por decisão explícita (mesmo abatimento podendo
-- ter origem numa avaria, a ligação não entra neste primeiro momento).
--
-- laboratorio fica como texto livre, mesmo padrão já usado em
-- avarias.laboratorio (20260925000000) — nenhuma tabela de laboratórios
-- existe no projeto, então não criamos uma agora só pra este módulo.
--
-- filial usa a mesma lista fechada de sempre (ESTADOS_FILIAL / mesmo CHECK
-- de avarias.filial e funcionarios.estado_filial).
--
-- Sem exclusão física: mesmo conceito já resolvido em avarias (correção é
-- por cancelamento, nunca DELETE) — status ATIVO/CANCELADO, sem policy de
-- delete. Como não há um fluxo de múltiplos estágios aqui (é só um
-- registro simples, diferente do ciclo avaria->solicitação->concessão->
-- aplicação), não precisa de trigger de transição de status: qualquer
-- UPDATE de ATIVO para CANCELADO (ou o contrário, se precisar reabrir) já
-- é coberto pela RLS de update abaixo.
--
-- updated_by/updated_by_nome: mesmo padrão de created_by/created_by_nome
-- (FK + nome denormalizado, pra não depender de outra consulta só pra
-- mostrar quem mexeu), agora também pra quem editou por último.
create table public.abatimentos (
  id uuid primary key default gen_random_uuid(),
  laboratorio text not null,
  filial text not null
    check (filial in ('PA — Benevides','PA — Ananindeua (Filial)','MA','PI')),
  nf text not null,
  valor_abatimento numeric(12,2) not null check (valor_abatimento >= 0),
  valor_pago numeric(12,2) not null check (valor_pago >= 0),
  data date not null,
  status text not null default 'ATIVO'
    check (status in ('ATIVO','CANCELADO')),
  created_by uuid references public.profiles(id) on delete set null,
  created_by_nome text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.abatimentos is 'Abatimentos/descontos recebidos em boletos, controlados pelo Financeiro. Correção é por cancelamento (status), nunca exclusão física.';

create index abatimentos_laboratorio_idx on public.abatimentos(laboratorio);
create index abatimentos_nf_idx on public.abatimentos(nf);
create index abatimentos_filial_idx on public.abatimentos(filial);
create index abatimentos_data_idx on public.abatimentos(data);
create index abatimentos_status_idx on public.abatimentos(status);

create trigger abatimentos_set_updated_at
  before update on public.abatimentos
  for each row execute function public.set_updated_at();

-- RLS: mesmo público de avarias/prorrogação — is_financeiro() grava,
-- is_financeiro() ou is_demo() lê, demo nunca escreve. Sem policy de
-- delete (nenhuma, nem pra admin) — igual avarias, a única forma de
-- corrigir é cancelar (update de status), nunca apagar a linha.
alter table public.abatimentos enable row level security;

create policy "abatimentos_select_financeiro"
  on public.abatimentos for select
  to authenticated
  using (public.is_financeiro() or public.is_demo());

create policy "abatimentos_insert_financeiro"
  on public.abatimentos for insert
  to authenticated
  with check (public.is_financeiro() and not public.is_demo());

create policy "abatimentos_update_financeiro"
  on public.abatimentos for update
  to authenticated
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());
