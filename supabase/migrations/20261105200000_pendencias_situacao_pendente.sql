-- Volta o status "Pendente" em Prorrogação de Boletos (pendencias.situacao):
-- NF incluída cuja prorrogação ainda não foi solicitada ao fornecedor.
-- Fluxo: Pendente -> Solicitado -> Aprovado ou Recusado.
-- Só amplia a lista permitida; nenhum dado existente muda. Os valores
-- antigos ("Aguardando retorno" e "Em negociação") seguem permitidos e são
-- tratados como Solicitado pela tela.

alter table public.pendencias drop constraint pendencias_situacao_check;
alter table public.pendencias add constraint pendencias_situacao_check
  check (situacao in ('Pendente','Aguardando retorno','Em negociação','Solicitado','Prorrogação Aprovada','Recusado'));

comment on column public.pendencias.situacao is 'Situacao da NF em Prorrogacao de Boletos: Pendente (prorrogacao ainda nao solicitada), Solicitado, Prorrogação Aprovada ou Recusado. Aguardando retorno e Em negociação sao valores antigos, tratados como Solicitado.';
