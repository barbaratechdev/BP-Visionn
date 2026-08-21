-- Controle de Férias — um registro por período de férias de um
-- funcionário (histórico completo fica preservado, uma linha por período,
-- igual ao espírito de tarefas_historico). Liga em funcionarios (cadastro
-- de pessoal do RH), não em profiles: mesmo raciocínio já usado em
-- funcionarios (20260817000000) — RH controla férias de todo mundo no
-- quadro, com ou sem conta de login no sistema, então não faz sentido
-- depender de profiles aqui.
--
-- dias_corridos é coluna gerada (data_fim - data_inicio + 1), no mesmo
-- padrão já usado em representantes.vinculo_data_termino_previsto —
-- nunca é enviada pelo cliente, o Postgres calcula sozinho e mantém a
-- contagem sempre consistente com as datas.
create table public.ferias (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  periodo_aquisitivo_inicio date not null,
  periodo_aquisitivo_fim date not null,
  data_inicio date,
  data_fim date,
  dias_corridos integer generated always as (
    case when data_inicio is not null and data_fim is not null
      then (data_fim - data_inicio + 1)
      else null
    end
  ) stored,
  status text not null default 'Pendente' check (status in ('Pendente','Programada','Em férias','Concluída')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ferias_periodo_aquisitivo_valido check (periodo_aquisitivo_fim >= periodo_aquisitivo_inicio),
  constraint ferias_datas_validas check (data_inicio is null or data_fim is null or data_fim >= data_inicio),
  -- Só "Pendente" pode ficar sem data — programar, estar em férias ou ter
  -- concluído exige saber quando (mesma lógica de
  -- pendencias_data_aprovacao_check em 20260813000000).
  constraint ferias_datas_exigidas_fora_pendente check (status = 'Pendente' or (data_inicio is not null and data_fim is not null))
);

comment on table public.ferias is 'Períodos de férias por funcionário (cadastro do RH) — uma linha por período aquisitivo/gozo; o conjunto das linhas de um funcionário é o histórico dele.';
comment on column public.ferias.periodo_aquisitivo_inicio is 'Início do período aquisitivo (12 meses) ao qual essas férias se referem.';
comment on column public.ferias.data_inicio is 'Data de início do período de férias — programado ou já realizado, conforme "status".';
comment on column public.ferias.dias_corridos is 'Calculado a partir de data_inicio/data_fim — nunca gravado diretamente.';

-- Índices pensados pra já deixar o terreno pronto pra relatório/consulta
-- por período mais pra frente (filtro por funcionário, por status, por
-- intervalo de datas), sem precisar de outra migration só pra isso.
create index ferias_funcionario_idx on public.ferias(funcionario_id);
create index ferias_status_idx on public.ferias(status);
create index ferias_data_inicio_idx on public.ferias(data_inicio);
create index ferias_periodo_aquisitivo_idx on public.ferias(periodo_aquisitivo_inicio, periodo_aquisitivo_fim);

create trigger ferias_set_updated_at
  before update on public.ferias
  for each row execute function public.set_updated_at();

-- RLS: mesmo público de funcionarios — is_rh() (já inclui admin).
alter table public.ferias enable row level security;

create policy "ferias_select_rh"
  on public.ferias for select
  to authenticated
  using (public.is_rh());

create policy "ferias_insert_rh"
  on public.ferias for insert
  to authenticated
  with check (public.is_rh());

create policy "ferias_update_rh"
  on public.ferias for update
  to authenticated
  using (public.is_rh())
  with check (public.is_rh());

create policy "ferias_delete_admin"
  on public.ferias for delete
  to authenticated
  using (public.is_admin());
