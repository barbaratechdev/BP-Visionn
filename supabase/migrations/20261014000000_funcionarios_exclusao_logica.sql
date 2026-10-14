-- Exclusão LÓGICA de funcionários (RH) — mesmo padrão de 20261013000000_abatimentos_exclusao_logica.sql.
--
-- Objetivo: tirar um funcionário da listagem do RH sem apagar nada do banco. As tabelas
-- ligadas a ele (funcionario_salarios, funcionario_exames, funcionario_documentos, ferias,
-- funcionario_ocorrencias) têm FK com ON DELETE CASCADE: um DELETE físico apagaria todo o
-- histórico. Por isso a exclusão é só lógica e o DELETE físico deixa de ser possível.
--
-- O que esta migration faz (e SÓ isso):
--   1) funcionarios ganha excluido_em / excluido_por / excluido_por_nome (nulos = visível).
--      Nenhuma linha existente é alterada.
--   2) Policy RESTRICTIVE de SELECT: funcionário excluído deixa de ser lido pelo cliente
--      (lista do RH, perfil, busca global, nome embutido nas férias). Como o UPDATE pelo
--      cliente também depende do SELECT, o cadastro excluído fica congelado. As policies
--      existentes de select/insert/update NÃO são alteradas.
--   3) Gatilho funcionarios_proteger_exclusao: pelo cliente (authenticated/anon) ninguém grava
--      as colunas de exclusão (o RH tem UPDATE na tabela e, sem isso, poderia "excluir" via API).
--   4) Função excluir_funcionario(p_funcionario_id): única forma de excluir. Exige a mesma
--      autorização da exclusão de abatimentos — is_aprovador_cancelamento() (hoje só a Bárbara)
--      — fora da demonstração, e SOMENTE funcionário com status 'Inativo' (ativo é recusado,
--      inclusive para a pessoa autorizada). Grava a auditoria no servidor.
--   5) Remove a policy "funcionarios_delete_admin" (DELETE físico pela admin, em cascata).
--      Nenhuma tela usa DELETE em funcionarios. As policies das tabelas filhas NÃO são tocadas.
--   6) auditoria_proteger_fluxo_cancelamento passa a proteger também o tipo 'Funcionário excluído'
--      (corpo da 20261013000000 + esse tipo).
--
-- Não altera dados, não desliga RLS, não toca nas tabelas filhas (o histórico continua lá,
-- com os mesmos vínculos).
--
-- Reversão (o histórico é preservado; funcionários excluídos voltam a aparecer):
--   drop function public.excluir_funcionario(uuid);
--   drop trigger funcionarios_proteger_exclusao_trigger on public.funcionarios;
--   drop function public.funcionarios_proteger_exclusao();
--   drop policy "funcionarios_oculta_excluidos" on public.funcionarios;
--   create policy "funcionarios_delete_admin" on public.funcionarios for delete to authenticated
--     using (public.is_admin());
--   (opcional) restaurar auditoria_proteger_fluxo_cancelamento da 20261013000000.
--   As colunas podem ficar (nulas não afetam nada).

-- 1) Colunas -----------------------------------------------------------------
alter table public.funcionarios
  add column excluido_em timestamptz,
  add column excluido_por uuid,
  add column excluido_por_nome text;

-- 2) Funcionário excluído não é lido pelo cliente --------------------------------
create policy "funcionarios_oculta_excluidos" on public.funcionarios
  as restrictive
  for select
  to public
  using (excluido_em is null);

-- 3) Colunas de exclusão só pela função ------------------------------------------
create or replace function public.funcionarios_proteger_exclusao()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      if new.excluido_em is not null or new.excluido_por is not null or new.excluido_por_nome is not null then
        raise exception 'Um funcionário novo não pode nascer excluído.' using errcode = '42501';
      end if;
    elsif (new.excluido_em, new.excluido_por, new.excluido_por_nome)
          is distinct from (old.excluido_em, old.excluido_por, old.excluido_por_nome) then
      raise exception 'A exclusão de funcionários só é feita pela função de exclusão.' using errcode = '42501';
    elsif old.excluido_em is not null then
      raise exception 'Este funcionário foi excluído e não pode ser alterado.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger funcionarios_proteger_exclusao_trigger
  before insert or update on public.funcionarios
  for each row execute function public.funcionarios_proteger_exclusao();

-- 4) Exclusão ------------------------------------------------------------------
create or replace function public.excluir_funcionario(p_funcionario_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_func public.funcionarios%rowtype;
  v_nome text;
begin
  if v_uid is null or not public.is_aprovador_cancelamento() or public.is_demo() then
    raise exception 'Você não tem permissão para excluir funcionários.' using errcode = '42501';
  end if;

  select * into v_func from public.funcionarios where id = p_funcionario_id for update;
  if not found or v_func.excluido_em is not null then
    raise exception 'Funcionário não encontrado.' using errcode = 'P0002';
  end if;
  if v_func.status <> 'Inativo' then
    raise exception 'Somente funcionários inativos podem ser excluídos.' using errcode = '23514';
  end if;

  select coalesce(nullif(btrim(nome_exibicao),''), name) into v_nome from public.profiles where id = v_uid;

  update public.funcionarios
     set excluido_em = now(), excluido_por = v_uid, excluido_por_nome = v_nome
   where id = v_func.id;

  insert into public.auditoria (tipo, referencia, detalhe, usuario_id, usuario_nome)
  values ('Funcionário excluído', v_func.nome,
          'Removido da listagem do RH (exclusão lógica; cadastro e histórico permanecem no banco)',
          v_uid, v_nome);
end;
$$;

revoke execute on function public.excluir_funcionario(uuid) from public, anon;
grant execute on function public.excluir_funcionario(uuid) to authenticated;

-- 5) Sem DELETE físico de funcionário ---------------------------------------------
drop policy "funcionarios_delete_admin" on public.funcionarios;

-- 6) Auditoria da exclusão protegida -----------------------------------------------
-- Mesmo corpo da 20261013000000, acrescentando só o tipo 'Funcionário excluído'.
create or replace function public.auditoria_proteger_fluxo_cancelamento()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op in ('UPDATE','DELETE')
       and (old.tipo like 'Cancelamento de abatimento %' or old.tipo = 'Abatimento cancelado' or old.tipo = 'Abatimento excluído' or old.tipo = 'Funcionário excluído') then
      raise exception 'Registros de auditoria do cancelamento de abatimentos não podem ser alterados nem apagados.'
        using errcode = '42501';
    end if;
    if tg_op in ('INSERT','UPDATE')
       and (new.tipo like 'Cancelamento de abatimento %' or new.tipo = 'Abatimento cancelado' or new.tipo = 'Abatimento excluído' or new.tipo = 'Funcionário excluído') then
      raise exception 'Registros de auditoria do cancelamento de abatimentos só são gerados pelo fluxo de aprovação.'
        using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
