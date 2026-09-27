-- Novo status operacional ENCERRADA ("Concluída" na tela) — pra quando o
-- Financeiro resolve/encerra uma avaria administrativamente, sem que isso
-- signifique que houve desconto aplicado de verdade. APLICADO continua
-- representando exclusivamente uma aplicação financeira real (mantém seu
-- significado — não é substituído nem redefinido por este status novo).
--
-- ENCERRADA só é alcançável a partir de ABERTA ou CANCELADO, e só volta pra
-- ABERTA ou CANCELADO — nunca a partir de SOLICITADO/EM_ANALISE/CONCEDIDO/
-- APLICADO, e nunca em direção a esses. Isso é o que garante, por
-- construção, que uma avaria ENCERRADA nunca pode ter uma concessão ou
-- aplicação ATIVA vinculada (só se chega em CONCEDIDO/APLICADO através do
-- fluxo real de solicitação, que é uma ramificação completamente separada
-- de ABERTA/CANCELADO/ENCERRADA na máquina de estados abaixo) — dispensa
-- checagem adicional de "concessão/aplicação ativa" no trigger, porque a
-- própria topologia das transições já impede esse cruzamento.
alter table public.avarias drop constraint avarias_status_check;
alter table public.avarias add constraint avarias_status_check
  check (status = any (array['ABERTA','SOLICITADO','EM_ANALISE','CONCEDIDO','NEGADO','APLICADO','CANCELADO','ENCERRADA']));

-- Evento específico de histórico pra alteração manual de status (distinto
-- do STATUS_ALTERADO já usado em transições guiadas como "Marcar em
-- análise") — todos os valores antigos preservados, só adiciona um novo.
alter table public.avaria_historico drop constraint avaria_historico_tipo_check;
alter table public.avaria_historico add constraint avaria_historico_tipo_check
  check (tipo = any (array[
    'AVARIA_CRIADA','AVARIA_EDITADA','AVARIA_CANCELADA','SOLICITACAO_CRIADA','STATUS_ALTERADO',
    'DESCONTO_CONCEDIDO','DESCONTO_NEGADO','DESCONTO_APLICADO','CONCESSAO_CANCELADA',
    'APLICACAO_CANCELADA','SOLICITACAO_CANCELADA','TENTATIVA_DUPLICIDADE','AVARIA_STATUS_ALTERADO'
  ]));

-- Transições novas (só adiciona — nenhuma das 14 combinações já existentes
-- foi removida ou enfraquecida):
--   ABERTA    -> ENCERRADA            (além de SOLICITADO, CANCELADO já existentes)
--   CANCELADO -> ABERTA, ENCERRADA    (além de SOLICITADO já existente)
--   ENCERRADA -> ABERTA, CANCELADO
-- APLICADO -> ENCERRADA continua bloqueado (não está nesta lista) —
-- reforça no banco que uma aplicação financeira ativa nunca pode ser
-- "escondida" por um encerramento administrativo direto.
create or replace function public.avarias_validar_transicao_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'ABERTA' and new.status in ('SOLICITADO','CANCELADO','ENCERRADA'))
      or (old.status = 'SOLICITADO' and new.status in ('EM_ANALISE','CONCEDIDO','NEGADO','CANCELADO'))
      or (old.status = 'EM_ANALISE' and new.status in ('CONCEDIDO','NEGADO','CANCELADO'))
      or (old.status = 'CONCEDIDO' and new.status in ('APLICADO','CANCELADO'))
      or (old.status = 'APLICADO' and new.status = 'CONCEDIDO')
      or (old.status in ('NEGADO','CANCELADO') and new.status = 'SOLICITADO')
      or (old.status = 'CANCELADO' and new.status in ('ABERTA','ENCERRADA'))
      or (old.status = 'ENCERRADA' and new.status in ('ABERTA','CANCELADO'))
    ) then
      raise exception 'Transição de status inválida em avarias: % -> %.', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;
