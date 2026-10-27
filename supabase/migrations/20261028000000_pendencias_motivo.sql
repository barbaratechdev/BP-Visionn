-- Prorrogação de Boletos — Motivo (28/10/2026), ETAPA A (compatível com a tela anterior).
--
-- Publicação em duas etapas, para a tela antiga nunca ficar incompatível com o banco:
--   1) esta migration (A): só ACRESCENTA a coluna motivo, com os dois valores permitidos. Nenhuma
--      obrigatoriedade: a tela anterior continua incluindo, aprovando e editando normalmente;
--   2) publicar a tela nova (que já exige o motivo na inclusão);
--   3) migration 20261028000100 (B): liga a obrigatoriedade no banco.
--
-- Decisões:
--   * Motivo: "Atraso na entrega" ou "Prazo diferente do acordado". O valor gravado é o próprio rótulo,
--     como já acontece com estado e situacao nesta tabela.
--   * Boletos existentes ficam sem motivo (vazio = "Não informado" na tela); nada é alterado neles.
--   * Policies, RLS, permissões, situação, valores, vencimentos e a regra de aprovação NÃO mudam
--     (a coluna segue as permissões da tabela).
--
-- Reversão: docs/rollback-boletos-motivo.md.

alter table public.pendencias add column motivo text
  check (motivo in ('Atraso na entrega', 'Prazo diferente do acordado'));

comment on column public.pendencias.motivo is 'Motivo do boleto: Atraso na entrega ou Prazo diferente do acordado. Obrigatório na inclusão desde 28/10/2026; vazio só em boletos anteriores (Não informado).';
