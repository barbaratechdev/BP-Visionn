-- Exclusão LÓGICA de abatimentos CANCELADOS (soft delete).
--
-- Objetivo: tirar da lista um lançamento que já foi cancelado, sem apagar nada do banco.
-- Excluir ≠ cancelar: o cancelamento continua sendo o fluxo de solicitação/aprovação
-- (20261002000010/20261002000020); a exclusão só existe DEPOIS dele.
--
-- O que esta migration faz (e SÓ isso):
--   1) abatimentos ganha excluido_em / excluido_por / excluido_por_nome (nulos = visível).
--      Nenhuma linha existente é alterada.
--   2) Policy RESTRICTIVE de SELECT: linha excluída deixa de ser lida pelo cliente (lista,
--      busca global, recarga). Como o UPDATE pelo cliente também depende do SELECT, a linha
--      excluída fica congelada. As policies existentes NÃO são alteradas.
--   3) Gatilho abatimentos_proteger_exclusao: pelo cliente (authenticated/anon) ninguém grava
--      as colunas de exclusão — nem no INSERT nem no UPDATE (Financeiro/Comercial têm UPDATE
--      na tabela e, sem isso, poderiam "excluir" até lançamento ativo via API).
--   4) Função excluir_abatimento_cancelado(p_abatimento_id): única forma de excluir. Exige a
--      aprovadora do cancelamento (is_aprovador_cancelamento(), a mesma permissão que já
--      cancela direto — nenhuma regra nova por nome/id), fora da demonstração, e status
--      CANCELADO. Realizado/pendente (ATIVO) é recusado. Grava a auditoria no servidor.
--   5) auditoria_proteger_fluxo_cancelamento passa a proteger também o tipo
--      'Abatimento excluído' (o cliente não forja, não altera e não apaga essas linhas).
--
-- Não há policy de DELETE em abatimentos e esta migration não cria nenhuma: exclusão física
-- continua impossível pelo cliente. Não altera dados, não desliga RLS, não toca em outras
-- tabelas além de abatimentos e do gatilho de auditoria do fluxo de cancelamento.
--
-- Reversão (o histórico é preservado; linhas excluídas voltam a aparecer):
--   drop function public.excluir_abatimento_cancelado(uuid);
--   drop trigger abatimentos_proteger_exclusao_trigger on public.abatimentos;
--   drop function public.abatimentos_proteger_exclusao();
--   drop policy "abatimentos_oculta_excluidos" on public.abatimentos;
--   (opcional) restaurar auditoria_proteger_fluxo_cancelamento da 20261002000020.
--   As colunas podem ficar (nulas não afetam nada).

-- 1) Colunas -----------------------------------------------------------------
alter table public.abatimentos
  add column excluido_em timestamptz,
  add column excluido_por uuid,
  add column excluido_por_nome text;

-- 2) Linha excluída não é lida pelo cliente ------------------------------------
create policy "abatimentos_oculta_excluidos" on public.abatimentos
  as restrictive
  for select
  to public
  using (excluido_em is null);

-- 3) Colunas de exclusão só pela função ----------------------------------------
create or replace function public.abatimentos_proteger_exclusao()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      if new.excluido_em is not null or new.excluido_por is not null or new.excluido_por_nome is not null then
        raise exception 'Um abatimento novo não pode nascer excluído.' using errcode = '42501';
      end if;
    elsif (new.excluido_em, new.excluido_por, new.excluido_por_nome)
          is distinct from (old.excluido_em, old.excluido_por, old.excluido_por_nome) then
      raise exception 'A exclusão de abatimentos só é feita pela função de exclusão.' using errcode = '42501';
    elsif old.excluido_em is not null then
      raise exception 'Este abatimento foi excluído e não pode ser alterado.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger abatimentos_proteger_exclusao_trigger
  before insert or update on public.abatimentos
  for each row execute function public.abatimentos_proteger_exclusao();

-- 4) Exclusão (somente cancelados) ---------------------------------------------
create or replace function public.excluir_abatimento_cancelado(p_abatimento_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_abat public.abatimentos%rowtype;
  v_nome text;
begin
  if v_uid is null or not public.is_aprovador_cancelamento() or public.is_demo() then
    raise exception 'Você não tem permissão para excluir abatimentos.' using errcode = '42501';
  end if;

  select * into v_abat from public.abatimentos where id = p_abatimento_id for update;
  if not found or v_abat.excluido_em is not null then
    raise exception 'Abatimento não encontrado.' using errcode = 'P0002';
  end if;
  if v_abat.status <> 'CANCELADO' then
    raise exception 'Somente abatimentos cancelados podem ser excluídos.' using errcode = '23514';
  end if;

  select coalesce(nullif(btrim(nome_exibicao),''), name) into v_nome from public.profiles where id = v_uid;

  update public.abatimentos
     set excluido_em = now(), excluido_por = v_uid, excluido_por_nome = v_nome
   where id = v_abat.id;

  insert into public.auditoria (tipo, referencia, detalhe, usuario_id, usuario_nome)
  values ('Abatimento excluído', v_abat.nf || ' — ' || v_abat.laboratorio,
          'Lançamento cancelado removido da lista (exclusão lógica; o registro permanece no banco)',
          v_uid, v_nome);
end;
$$;

revoke execute on function public.excluir_abatimento_cancelado(uuid) from public, anon;
grant execute on function public.excluir_abatimento_cancelado(uuid) to authenticated;

-- 5) Auditoria da exclusão protegida como a do cancelamento ---------------------
-- Mesmo corpo da 20261002000020, acrescentando só o tipo 'Abatimento excluído'.
create or replace function public.auditoria_proteger_fluxo_cancelamento()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op in ('UPDATE','DELETE')
       and (old.tipo like 'Cancelamento de abatimento %' or old.tipo = 'Abatimento cancelado' or old.tipo = 'Abatimento excluído') then
      raise exception 'Registros de auditoria do cancelamento de abatimentos não podem ser alterados nem apagados.'
        using errcode = '42501';
    end if;
    if tg_op in ('INSERT','UPDATE')
       and (new.tipo like 'Cancelamento de abatimento %' or new.tipo = 'Abatimento cancelado' or new.tipo = 'Abatimento excluído') then
      raise exception 'Registros de auditoria do cancelamento de abatimentos só são gerados pelo fluxo de aprovação.'
        using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
