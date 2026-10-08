-- RH NÃO lê os módulos operacionais: Prorrogação de Boletos, Controle de Avarias, Controle de
-- Abatimentos e Contratos.
--
-- Até aqui a leitura dessas áreas usava pode_ver_modulos() (Financeiro, RH ou Comercial — a
-- "leitura geral" da 20261007000100). A partir desta migration ela passa a ser de quem OPERA
-- essas áreas: is_financeiro() (inclui a admin) ou is_comercial() — a mesma condição que as
-- policies de escrita dessas tabelas já usam. Na prática só o RH (hoje, a Kayane) deixa de ler;
-- Bárbara, Financeiro, Comercial (Jefferson), Demonstração, teste e teste2 ficam exatamente como
-- estavam.
--
-- Tabelas (só a policy de SELECT): pendencias (Prorrogação de Boletos — NÃO é a aba "Pendências",
-- que usa a tabela tarefas), abatimentos, avarias, avaria_historico, avaria_solicitacoes,
-- avaria_concessoes, avaria_aplicacoes e contratos. A view avaria_solicitacoes_atual é
-- security_invoker e acompanha avaria_solicitacoes.
--
-- NÃO tocados: pode_ver_modulos() (continua liberando ao RH a leitura de RH e Representantes),
-- policies de escrita (já não incluíam o RH), policies de tarefas, RH, Representantes,
-- Supervisores e as funções de cancelamento/duplicidade (já exigiam Financeiro/Comercial ou a
-- aprovadora). Não altera dados.
-- Reversão: docs/rollback-rh-sem-modulos-operacionais.md.

alter policy "pendencias_select_financeiro" on public.pendencias
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "abatimentos_select_financeiro" on public.abatimentos
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avarias_select_financeiro" on public.avarias
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_historico_select_financeiro" on public.avaria_historico
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_solicitacoes_select_financeiro" on public.avaria_solicitacoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_concessoes_select_financeiro" on public.avaria_concessoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "avaria_aplicacoes_select_financeiro" on public.avaria_aplicacoes
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());

alter policy "contratos_select_financeiro" on public.contratos
  using ((public.is_financeiro() or public.is_comercial()) and not public.is_demo());
