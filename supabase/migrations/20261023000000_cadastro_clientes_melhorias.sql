-- Cadastro de Clientes — melhorias de 23/10/2026, ETAPA A (compatível com a tela anterior).
--
-- Publicação em duas etapas, para a tela antiga nunca ficar incompatível com o banco:
--   1) esta migration (A): só ACRESCENTA — colunas novas, o valor "Habilitado com restrição" no Sintegra,
--      Código manual, representante de outra empresa e histórico dos campos novos. Nenhuma regra nova de
--      obrigatoriedade: a tela anterior continua incluindo e editando normalmente;
--   2) publicar a tela nova;
--   3) migration 20261023000100 (B): liga as obrigatoriedades no banco.
--
-- Decisões (Bárbara, 23/10/2026):
--   * Origem do cadastro: Televendas, Vendedor, Supervisor ou Representante (independente do campo Televendas).
--   * Sintegra: Habilitado (regular), Não habilitado (alerta), Habilitado com restrição (pendência).
--     Registros antigos sem Sintegra ficam como estão ("não verificado") até a próxima edição.
--   * Código: digitado pela equipe interna (não vem mais do numero_core do representante); todos que
--     acessam o módulo veem; só quem edita o módulo altera (policy de update já existente).
--   * Serasa com pendências: valor total das pendências (uma soma, não cada dívida).
--   * Representante de outra empresa: só o nome, gravado no cadastro — nunca na tabela representantes.
--   * Nenhum dado existente é apagado ou alterado: as colunas novas começam vazias e
--     representante_tipo começa como INTERNO (todos os cadastros atuais são da nossa empresa).
--   * Policies, RLS e permissões de tabela NÃO mudam (as colunas novas seguem as permissões da tabela).
--
-- Reversão: docs/rollback-cadastro-clientes-melhorias.md (e só faz sentido antes do uso real das colunas).

-- 1) Colunas novas ----------------------------------------------------------------------------------
alter table public.clientes_cadastro
  add column origem_cadastro text
    check (origem_cadastro in ('TELEVENDAS', 'VENDEDOR', 'SUPERVISOR', 'REPRESENTANTE')),
  add column representante_tipo text not null default 'INTERNO'
    check (representante_tipo in ('INTERNO', 'EXTERNO')),
  add column representante_externo_nome text,
  add column serasa_valor_pendencias numeric(14,2)
    check (serasa_valor_pendencias is null or serasa_valor_pendencias > 0);

-- Representante de outra empresa: só o nome; nunca junto com um representante da lista oficial.
alter table public.clientes_cadastro add constraint clientes_cadastro_representante_tipo_coerente check (
  (representante_tipo = 'INTERNO' and representante_externo_nome is null)
  or (representante_tipo = 'EXTERNO' and representante_externo_nome is not null and representante_id is null)
);

-- Sintegra: novo valor "Habilitado com restrição".
alter table public.clientes_cadastro drop constraint clientes_cadastro_sintegra_check;
alter table public.clientes_cadastro add constraint clientes_cadastro_sintegra_check
  check (sintegra in ('HABILITADO', 'NAO_HABILITADO', 'HABILITADO_COM_RESTRICAO'));

comment on column public.clientes_cadastro.origem_cadastro is 'Origem do cadastro: TELEVENDAS, VENDEDOR, SUPERVISOR ou REPRESENTANTE. Vazio só em registros anteriores a 23/10/2026.';
comment on column public.clientes_cadastro.representante_tipo is 'INTERNO = representante da lista oficial (representante_id); EXTERNO = de outra empresa (representante_externo_nome).';
comment on column public.clientes_cadastro.representante_externo_nome is 'Nome do representante de outra empresa que encaminhou o cliente. Não é cadastrado em public.representantes.';
comment on column public.clientes_cadastro.representante_codigo is 'Código digitado pela equipe interna (desde 23/10/2026 não é mais copiado do numero_core do representante).';
comment on column public.clientes_cadastro.serasa_valor_pendencias is 'Serasa com pendências: valor total (soma de todas as pendências), em reais.';
comment on column public.clientes_cadastro.sintegra is 'HABILITADO (regular), NAO_HABILITADO (alerta) ou HABILITADO_COM_RESTRICAO (pendência). Vazio só em registros antigos = não verificado (pendência).';
comment on column public.clientes_cadastro.doc_controlados is 'OK ou NAO_CADASTRADO (não trabalha com controlados, regular); vazio = não informado (pendência, regra de 23/10/2026).';

