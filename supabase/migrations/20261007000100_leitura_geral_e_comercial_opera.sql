-- Regra geral de leitura por setor + Comercial passa a OPERAR nas áreas autorizadas.
--
-- 1) LEITURA GERAL (visualizar ≠ alterar): pode_ver_modulos() = Financeiro, RH, Comercial ou
--    admin (is_financeiro() or is_rh() or is_comercial(); a admin entra por is_financeiro()
--    e is_rh()). É por setor/role — sem nome e sem id fixo — então quem a admin cadastrar nesses
--    setores herda a LEITURA. Fica separado dos predicados de escrita.
--      * Boletos, abatimentos, avarias (+ tabelas de avaria), contratos e representantes:
--        passam a ser lidos também pelo RH e pelo Comercial.
--      * RH (funcionários, salários, ocorrências, documentos, exames, férias): passa a ser LIDO
--        também por Financeiro e Comercial. As policies de ESCRITA do RH continuam em
--        pode_gerenciar_funcionarios(), que NÃO é alterada: Financeiro/Comercial não escrevem no RH.
--      * Supervisores: volta a ser lido por qualquer autenticado não-demo (revoga o bloqueio
--        do Comercial da migration 20261007000000).
--      * Demonstração, teste e teste2 não são afetados (is_financeiro/is_rh/is_comercial = falso).
--
-- 2) COMERCIAL OPERA (escrita só nas áreas autorizadas, sempre "OR is_comercial()"):
--      Prorrogação de Boletos (incluir/editar; SEM excluir), Controle de Avarias (+ histórico,
--      solicitações, concessões, aplicações), Controle de Abatimentos (incluir/editar; pode
--      SOLICITAR cancelamento, nunca cancelar direto nem aprovar), Representantes (incluir/editar;
--      sem excluir) e Supervisores (incluir/editar; ativar/desativar e excluir continuam só da admin).
--      Contratos e RH: somente leitura. Tarefas: inalterado (não cria tarefa; conclui/reabre as próprias).
--
-- Nenhuma policy de DELETE é tocada. Nenhuma regra por nome é criada. Não altera dados.
-- A falha antiga de pode_editar_supervisores() (nome "Ana"/"Esmeralda") NÃO é tocada aqui.
-- Reversão: docs/rollback-leitura-geral-comercial.md.

create or replace function public.pode_ver_modulos()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_financeiro() or public.is_rh() or public.is_comercial();
$$;

revoke execute on function public.pode_ver_modulos() from public, anon;
grant execute on function public.pode_ver_modulos() to authenticated, service_role;

-- ===== LEITURA =====
alter policy "pendencias_select_financeiro" on public.pendencias
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "abatimentos_select_financeiro" on public.abatimentos
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "avarias_select_financeiro" on public.avarias
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "avaria_historico_select_financeiro" on public.avaria_historico
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "avaria_solicitacoes_select_financeiro" on public.avaria_solicitacoes
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "avaria_concessoes_select_financeiro" on public.avaria_concessoes
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "avaria_aplicacoes_select_financeiro" on public.avaria_aplicacoes
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "contratos_select_financeiro" on public.contratos
  using (public.pode_ver_modulos() and not public.is_demo());

alter policy "representantes_select_financeiro" on public.representantes
  using (public.pode_ver_modulos() or (public.is_demo() and nome ilike '%TESTE%'));

alter policy "funcionarios_select_rh" on public.funcionarios
  using (public.pode_gerenciar_funcionarios() or public.pode_ver_modulos());

alter policy "funcionario_salarios_select_rh" on public.funcionario_salarios
  using (public.pode_gerenciar_funcionarios() or public.pode_ver_modulos());

alter policy "funcionario_ocorrencias_select_rh" on public.funcionario_ocorrencias
  using (public.pode_gerenciar_funcionarios() or public.pode_ver_modulos());

alter policy "funcionario_documentos_select_rh" on public.funcionario_documentos
  using (public.pode_gerenciar_funcionarios() or public.pode_ver_modulos());

alter policy "funcionario_exames_select_rh" on public.funcionario_exames
  using (public.pode_gerenciar_funcionarios() or public.pode_ver_modulos());

alter policy "ferias_select_rh" on public.ferias
  using (public.pode_gerenciar_funcionarios() or public.pode_ver_modulos());

alter policy "cancelamento_solicitacoes_select_financeiro" on public.cancelamento_solicitacoes
  using ((public.is_financeiro() or public.is_comercial() or public.is_aprovador_cancelamento()) and not public.is_demo());

alter policy "supervisores_select_authenticated" on public.supervisores
  using (not public.is_demo());

-- ===== ESCRITA DO COMERCIAL =====
alter policy "pendencias_insert_financeiro" on public.pendencias
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "pendencias_update_financeiro" on public.pendencias
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "abatimentos_insert_financeiro" on public.abatimentos
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "abatimentos_update_financeiro" on public.abatimentos
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avarias_insert_financeiro" on public.avarias
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avarias_update_financeiro" on public.avarias
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_solicitacoes_insert_financeiro" on public.avaria_solicitacoes
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_solicitacoes_update_financeiro" on public.avaria_solicitacoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_concessoes_insert_financeiro" on public.avaria_concessoes
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_concessoes_update_financeiro" on public.avaria_concessoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_aplicacoes_insert_financeiro" on public.avaria_aplicacoes
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_aplicacoes_update_financeiro" on public.avaria_aplicacoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_historico_insert_financeiro" on public.avaria_historico
  with check ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "representantes_insert_financeiro" on public.representantes
  with check ((public.is_financeiro() or public.is_rh() or public.is_comercial()) and not public.is_demo());

