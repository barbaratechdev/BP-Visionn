-- Novo status "Solicitado" em Prorrogação de Boletos (pendencias.situacao):
-- a prorrogação já foi pedida ao fornecedor e ainda aguarda a resposta.
-- Só amplia a lista permitida; nenhum dado existente muda.

alter table public.pendencias drop constraint pendencias_situacao_check;
alter table public.pendencias add constraint pendencias_situacao_check
  check (situacao in ('Aguardando retorno','Em negociação','Solicitado','Prorrogação Aprovada','Recusado'));

comment on column public.pendencias.situacao is 'Status da negociação com o fornecedor: Aguardando retorno, Em negociação, Solicitado, Prorrogação Aprovada ou Recusado.';

-- Sem mudança de RLS/trigger: situacao segue a mesma regra de antes.
