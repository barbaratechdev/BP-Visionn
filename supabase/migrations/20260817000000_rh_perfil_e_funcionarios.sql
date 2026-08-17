-- Novo perfil de acesso "RH", seguindo o mesmo padrão já usado pra
-- Financeiro: não é um profiles.role novo (role continua só
-- 'admin'/'func'/'demo' — ver 20260729003613 e 20260809140000), é um
-- profiles.setor = 'RH' (texto livre, mesma coluna que já guarda
-- 'Financeiro' hoje e decide is_financeiro()). Reaproveita a distinção
-- role=tier de acesso / setor=departamento que o sistema já usa.
--
-- is_rh() inclui admin de propósito, no mesmo padrão de is_financeiro():
-- a Supervisora sempre pode tudo que um setor específico pode.
create or replace function public.is_rh()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'admin' or setor = 'RH')
  );
$$;

-- funcionarios: cadastro de pessoal da empresa mantido pelo RH — pessoa,
-- não conta de login (mesmo espírito de "supervisores": id não referencia
-- profiles(id)). Campos exatamente os pedidos pro cadastro de RH; nada de
-- CPF/CORE/vínculo comercial aqui — isso já existe em representantes.
create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  data_entrada date not null default current_date,
  tipo_vinculo text not null default 'Efetivo' check (tipo_vinculo in ('Efetivo','Temporário')),
  vale_transporte boolean not null default false,
  vale_refeicao boolean not null default false,
  observacoes text,
  status text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  data_saida date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funcionarios_saida_apos_entrada check (data_saida is null or data_saida >= data_entrada)
);

comment on table public.funcionarios is 'Cadastro de funcionários da empresa mantido pelo RH — pessoa, não conta de login.';

create index funcionarios_status_idx on public.funcionarios(status);
create index funcionarios_nome_idx on public.funcionarios(nome);

create trigger funcionarios_set_updated_at
  before update on public.funcionarios
  for each row execute function public.set_updated_at();

-- RLS ------------------------------------------------------------------
-- Só RH (e admin, via is_rh()) enxerga e mexe em funcionarios — diferente
-- de supervisores (que qualquer autenticada não-demo já vê hoje), porque
-- aqui tem VT/VR e observações pessoais, dado mais sensível. Demonstração
-- fica de fora por completo (is_rh() já retorna falso pra ela).
alter table public.funcionarios enable row level security;

create policy "funcionarios_select_rh"
  on public.funcionarios for select
  to authenticated
  using (public.is_rh());

create policy "funcionarios_insert_rh"
  on public.funcionarios for insert
  to authenticated
  with check (public.is_rh());

create policy "funcionarios_update_rh"
  on public.funcionarios for update
  to authenticated
  using (public.is_rh())
  with check (public.is_rh());

create policy "funcionarios_delete_admin"
  on public.funcionarios for delete
  to authenticated
  using (public.is_admin());

-- representantes: RH passa a poder cadastrar/editar vendedores, igual já
-- podia Financeiro — mesmas policies, só adicionando "or is_rh()" nas
-- mesmas condições que já existiam (preserva o tratamento de demo já em
-- vigor: 20260809140000 bloqueia escrita de demo, 20260812050000 dá
-- leitura mascarada por nome '%TESTE%' pra demo).
alter policy "representantes_select_financeiro"
  on public.representantes
  using (public.is_financeiro() or public.is_rh() or (public.is_demo() and nome ilike '%TESTE%'));

alter policy "representantes_insert_financeiro"
  on public.representantes
  with check ((public.is_financeiro() or public.is_rh()) and not public.is_demo());

alter policy "representantes_update_financeiro"
  on public.representantes
  using ((public.is_financeiro() or public.is_rh()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_rh()) and not public.is_demo());

-- supervisores: RH passa a poder cadastrar/editar supervisores. Select já
-- é liberado pra qualquer autenticada não-demo (20260812030000), não
-- precisa mudar. Nota: a migration pendente
-- 20260812060000_supervisores_edicao_nominal.sql (ainda não aplicada, não
-- relacionada a esta tarefa) reescreve essas duas policies pra adicionar
-- pode_editar_supervisores() — quando ela for aplicada, vai precisar
-- incluir "or public.is_rh()" também, senão o RH perde este acesso.
alter policy "supervisores_insert_admin"
  on public.supervisores
  with check (public.is_admin() or public.is_rh());

alter policy "supervisores_update_admin"
  on public.supervisores
  using (public.is_admin() or public.is_rh())
  with check (public.is_admin() or public.is_rh());

-- Sem mudança em pendencias, contratos, tarefas ou auditoria: essas
-- policies continuam exigindo is_financeiro()/is_admin() como hoje, então
-- um perfil RH (setor='RH', não 'Financeiro') nunca satisfaz essas
-- condições — bloqueado no banco, não só escondido na tela.
