# Rollback — leitura geral por setor + Comercial opera (migration `20261007000100`)

A migration `20261007000100_leitura_geral_e_comercial_opera.sql` só altera expressões de policies,
cria `pode_ver_modulos()` e troca uma condição em 4 funções. **Não altera dados**, então reverter
não perde nada. O bloco abaixo restaura exatamente o estado de produção lido em 07/10/2026,
**depois** da migration `20261007000000` (Comercial somente leitura) — que continua valendo e
tem seu próprio rollback em `docs/rollback-comercial-jefferson.md`.

## Ordem

1. **Frontend primeiro** (se já publicado): `git revert` do commit do frontend.
2. **Banco**: bloco `rollback-leitura-geral` (um comando só; atômico quando aplicado pelo método das
   fases anteriores, em um `DO`).
3. Conferir com o bloco `verificar-leitura-geral`.
4. Para reaplicar depois: `delete from supabase_migrations.schema_migrations where version = '20261007000100';`

## 1. Reverter

```sql rollback-leitura-geral
alter policy "pendencias_select_financeiro" on public.pendencias
  using (((public.is_financeiro() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "abatimentos_select_financeiro" on public.abatimentos
  using (((public.is_financeiro() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "avarias_select_financeiro" on public.avarias
  using (((public.is_financeiro() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "avaria_historico_select_financeiro" on public.avaria_historico
  using (((public.is_financeiro() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "avaria_solicitacoes_select_financeiro" on public.avaria_solicitacoes
  using (((public.is_financeiro() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "avaria_concessoes_select_financeiro" on public.avaria_concessoes
  using (((public.is_financeiro() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "avaria_aplicacoes_select_financeiro" on public.avaria_aplicacoes
  using (((public.is_financeiro() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "contratos_select_financeiro" on public.contratos
  using ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "representantes_select_financeiro" on public.representantes
  using ((public.is_financeiro() OR public.is_rh() OR (public.is_demo() AND (nome ~~* '%TESTE%'::text))));

alter policy "funcionarios_select_rh" on public.funcionarios
  using (public.pode_gerenciar_funcionarios());

alter policy "funcionario_salarios_select_rh" on public.funcionario_salarios
  using (public.pode_gerenciar_funcionarios());

alter policy "funcionario_ocorrencias_select_rh" on public.funcionario_ocorrencias
  using (public.pode_gerenciar_funcionarios());

alter policy "funcionario_documentos_select_rh" on public.funcionario_documentos
  using (public.pode_gerenciar_funcionarios());

alter policy "funcionario_exames_select_rh" on public.funcionario_exames
  using (public.pode_gerenciar_funcionarios());

alter policy "ferias_select_rh" on public.ferias
  using (public.pode_gerenciar_funcionarios());

alter policy "cancelamento_solicitacoes_select_financeiro" on public.cancelamento_solicitacoes
  using (((public.is_financeiro() OR public.is_aprovador_cancelamento()) AND (NOT public.is_demo())));

alter policy "supervisores_select_authenticated" on public.supervisores
  using (((NOT public.is_demo()) AND (NOT public.is_comercial())));

alter policy "pendencias_insert_financeiro" on public.pendencias
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "pendencias_update_financeiro" on public.pendencias
  using ((public.is_financeiro() AND (NOT public.is_demo())))
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "abatimentos_insert_financeiro" on public.abatimentos
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "abatimentos_update_financeiro" on public.abatimentos
  using ((public.is_financeiro() AND (NOT public.is_demo())))
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avarias_insert_financeiro" on public.avarias
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avarias_update_financeiro" on public.avarias
  using ((public.is_financeiro() AND (NOT public.is_demo())))
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avaria_solicitacoes_insert_financeiro" on public.avaria_solicitacoes
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avaria_solicitacoes_update_financeiro" on public.avaria_solicitacoes
  using ((public.is_financeiro() AND (NOT public.is_demo())))
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avaria_concessoes_insert_financeiro" on public.avaria_concessoes
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avaria_concessoes_update_financeiro" on public.avaria_concessoes
  using ((public.is_financeiro() AND (NOT public.is_demo())))
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avaria_aplicacoes_insert_financeiro" on public.avaria_aplicacoes
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avaria_aplicacoes_update_financeiro" on public.avaria_aplicacoes
  using ((public.is_financeiro() AND (NOT public.is_demo())))
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "avaria_historico_insert_financeiro" on public.avaria_historico
  with check ((public.is_financeiro() AND (NOT public.is_demo())));

alter policy "representantes_insert_financeiro" on public.representantes
  with check (((public.is_financeiro() OR public.is_rh()) AND (NOT public.is_demo())));

alter policy "representantes_update_financeiro" on public.representantes
  using (((public.is_financeiro() OR public.is_rh()) AND (NOT public.is_demo())))
  with check (((public.is_financeiro() OR public.is_rh()) AND (NOT public.is_demo())));

alter policy "supervisores_insert_admin" on public.supervisores
  with check ((public.is_admin() OR public.pode_editar_supervisores()));

alter policy "supervisores_update_admin" on public.supervisores
  using ((public.is_admin() OR public.pode_editar_supervisores()))
  with check ((public.is_admin() OR public.pode_editar_supervisores()));

CREATE OR REPLACE FUNCTION public.proteger_pendencias_campos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_financeiro() then
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
  where (public.is_financeiro() and not public.is_demo())
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
  if v_uid is null or not public.is_financeiro() or public.is_demo() then
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

-- Por último: nenhuma policy usa mais pode_ver_modulos().
drop function public.pode_ver_modulos();
```

## 2. Verificar (somente leitura)

```sql verificar-leitura-geral
select to_regprocedure('public.pode_ver_modulos()') as pode_ver_modulos_existe;  -- esperado: nulo
select count(*) as policies_com_pode_ver_modulos from pg_policies where coalesce(qual,'')||coalesce(with_check,'') ilike '%pode_ver_modulos%';  -- esperado: 0
select pg_get_functiondef('public.supervisores_lista()'::regprocedure) ilike '%is_comercial%' as lista_cita_comercial;  -- esperado: true (estado da migration 20261007000000)
select pg_get_functiondef('public.proteger_pendencias_campos()'::regprocedure) ilike '%is_comercial%' as trigger_cita_comercial;  -- esperado: false
```