-- 2) Antes de gravar (sem obrigatoriedades novas nesta etapa) ---------------------------------------
create or replace function public.clientes_cadastro_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text;
begin
  if v_uid is null then
    raise exception 'Faça login para gravar cadastros de clientes.' using errcode = '42501';
  end if;
  select coalesce(nullif(btrim(nome_exibicao), ''), name) into v_nome from public.profiles where id = v_uid;

  new.razao_social := btrim(new.razao_social);
  new.codigo_razao_social := nullif(btrim(new.codigo_razao_social), '');
  new.cnpj := nullif(regexp_replace(coalesce(new.cnpj, ''), '[^0-9]', '', 'g'), '');
  new.grupo := nullif(btrim(new.grupo), '');
  new.televendas := nullif(btrim(new.televendas), '');
  new.responsavel_nome := nullif(btrim(new.responsavel_nome), '');
  new.telefone := nullif(btrim(new.telefone), '');
  new.email := nullif(btrim(new.email), '');
  new.observacoes := nullif(btrim(new.observacoes), '');
  -- Código: digitado pela equipe interna (não é mais copiado do representante).
  new.representante_codigo := nullif(btrim(new.representante_codigo), '');
  new.representante_tipo := coalesce(new.representante_tipo, 'INTERNO');
  new.representante_externo_nome := nullif(btrim(new.representante_externo_nome), '');

  -- Representante: da lista oficial (nome copiado da tabela) ou de outra empresa (só o nome digitado).
  if new.representante_tipo = 'EXTERNO' then
    new.representante_id := null;
    new.representante_nome := null;
  else
    new.representante_externo_nome := null;
    if new.representante_id is null then
      new.representante_nome := null;
    elsif tg_op = 'INSERT' or new.representante_id is distinct from old.representante_id then
      select r.nome into new.representante_nome from public.representantes r where r.id = new.representante_id;
    else
      new.representante_nome := old.representante_nome;
    end if;
  end if;
  if new.supervisor_id is null then
    new.supervisor_nome := null;
  elsif tg_op = 'INSERT' or new.supervisor_id is distinct from old.supervisor_id then
    select s.nome into new.supervisor_nome from public.supervisores s where s.id = new.supervisor_id;
  else
    new.supervisor_nome := old.supervisor_nome;
  end if;

  -- Serasa: o valor total só existe com pendências.
  if new.serasa is distinct from 'COM_PENDENCIAS' then
    new.serasa_valor_pendencias := null;
  end if;

  if tg_op = 'INSERT' then
    new.situacao := 'PENDENTE';
    new.created_by := v_uid;
    new.created_by_nome := v_nome;
    new.created_at := now();
    new.excluido_em := null;
    new.excluido_por := null;
    new.excluido_por_nome := null;
  else
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_by_nome := old.created_by_nome;
    new.created_at := old.created_at;
    -- Exclusão/restauração lógica: só quem administra o módulo (Bárbara).
    if (new.excluido_em is null) is distinct from (old.excluido_em is null) then
      if not public.cadastro_clientes_pode_administrar() then
        raise exception 'Somente a administração pode excluir ou restaurar cadastros.' using errcode = '42501';
      end if;
      if new.excluido_em is not null then
        new.excluido_em := now();
        new.excluido_por := v_uid;
        new.excluido_por_nome := v_nome;
      else
        new.excluido_por := null;
        new.excluido_por_nome := null;
      end if;
    else
      new.excluido_em := old.excluido_em;
      new.excluido_por := old.excluido_por;
      new.excluido_por_nome := old.excluido_por_nome;
    end if;
  end if;
  new.updated_by := v_uid;
  new.updated_by_nome := v_nome;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.clientes_cadastro_antes_gravar() from public, anon, authenticated;

-- 3) Histórico: campos novos -----------------------------------------------------------------------
create or replace function public.clientes_cadastro_registrar_historico()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text;
  v_novo jsonb := to_jsonb(new);
  v_velho jsonb;
  v_campo text;
  v_tipo text;
  v_anterior text;
  v_atual text;
  c_campos constant text[] := array[
    'razao_social', 'codigo_razao_social', 'cnpj', 'grupo', 'televendas', 'responsavel_nome', 'telefone',
    'email', 'origem_cadastro', 'representante_tipo', 'representante_id', 'representante_externo_nome',
    'representante_codigo', 'supervisor_id', 'data_inclusao_target', 'observacoes', 'situacao',
    'doc_contrato_social', 'doc_cnpj', 'doc_crf', 'doc_fotos', 'doc_notas', 'doc_controlados',
    'alvara_prefeitura_vencimento', 'alvara_sanitario_vencimento', 'sintegra', 'serasa', 'serasa_valor_pendencias'
  ];
begin
  select coalesce(nullif(btrim(nome_exibicao), ''), name) into v_nome from public.profiles where id = v_uid;

  if tg_op = 'INSERT' then
    insert into public.clientes_cadastro_historico (cadastro_id, tipo, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
    values (new.id, 'INCLUSAO', null, null, new.razao_social, v_uid, v_nome);
    return null;
  end if;

  v_velho := to_jsonb(old);
  foreach v_campo in array c_campos loop
    v_anterior := v_velho->>v_campo;
    v_atual := v_novo->>v_campo;
    if v_anterior is distinct from v_atual then
      -- Representante/supervisor: o histórico mostra o nome, não o id.
      if v_campo = 'representante_id' then
        v_campo := 'representante'; v_anterior := old.representante_nome; v_atual := new.representante_nome;
      elsif v_campo = 'supervisor_id' then
        v_campo := 'supervisor'; v_anterior := old.supervisor_nome; v_atual := new.supervisor_nome;
      end if;
      v_tipo := case
        when v_campo = 'situacao' then 'SITUACAO'
        when v_campo like 'doc\_%' or v_campo like 'alvara\_%' or v_campo in ('sintegra', 'serasa', 'serasa_valor_pendencias') then 'DOCUMENTO'
        else 'ALTERACAO' end;
      insert into public.clientes_cadastro_historico (cadastro_id, tipo, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
      values (new.id, v_tipo, v_campo, v_anterior, v_atual, v_uid, v_nome);
    end if;
  end loop;

  if old.excluido_em is null and new.excluido_em is not null then
    insert into public.clientes_cadastro_historico (cadastro_id, tipo, usuario_id, usuario_nome)
    values (new.id, 'EXCLUSAO', v_uid, v_nome);
  elsif old.excluido_em is not null and new.excluido_em is null then
    insert into public.clientes_cadastro_historico (cadastro_id, tipo, usuario_id, usuario_nome)
    values (new.id, 'RESTAURACAO', v_uid, v_nome);
  end if;
  return null;
end;
$$;
revoke all on function public.clientes_cadastro_registrar_historico() from public, anon, authenticated;
