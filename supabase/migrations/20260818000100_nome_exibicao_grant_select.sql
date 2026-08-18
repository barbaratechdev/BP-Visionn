-- 20260811160000 revogou o SELECT genérico em public.profiles e devolveu
-- acesso só pra uma lista explícita de colunas (pra esconder "email" da
-- listagem em massa). nome_exibicao, adicionada depois em 20260818000000,
-- ficou de fora dessa lista por não existir ainda — sem este grant,
-- qualquer leitura da coluna (inclusive o carregarUsuarios já em uso no
-- app) falha com "permission denied for table profiles". Diferente de
-- email, nome_exibicao é pra aparecer pra todo mundo (só a escrita é
-- restrita à Supervisora, via gatilho) — então é um select liberado, sem
-- with check nem função security definer.
grant select (nome_exibicao) on public.profiles to authenticated;
