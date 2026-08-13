-- "Aprovado" em pendencias.situacao ficava ambíguo: parecia que o boleto em
-- si tinha sido aprovado, quando na verdade é a prorrogação do vencimento
-- que foi aprovada junto ao fornecedor. Renomeia o valor pra
-- "Prorrogação Aprovada" (dado existente preservado) e passa a exigir a
-- data em que essa aprovação aconteceu.

update public.pendencias set situacao = 'Prorrogação Aprovada' where situacao = 'Aprovado';

alter table public.pendencias drop constraint pendencias_situacao_check;
alter table public.pendencias add constraint pendencias_situacao_check
  check (situacao in ('Aguardando retorno','Em negociação','Prorrogação Aprovada','Recusado'));

alter table public.pendencias add column data_aprovacao_prorrogacao date;

-- Garante no banco que não dá pra marcar a prorrogação como aprovada sem
-- informar quando isso aconteceu — mesma regra que a UI já aplica antes de
-- enviar o update (defesa em profundidade, não só validação client-side).
alter table public.pendencias add constraint pendencias_data_aprovacao_check
  check (situacao <> 'Prorrogação Aprovada' or data_aprovacao_prorrogacao is not null);

comment on column public.pendencias.situacao is 'Status da negociação com o fornecedor: Aguardando retorno, Em negociação, Prorrogação Aprovada ou Recusado.';
comment on column public.pendencias.data_aprovacao_prorrogacao is 'Data em que a prorrogação do vencimento foi aprovada pelo fornecedor. Obrigatória quando situacao = Prorrogação Aprovada.';

-- Sem mudança de RLS/trigger: data_aprovacao_prorrogacao segue a mesma regra
-- que situacao (não entra na lista admin-only de proteger_pendencias_campos
-- em 20260812010000) — Financeiro continua podendo registrar a aprovação.
