-- Comercial NÃO acessa os dados internos de RH, Supervisores e Representantes.
--
-- Regra definitiva (08/10/2026): o Comercial (is_comercial() = role 'func' + setor 'Comercial')
-- não lê nem escreve nessas três áreas — nem pela tela, nem pela API/JWT:
--   * RH (funcionarios, funcionario_salarios, funcionario_ocorrencias, funcionario_documentos,
--     funcionario_exames, ferias): leitura passa a excluir o Comercial. As policies de ESCRITA do
--     RH já não incluíam o Comercial (pode_gerenciar_funcionarios()) e não são tocadas.
--   * Representantes: leitura e incluir/editar passam a excluir o Comercial (excluir já era só admin).
--   * Supervisores: leitura e incluir/editar (inclui ativar/desativar, que é UPDATE de status)
--     passam a excluir o Comercial (excluir já era só admin). A função supervisores_lista()
--     (SECURITY DEFINER — ignora o RLS da tabela) também passa a devolver zero linhas pro Comercial.
--
-- Estratégia: "and not public.is_comercial()" somado à regra atual de cada policy. Para quem não é
-- Comercial o resultado é exatamente o de antes — Bárbara, Financeiro (lê RH), Kayane (opera RH),
-- Demonstração, teste e teste2 não mudam. Leitura bloqueada devolve ZERO linhas (sem erro).
--
-- NÃO tocados: pode_ver_modulos() (mantém Prorrogação/Avarias/Abatimentos/Contratos do Comercial),
-- Contratos (inclusive os dados do representante gravados no próprio contrato — revisão futura),
-- policies de DELETE, a abertura antiga de supervisores para qualquer autenticado não-demo e a
-- regra por nome de pode_editar_supervisores(). Não altera dados.
-- Reversão: docs/rollback-comercial-sem-dados-internos.md.

-- ===== RH: leitura =====
alter policy "funcionarios_select_rh" on public.funcionarios
  using (public.pode_gerenciar_funcionarios() or (public.pode_ver_modulos() and not public.is_comercial()));

alter policy "funcionario_salarios_select_rh" on public.funcionario_salarios
  using (public.pode_gerenciar_funcionarios() or (public.pode_ver_modulos() and not public.is_comercial()));

alter policy "funcionario_ocorrencias_select_rh" on public.funcionario_ocorrencias
  using (public.pode_gerenciar_funcionarios() or (public.pode_ver_modulos() and not public.is_comercial()));

alter policy "funcionario_documentos_select_rh" on public.funcionario_documentos
  using (public.pode_gerenciar_funcionarios() or (public.pode_ver_modulos() and not public.is_comercial()));

alter policy "funcionario_exames_select_rh" on public.funcionario_exames
  using (public.pode_gerenciar_funcionarios() or (public.pode_ver_modulos() and not public.is_comercial()));

alter policy "ferias_select_rh" on public.ferias
  using (public.pode_gerenciar_funcionarios() or (public.pode_ver_modulos() and not public.is_comercial()));

-- ===== Representantes =====
alter policy "representantes_select_financeiro" on public.representantes
  using ((public.pode_ver_modulos() and not public.is_comercial()) or (public.is_demo() and nome ilike '%TESTE%'));

alter policy "representantes_insert_financeiro" on public.representantes
  with check ((public.is_financeiro() or public.is_rh()) and not public.is_comercial() and not public.is_demo());

alter policy "representantes_update_financeiro" on public.representantes
  using ((public.is_financeiro() or public.is_rh()) and not public.is_comercial() and not public.is_demo())
  with check ((public.is_financeiro() or public.is_rh()) and not public.is_comercial() and not public.is_demo());

-- ===== Supervisores =====
-- "and not is_comercial()" também cobre a regra por nome de pode_editar_supervisores():
-- um Comercial com nome "Ana"/"Esmeralda" continua sem escrever.
alter policy "supervisores_select_authenticated" on public.supervisores
  using (not public.is_demo() and not public.is_comercial());

alter policy "supervisores_insert_admin" on public.supervisores
  with check ((public.is_admin() or public.pode_editar_supervisores()) and not public.is_comercial());

alter policy "supervisores_update_admin" on public.supervisores
  using ((public.is_admin() or public.pode_editar_supervisores()) and not public.is_comercial())
  with check ((public.is_admin() or public.pode_editar_supervisores()) and not public.is_comercial());

-- Mesmo corpo de antes + "and not public.is_comercial()" no filtro (create or replace mantém
-- os privilégios de execução atuais: authenticated e service_role).
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
    and not public.is_comercial()
  order by s.nome;
$function$;
