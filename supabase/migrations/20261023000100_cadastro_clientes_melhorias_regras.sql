-- Cadastro de Clientes — melhorias de 23/10/2026, ETAPA B (aplicar SÓ DEPOIS de publicar a tela nova).
-- Pré-requisito: 20261023000000_cadastro_clientes_melhorias.sql (etapa A).
--
-- Liga no banco as obrigatoriedades que a tela nova já exige:
--   * Origem do cadastro: obrigatória na inclusão; uma origem preenchida não pode ser apagada.
--   * Sintegra: obrigatório na inclusão; um Sintegra preenchido não pode voltar a "não verificado".
--   * Serasa com pendências: valor total obrigatório sempre que o Serasa ou o valor forem alterados.
--   * Representante de outra empresa: nome obrigatório.
--   * Supervisor: novos vínculos (inclusão ou troca) só com supervisor ativo; vínculos antigos ficam.
--   * cadastro_clientes_opcoes() deixa de enviar o código (numero_core) dos representantes: o Código do
--     cadastro é digitado pela equipe interna.
-- Registros antigos: nada é alterado. As regras olham só o que muda — por isso a exclusão e a restauração
-- lógicas (que só mexem em excluido_em) continuam funcionando em cadastros antigos incompletos, e a tela
-- pede os dados que faltam na próxima edição.
--
-- Reversão: docs/rollback-cadastro-clientes-melhorias.md (volta à função da etapa A).

-- Trava: sem a etapa A, as funções abaixo seriam criadas sem erro, mas toda gravação de cadastro
-- falharia depois (as colunas novas não existiriam). Para aqui, antes de alterar qualquer coisa.
do $trava$
declare
  v_faltando text;
begin
  select string_agg(c, ', ' order by c) into v_faltando
  from unnest(array['origem_cadastro', 'representante_tipo', 'representante_externo_nome', 'serasa_valor_pendencias']) as c
  where not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'clientes_cadastro' and column_name = c);
  if v_faltando is not null then
    raise exception 'Etapa A não aplicada: faltam as colunas % em public.clientes_cadastro. Aplique 20261023000000_cadastro_clientes_melhorias.sql antes desta migration.', v_faltando;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.clientes_cadastro'::regclass
                 and conname = 'clientes_cadastro_representante_tipo_coerente') then
    raise exception 'Etapa A incompleta: falta a regra clientes_cadastro_representante_tipo_coerente. Aplique 20261023000000_cadastro_clientes_melhorias.sql antes desta migration.';
  end if;
end
$trava$;

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

  -- Obrigatoriedades (23/10/2026). Só o que muda é conferido: registros antigos incompletos continuam
  -- podendo ser excluídos/restaurados, e a tela pede o que falta na próxima edição.
  if tg_op = 'INSERT' and new.origem_cadastro is null then
    raise exception 'Informe a origem do cadastro.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.origem_cadastro is not null and new.origem_cadastro is null then
    raise exception 'A origem do cadastro não pode ficar em branco.' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and new.sintegra is null then
    raise exception 'Informe a situação do Sintegra.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.sintegra is not null and new.sintegra is null then
    raise exception 'A situação do Sintegra não pode ficar em branco.' using errcode = 'P0001';
  end if;
  if new.representante_tipo = 'EXTERNO' and new.representante_externo_nome is null then
    raise exception 'Informe o nome do representante de outra empresa.' using errcode = 'P0001';
  end if;
  if new.supervisor_id is not null
     and (tg_op = 'INSERT' or new.supervisor_id is distinct from old.supervisor_id)
     and not exists (select 1 from public.supervisores s where s.id = new.supervisor_id and s.status = 'Ativo') then
    raise exception 'Escolha um supervisor ativo.' using errcode = 'P0001';
  end if;

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

  -- Serasa: o valor total só existe com pendências e é obrigatório quando o Serasa ou o valor mudam.
  if new.serasa is distinct from 'COM_PENDENCIAS' then
    new.serasa_valor_pendencias := null;
  elsif new.serasa_valor_pendencias is null
        and (tg_op = 'INSERT' or new.serasa is distinct from old.serasa
             or old.serasa_valor_pendencias is not null) then
    raise exception 'Informe o valor total das pendências do Serasa.' using errcode = 'P0001';
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

-- Listas do formulário: id, nome, supervisor vinculado e status — sem o código (numero_core).
create or replace function public.cadastro_clientes_opcoes()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.cadastro_clientes_pode_ver() then
    raise exception 'Você não tem acesso ao Cadastro de Clientes.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'representantes', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'nome', r.nome,
                                          'supervisor_id', r.supervisor_cadastro_id, 'status', r.status)
                       order by (r.status = 'Ativo') desc, r.nome)
      from public.representantes r), '[]'::jsonb),
    'supervisores', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'status', s.status)
                       order by (s.status = 'Ativo') desc, s.nome)
      from public.supervisores s), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.cadastro_clientes_opcoes() from public, anon;
grant execute on function public.cadastro_clientes_opcoes() to authenticated;
