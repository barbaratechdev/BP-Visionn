-- Fluxo de aprovação obrigatória pra cancelamento de Abatimentos — FASE B
-- (enforcement). Pré-requisito: FASE A aplicada
-- (20261002000010_abatimentos_cancelamento_fluxo.sql) e frontend novo
-- publicado e recarregado por quem usa o módulo. A partir daqui o banco
-- recusa qualquer mudança de status de abatimento que não venha das
-- funções do fluxo (o frontend ANTIGO deixa de conseguir cancelar), e as
-- linhas de auditoria do fluxo só podem ser gravadas por elas.
--
-- Recuperação de emergência: ver docs/rollback-cancelamento-abatimentos.md
-- (desabilitar os DOIS gatilhos, ou removê-los — o histórico é preservado).
--
-- O gatilho só bloqueia quem executa como papel authenticated/anon
-- (current_user): mudanças feitas de dentro das funções security definer da
-- FASE A rodam como o dono da função e passam.

-- 1) Trava no abatimentos --------------------------------------------------
create or replace function public.abatimentos_proteger_cancelamento()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      if new.status <> 'ATIVO' then
        raise exception 'Um abatimento novo só pode ser criado como ATIVO.' using errcode = '42501';
      end if;
    else
      if new.status is distinct from old.status then
        raise exception 'O status do abatimento só pode ser alterado pelo fluxo de cancelamento (solicitação e aprovação).'
          using errcode = '42501';
      end if;
      -- Enquanto há pedido pendente, os dados que a aprovadora está
      -- avaliando não podem mudar por baixo dela.
      if (new.laboratorio, new.filial, new.nf, new.valor_abatimento, new.valor_pago, new.data)
         is distinct from
         (old.laboratorio, old.filial, old.nf, old.valor_abatimento, old.valor_pago, old.data)
         and exists (
           select 1 from public.cancelamento_solicitacoes s
           where s.tipo = 'ABATIMENTO' and s.entidade_id = old.id and s.status = 'PENDENTE'
         ) then
        raise exception 'Este abatimento tem uma solicitação de cancelamento pendente e não pode ser editado até a decisão.'
          using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger abatimentos_proteger_cancelamento_trigger
  before insert or update on public.abatimentos
  for each row execute function public.abatimentos_proteger_cancelamento();

-- 2) Auditoria do fluxo ----------------------------------------------------
-- A policy "Auditoria - usuário acessa seus dados" (ALL, usuario_id =
-- auth.uid()) deixa qualquer pessoa alterar/apagar as PRÓPRIAS linhas de
-- auditoria, e a de insert não confere usuario_id — dava pra apagar o rastro
-- de uma solicitação ou forjar uma "aprovação" atribuída à Barbára. Esta
-- trava cobre só os tipos de evento deste fluxo (as demais linhas de
-- auditoria seguem como estão; endurecer a tabela toda é outra decisão):
-- só as funções acima (current_user = dono) gravam esses tipos, e ninguém
-- pelo cliente altera ou apaga. A tabela cancelamento_solicitacoes continua
-- sendo o histórico de referência.
create or replace function public.auditoria_proteger_fluxo_cancelamento()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op in ('UPDATE','DELETE')
       and (old.tipo like 'Cancelamento de abatimento %' or old.tipo = 'Abatimento cancelado') then
      raise exception 'Registros de auditoria do cancelamento de abatimentos não podem ser alterados nem apagados.'
        using errcode = '42501';
    end if;
    if tg_op in ('INSERT','UPDATE')
       and (new.tipo like 'Cancelamento de abatimento %' or new.tipo = 'Abatimento cancelado') then
      raise exception 'Registros de auditoria do cancelamento de abatimentos só são gerados pelo fluxo de aprovação.'
        using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger auditoria_proteger_fluxo_cancelamento_trigger
  before insert or update or delete on public.auditoria
  for each row execute function public.auditoria_proteger_fluxo_cancelamento();

