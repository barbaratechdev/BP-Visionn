-- Controle de Abatimentos: origem de cada desconto e acompanhamento do que
-- já foi efetivamente recuperado. Migration ADITIVA — só adiciona colunas
-- novas; nenhum dado existente é alterado ou apagado, e nenhuma coluna
-- existente muda (inclusive valor_pago, que segue guardado).
--
-- nfd              Nº da NFD (Nota Fiscal de Devolução, emitida pela própria
--                  empresa) que originou o abatimento. Texto livre, opcional.
-- tipo_abatimento  Origem do desconto. Lista fechada; NULL nos registros
--                  antigos (nunca foram classificados).
-- percentual       Percentual de desconto aplicado, quando houver (0 a 100).
-- situacao         PENDENTE (solicitado ao fornecedor, ainda não abatido) ou
--                  REALIZADO (efetivamente abatido). Os registros que já
--                  existem eram "descontos recebidos em boletos", então entram
--                  como REALIZADO (default) e o total de realizados não muda.
--                  É independente do status ATIVO/CANCELADO.
--
-- O "Nº do Boleto" é a coluna que já existe (nf) e o "Fornecedor" é a coluna
-- laboratorio: só os rótulos na tela mudam, não os nomes das colunas.
--
-- Compatibilidade: quem insere/atualiza sem informar as colunas novas (versão
-- anterior do frontend) continua funcionando — tudo tem default ou aceita NULL.
-- Aplicar esta migration ANTES de publicar o frontend que usa os campos novos.
-- RLS e gatilhos existentes não mudam (as policies são por linha).
alter table public.abatimentos
  add column if not exists nfd text,
  add column if not exists tipo_abatimento text
    constraint abatimentos_tipo_abatimento_check
    check (tipo_abatimento in ('Desconto Comercial','Avaria','Desconto Campanha')),
  add column if not exists percentual numeric(5,2)
    constraint abatimentos_percentual_check
    check (percentual >= 0 and percentual <= 100),
  add column if not exists situacao text not null default 'REALIZADO'
    constraint abatimentos_situacao_check
    check (situacao in ('PENDENTE','REALIZADO'));

comment on column public.abatimentos.nfd is 'Nº da NFD (Nota Fiscal de Devolução emitida pela empresa) que originou o abatimento.';
comment on column public.abatimentos.tipo_abatimento is 'Origem do desconto: Desconto Comercial, Avaria ou Desconto Campanha. NULL em registros anteriores à classificação.';
comment on column public.abatimentos.percentual is 'Percentual de desconto aplicado (0 a 100), opcional.';
comment on column public.abatimentos.situacao is 'PENDENTE = solicitado ao fornecedor e ainda não abatido; REALIZADO = efetivamente abatido. Independente de status (ATIVO/CANCELADO).';

create index if not exists abatimentos_tipo_abatimento_idx on public.abatimentos(tipo_abatimento);
create index if not exists abatimentos_situacao_idx on public.abatimentos(situacao);
create index if not exists abatimentos_nfd_idx on public.abatimentos(nfd);
