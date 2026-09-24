-- Remove a permissão de exclusão física das 4 tabelas principais de
-- Controle de Avarias — decisão de negócio confirmada com a usuária:
-- rastreabilidade e auditoria têm prioridade sobre a conveniência de
-- "corrigir apagando". Daqui pra frente, corrigir um registro criado por
-- engano é sempre via cancelamento (mantém a linha, muda o status —
-- ver 20260924000040), nunca DELETE — nem Financeiro, nem Admin.
--
-- Isso substitui o precedente anterior (Financeiro podia excluir, mesmo
-- raciocínio de 20260917000000_prorrogacao_edicao_exclusao_financeiro.sql)
-- por decisão explícita: Controle de Avarias não segue esse precedente.
--
-- Sem policy de delete em nenhuma das 4 tabelas = ninguém apaga, nem
-- admin — mesmo padrão já usado em avaria_historico desde o início do
-- módulo (append-only por ausência de policy, não por trigger de bloqueio).
drop policy if exists "avarias_delete_financeiro" on public.avarias;
drop policy if exists "avaria_solicitacoes_delete_financeiro" on public.avaria_solicitacoes;
drop policy if exists "avaria_concessoes_delete_financeiro" on public.avaria_concessoes;
drop policy if exists "avaria_aplicacoes_delete_financeiro" on public.avaria_aplicacoes;
