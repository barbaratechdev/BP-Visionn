-- Suporte pro widget "Produtividade da equipe" do Dashboard: Demonstração só
-- deve ver, nessa lista, as duas contas descartáveis usadas pra demonstração
-- (teste@ e teste2@bp-visionn.com), não a equipe real (Ana, Esmeralda etc.).
--
-- Diferente das mudanças anteriores em tarefas, isto NÃO é uma restrição de
-- RLS: profiles_select_authenticated (using(true)) continua igual de
-- propósito — qualquer autenticada, inclusive Demonstração, já pode listar
-- nome/avatar/setor de todo mundo hoje, usado em Mensagens, Representantes,
-- seletor de responsável etc.; mudar essa policy quebraria essas outras
-- telas. Este é só um filtro do lado do cliente nesse widget específico.
--
-- A função existe porque o e-mail continua sendo o identificador estável da
-- regra ("as contas de teste"), e a coluna profiles.email foi revogada de
-- "authenticated" em 20260811160000 — sem isso, o frontend não teria como
-- resolver e-mail -> id pra fazer o filtro.
create or replace function public.demo_funcionarios_teste()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles
  where email in ('teste@bp-visionn.com', 'teste2@bp-visionn.com');
$$;

revoke all on function public.demo_funcionarios_teste() from public, anon;
grant execute on function public.demo_funcionarios_teste() to authenticated;
