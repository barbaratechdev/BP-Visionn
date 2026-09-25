-- Validação de transição de status em avarias — reforça no banco a mesma
-- máquina de estados que hoje só é garantida pela interface (o único
-- lugar que muda avarias.status é atualizarStatusAvaria() em
-- AvariaDetalhe.tsx, chamada com um valor fixo por ação de negócio
-- específica, nunca por um seletor livre). Sem essa trave, um UPDATE
-- direto via API poderia pular etapa ou voltar um status já concluído
-- sem passar pela ação correta.
--
-- Só valida quando o status de fato muda (new.status is distinct from
-- old.status) — updates comuns que não tocam status (ex.: "Editar
-- dados", que grava filial/NF/produto/etc. sem mexer em status) continuam
-- livres, sem precisar bater em nenhuma regra de transição.
--
-- Transições aceitas, conferidas uma a uma contra todo lugar do frontend
-- que hoje chama atualizarStatusAvaria (AvariaDetalhe.tsx):
--   ABERTA              -> SOLICITADO, CANCELADO
--   SOLICITADO          -> EM_ANALISE, CONCEDIDO, NEGADO, CANCELADO
--   EM_ANALISE          -> CONCEDIDO, NEGADO, CANCELADO
--   CONCEDIDO           -> APLICADO, CANCELADO
--   APLICADO            -> CONCEDIDO   (cancelar a última aplicação ativa
--                                       devolve a avaria pra CONCEDIDO —
--                                       ver cancelarAplicacao; sem esta
--                                       linha essa ação já testada quebra)
--   NEGADO, CANCELADO   -> SOLICITADO  (nova tentativa/retry)
create or replace function public.avarias_validar_transicao_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'ABERTA' and new.status in ('SOLICITADO','CANCELADO'))
      or (old.status = 'SOLICITADO' and new.status in ('EM_ANALISE','CONCEDIDO','NEGADO','CANCELADO'))
      or (old.status = 'EM_ANALISE' and new.status in ('CONCEDIDO','NEGADO','CANCELADO'))
      or (old.status = 'CONCEDIDO' and new.status in ('APLICADO','CANCELADO'))
      or (old.status = 'APLICADO' and new.status = 'CONCEDIDO')
      or (old.status in ('NEGADO','CANCELADO') and new.status = 'SOLICITADO')
    ) then
      raise exception 'Transição de status inválida em avarias: % -> %.', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger avarias_validar_transicao_status_trigger
  before update on public.avarias
  for each row execute function public.avarias_validar_transicao_status();
