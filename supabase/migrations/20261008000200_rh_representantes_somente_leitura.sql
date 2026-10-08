-- RH: Representantes passa a ser SOMENTE LEITURA.
--
-- Desde a 20260817000000 (aba RH) o RH podia cadastrar e editar representantes
-- (is_financeiro() or is_rh()). Regra definitiva: o RH (hoje, a Kayane) continua VENDO todos os
-- representantes, mas não cadastra, não edita e não exclui. Escrever em representantes passa a ser
-- só do Financeiro (is_financeiro(), que inclui a admin), mantendo as exclusões que já existiam
-- (Comercial e Demonstração).
--
-- Altera SOMENTE as policies de INSERT e UPDATE de representantes. NÃO tocados: SELECT e DELETE de
-- representantes, Supervisores (o banco já recusa a escrita do RH), RH, tarefas, Prorrogação,
-- Avarias, Abatimentos, Contratos, as regras do Comercial e pode_ver_modulos(). Não altera dados.
-- Reversão: docs/rollback-rh-representantes-somente-leitura.md.

alter policy "representantes_insert_financeiro" on public.representantes
  with check (public.is_financeiro() and not public.is_comercial() and not public.is_demo());

alter policy "representantes_update_financeiro" on public.representantes
  using (public.is_financeiro() and not public.is_comercial() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_comercial() and not public.is_demo());
