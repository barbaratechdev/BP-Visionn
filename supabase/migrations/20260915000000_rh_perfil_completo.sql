-- Reforma do RH: cadastro de funcionário vira um perfil completo (dados
-- pessoais, salário com histórico, exames periódicos, documentos e uma
-- linha do tempo de ocorrências), em vez de só nome/vínculo/VT/VR. Tudo
-- ancorado em funcionario_id, seguindo o mesmo padrão de permissão já usado
-- em "funcionarios"/"ferias" (pode_gerenciar_funcionarios(), criada em
-- 20260821000030_funcionarios_maria_k_rls.sql).

-- 1) Campos que faltavam no cadastro (nome/telefone/vínculo/VT/VR/setor/
-- estado_filial já existiam) — todos nullable, não quebra registro
-- existente nem formulário atual.
alter table public.funcionarios
  add column cargo text,
  add column cpf text,
  add column data_nascimento date,
  add column email text;

-- 2) "ferias" ainda usava is_rh() puro (não incluía a exceção nominal da
-- Maria K que já existe em funcionarios via pode_gerenciar_funcionarios()).
-- Como Férias passa a viver dentro do mesmo perfil do funcionário, alinha
-- as duas regras.
alter policy "ferias_select_rh"
  on public.ferias
  using (public.pode_gerenciar_funcionarios());

alter policy "ferias_insert_rh"
  on public.ferias
  with check (public.pode_gerenciar_funcionarios());

alter policy "ferias_update_rh"
  on public.ferias
  using (public.pode_gerenciar_funcionarios())
  with check (public.pode_gerenciar_funcionarios());

-- 3) Histórico salarial — append-only (RH nunca edita/apaga um lançamento;
-- corrige com um lançamento novo). "Salário atual" é sempre o registro de
-- maior data_alteracao (empate por created_at), nunca uma coluna separada
-- em funcionarios — evita duas fontes de verdade pro mesmo dado.
create table public.funcionario_salarios (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  data_alteracao date not null default current_date,
  valor numeric(12,2) not null check (valor >= 0),
  motivo text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index funcionario_salarios_funcionario_idx on public.funcionario_salarios(funcionario_id);

comment on table public.funcionario_salarios is 'Histórico salarial do funcionário — append-only; o salário atual é o registro de maior data_alteracao.';

alter table public.funcionario_salarios enable row level security;

create policy "funcionario_salarios_select_rh"
  on public.funcionario_salarios for select
  to authenticated
  using (public.pode_gerenciar_funcionarios());

create policy "funcionario_salarios_insert_rh"
  on public.funcionario_salarios for insert
  to authenticated
  with check (public.pode_gerenciar_funcionarios());

create policy "funcionario_salarios_delete_admin"
  on public.funcionario_salarios for delete
  to authenticated
  using (public.is_admin());

-- Sem update/policy própria: um lançamento salarial não se corrige por
-- edição, só com um novo lançamento (ou, em caso de erro grosseiro,
-- exclusão por um admin).

-- 4) Exames periódicos — um registro por ano/funcionário. Só guarda o fato
-- (Realizado/Pendente); "Atrasado"/"Próximo do vencimento" são calculados
-- no cliente comparando data_proximo_exame/ano com hoje, nunca gravados
-- (mesmo padrão de tempoDeEmpresa em src/lib/helpers.ts: estado derivado
-- nunca é persistido).
create table public.funcionario_exames (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  ano integer not null,
  data_exame date,
  data_proximo_exame date,
  status text not null default 'Pendente' check (status in ('Realizado','Pendente')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funcionario_exames_ano_unico unique (funcionario_id, ano)
);

create index funcionario_exames_funcionario_idx on public.funcionario_exames(funcionario_id);

create trigger funcionario_exames_set_updated_at
  before update on public.funcionario_exames
  for each row execute function public.set_updated_at();

alter table public.funcionario_exames enable row level security;

create policy "funcionario_exames_select_rh"
  on public.funcionario_exames for select
  to authenticated
  using (public.pode_gerenciar_funcionarios());

create policy "funcionario_exames_insert_rh"
  on public.funcionario_exames for insert
  to authenticated
  with check (public.pode_gerenciar_funcionarios());

create policy "funcionario_exames_update_rh"
  on public.funcionario_exames for update
  to authenticated
  using (public.pode_gerenciar_funcionarios())
  with check (public.pode_gerenciar_funcionarios());

create policy "funcionario_exames_delete_admin"
  on public.funcionario_exames for delete
  to authenticated
  using (public.is_admin());

-- 5) Documentos/evidências — só metadados (tipo/data/descrição/
-- observações), sem upload de arquivo nesta entrega (o projeto não usa
-- Supabase Storage em nenhum lugar ainda).
create table public.funcionario_documentos (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  tipo text not null check (tipo in ('Exame periódico','Atestado','Documento','Comprovante','Advertência','Outro')),
  data date not null default current_date,
  descricao text,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index funcionario_documentos_funcionario_idx on public.funcionario_documentos(funcionario_id);

alter table public.funcionario_documentos enable row level security;

create policy "funcionario_documentos_select_rh"
  on public.funcionario_documentos for select
  to authenticated
  using (public.pode_gerenciar_funcionarios());

create policy "funcionario_documentos_insert_rh"
  on public.funcionario_documentos for insert
  to authenticated
  with check (public.pode_gerenciar_funcionarios());

create policy "funcionario_documentos_update_rh"
  on public.funcionario_documentos for update
  to authenticated
  using (public.pode_gerenciar_funcionarios())
  with check (public.pode_gerenciar_funcionarios());

create policy "funcionario_documentos_delete_admin"
  on public.funcionario_documentos for delete
  to authenticated
  using (public.is_admin());

-- 6) Ocorrências — linha do tempo do funcionário. Append-only (igual
-- tarefas_historico/auditoria: sem update/delete, nunca se apaga
-- registro antigo). Alimentada manualmente pelo RH e automaticamente pelo
-- front a cada salvamento em Salário/Exames/Documentos/Férias.
-- criado_por_nome é um snapshot (não FK), pro registro não ficar órfão de
-- texto se o profile de quem lançou for removido — mesmo raciocínio de
-- auditoria.usuario_nome.
create table public.funcionario_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  data date not null default current_date,
  tipo text not null,
  descricao text not null,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  criado_por_nome text
);

create index funcionario_ocorrencias_funcionario_idx on public.funcionario_ocorrencias(funcionario_id);
create index funcionario_ocorrencias_data_idx on public.funcionario_ocorrencias(data desc);

alter table public.funcionario_ocorrencias enable row level security;

create policy "funcionario_ocorrencias_select_rh"
  on public.funcionario_ocorrencias for select
  to authenticated
  using (public.pode_gerenciar_funcionarios());

create policy "funcionario_ocorrencias_insert_rh"
  on public.funcionario_ocorrencias for insert
  to authenticated
  with check (public.pode_gerenciar_funcionarios());

-- Sem update/delete: histórico do funcionário é append-only por design.