alter policy "representantes_update_financeiro" on public.representantes
  using ((public.is_financeiro() or public.is_rh() or public.is_comercial()) and not public.is_demo())
  with check ((public.is_financeiro() or public.is_rh() or public.is_comercial()) and not public.is_demo());

alter policy "supervisores_insert_admin" on public.supervisores
  with check (public.is_admin() or public.pode_editar_supervisores() or public.is_comercial());

alter policy "supervisores_update_admin" on public.supervisores
  using (public.is_admin() or public.pode_editar_supervisores() or public.is_comercial())
  with check (public.is_admin() or public.pode_editar_supervisores() or public.is_comercial());

-- ===== FUNÇÕES (trocas mínimas sobre o texto de produção) =====
-- Trigger: o Comercial pode editar fornecedor/NF/vencimento do boleto (como o Financeiro).
CREATE OR REPLACE FUNCTION public.proteger_pendencias_campos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (public.is_financeiro() or public.is_comercial()) then
    if new.fornecedor is distinct from old.fornecedor
      or new.numero_nf is distinct from old.numero_nf
      or new.vencimento is distinct from old.vencimento
      or new.contrato_id is distinct from old.contrato_id then
      raise exception 'Apenas a Supervisora ou o Financeiro podem editar fornecedor, NF, vencimento ou contrato vinculado.';
    end if;
  end if;
  return new;
end;
$function$;

-- Verificação de duplicidade de avaria (usada ao cadastrar): Financeiro e Comercial.
CREATE OR REPLACE FUNCTION public.avarias_verificar_duplicidade(p_filial text, p_numero_nf text, p_produto_codigo text, p_produto_nome text, p_tipo_avaria text)
 RETURNS TABLE(avaria_id uuid, numero_nf text, produto_nome text, produto_codigo text, tipo_avaria text, laboratorio text, valor_concedido numeric, data_concessao date, solicitante_nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    a.id, a.numero_nf, a.produto_nome, a.produto_codigo, a.tipo_avaria,
    s.laboratorio, c.valor_concedido, c.data_concessao, s.solicitante_nome
  from public.avarias a
  join public.avaria_solicitacoes s on s.avaria_id = a.id
  join public.avaria_concessoes c on c.solicitacao_id = s.id
  where ((public.is_financeiro() or public.is_comercial()) and not public.is_demo())
    and c.status = 'ATIVA'
    and a.filial = p_filial
    and a.numero_nf = p_numero_nf
    and a.tipo_avaria = p_tipo_avaria
    and (
      (p_produto_codigo is not null and a.produto_codigo = p_produto_codigo)
      or a.produto_nome ilike p_produto_nome
    )
  order by c.data_concessao desc;
$function$;

-- Solicitar cancelamento de abatimento: Comercial solicita como o Financeiro; a Bárbara decide.
CREATE OR REPLACE FUNCTION public.solicitar_cancelamento_abatimento(p_abatimento_id uuid, p_motivo text)
 RETURNS cancelamento_solicitacoes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_abat public.abatimentos%rowtype;
  v_nome text;
  v_sol public.cancelamento_solicitacoes%rowtype;
begin
  if v_uid is null or not (public.is_financeiro() or public.is_comercial()) or public.is_demo() then
    raise exception 'Você não tem permissão para solicitar cancelamentos.' using errcode = '42501';
  end if;
  if public.is_aprovador_cancelamento() then
    raise exception 'A aprovadora cancela diretamente, sem solicitar.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_motivo,''))) < 5 then
    raise exception 'Informe o motivo do cancelamento.' using errcode = '23514';
  end if;

  -- Trava o lançamento: serializa com decisão/cancelamento concorrente.
  select * into v_abat from public.abatimentos where id = p_abatimento_id for update;
  if not found then
    raise exception 'Abatimento não encontrado.' using errcode = 'P0002';
  end if;
  if v_abat.status <> 'ATIVO' then
    raise exception 'Este abatimento já está cancelado.' using errcode = '23514';
  end if;

  select coalesce(nullif(btrim(nome_exibicao),''), name) into v_nome from public.profiles where id = v_uid;

  begin
    insert into public.cancelamento_solicitacoes (tipo, entidade_id, snapshot, motivo, solicitante_id, solicitante_nome)
    values (
      'ABATIMENTO', v_abat.id,
      jsonb_build_object(
        'laboratorio', v_abat.laboratorio, 'filial', v_abat.filial, 'nf', v_abat.nf,
        'valor_abatimento', v_abat.valor_abatimento, 'valor_pago', v_abat.valor_pago, 'data', v_abat.data
      ),
      btrim(p_motivo), v_uid, v_nome
    )
    returning * into v_sol;
  exception when unique_violation then
    raise exception 'Já existe uma solicitação de cancelamento pendente para este lançamento.' using errcode = '23505';
  end;

  insert into public.auditoria (tipo, referencia, detalhe, usuario_id, usuario_nome)
  values ('Cancelamento de abatimento solicitado', v_abat.nf || ' — ' || v_abat.laboratorio,
          'Motivo: ' || btrim(p_motivo), v_uid, v_nome);

  return v_sol;
end;
$function$;

-- Supervisores: sem o bloqueio do Comercial (volta ao corpo original).
CREATE OR REPLACE FUNCTION public.supervisores_lista()
 RETURNS TABLE(id uuid, nome text, cpf text, email text, telefone text, data_nascimento date, cargo text, regiao text, data_inicio date, data_fim date, status text, observacoes text, foto_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  order by s.nome;
$function$;
