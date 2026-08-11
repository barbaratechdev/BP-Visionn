-- get_user_email ganhou EXECUTE para "anon" automaticamente na criação
-- (o projeto tem ALTER DEFAULT PRIVILEGES concedendo EXECUTE em funções
-- novas para anon/authenticated; "revoke all ... from public" na migration
-- anterior não alcança grants diretos como esse). is_admin() já barra
-- anon internamente (auth.uid() é null pra quem não está logado, então
-- nunca bate com nenhuma linha de profiles) — mas não faz sentido uma
-- função pensada só para a Supervisora autenticada nem aceitar a chamada
-- de quem não tem sessão. Fecha por completo.
revoke execute on function public.get_user_email(uuid) from anon;
