-- Setor Comercial: acesso SOMENTE LEITURA a Prorrogação de Boletos, Controle de Avarias
-- e Controle de Abatimentos; sem Supervisores e sem criar tarefas.
--
-- Regra de permissão: is_comercial() = setor 'Comercial' e role 'func'. Não usa nome nem id
-- fixo. O setor só pode ser alterado pela admin (trigger proteger_profiles_role_setor),
-- então a própria pessoa não consegue se promover. role 'func' já exclui admin e demo.
--
-- O que muda (tudo aditivo para o Comercial; para quem NÃO é Comercial o resultado de cada
-- policy continua exatamente o mesmo, porque is_comercial() é falsa):
--   * LEITURA liberada ao Comercial: pendencias, abatimentos, avarias, avaria_historico,
--     avaria_solicitacoes, avaria_concessoes, avaria_aplicacoes (a view
--     avaria_solicitacoes_atual é security_invoker e acompanha a tabela).
--   * Nenhuma policy de INSERT/UPDATE/DELETE dessas tabelas é tocada: continuam só do
--     Financeiro/admin, então o Comercial não cria, edita, exclui, aprova nem cancela.
--     As RPCs de cancelamento e avarias_verificar_duplicidade já exigem Financeiro/aprovadora.
--   * SUPERVISORES fechado ao Comercial: policy de leitura e a RPC supervisores_lista()
--     (security definer, que ignora a RLS) passam a negar. Representantes, contratos,
--     auditoria (log geral), RH, cancelamento_solicitacoes etc. já estavam fechados.
--   * TAREFAS: o Comercial não cria tarefa (nem para outra pessoa nem para si). Continua
--     concluindo/reabrindo as PRÓPRIAS (policy de UPDATE, inalterada).
--
-- Não altera dados. Reversão: docs/rollback-comercial-jefferson.md.

create or replace function public.is_comercial()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'func'
      and setor = 'Comercial'
  );
$$;

-- Mesmo cuidado da profiles_publico: nada de EXECUTE para anônimo/PUBLIC.
revoke execute on function public.is_comercial() from public, anon;
grant execute on function public.is_comercial() to authenticated, service_role;

-- Leitura para o Comercial (OR is_comercial()) — expressões originais preservadas.
alter policy "pendencias_select_financeiro" on public.pendencias
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());
alter policy "abatimentos_select_financeiro" on public.abatimentos
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());
alter policy "avarias_select_financeiro" on public.avarias
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());
alter policy "avaria_historico_select_financeiro" on public.avaria_historico
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());
alter policy "avaria_solicitacoes_select_financeiro" on public.avaria_solicitacoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());
alter policy "avaria_concessoes_select_financeiro" on public.avaria_concessoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());
alter policy "avaria_aplicacoes_select_financeiro" on public.avaria_aplicacoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

-- Supervisores: fecha para o Comercial (os demais perfis seguem como estão).
alter policy "supervisores_select_authenticated" on public.supervisores
  using (not public.is_demo() and not public.is_comercial());

-- Tarefas: o Comercial não cria tarefas.
alter policy "tarefas_insert_authenticated" on public.tarefas
  with check (not public.is_demo() and not public.is_comercial());

-- RPC de supervisores: mesmo corpo de antes, só acrescenta "and not is_comercial()".
create or replace function public.supervisores_lista()
returns table (
  id uuid, nome text, cpf text, email text, telefone text, data_nascimento date,
  cargo text, regiao text, data_inicio date, data_fim date, status text,
  observacoes text, foto_url text, created_at timestamptz, updated_at timestamptz
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
  where (not public.is_demo() or s.nome ilike '%TESTE%')
    and not public.is_comercial()
  order by s.nome;
$$;
