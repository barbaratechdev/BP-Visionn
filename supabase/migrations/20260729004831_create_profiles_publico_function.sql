-- profiles_publico: diretório mínimo (nome, setor, avatar) exposto mesmo sem
-- login, para alimentar o seletor de conta e o preview da tela de login.
-- Roda como security definer (ignora o RLS de "profiles", que exige
-- autenticação) e devolve só colunas não sensíveis — nunca role, status,
-- último acesso ou e-mail além do necessário para o preview.
create or replace function public.profiles_publico()
returns table (
  id uuid,
  name text,
  setor text,
  email text,
  initials text,
  color text
)
language sql
security definer
set search_path = public
stable
as $$
  select id, name, setor, email, initials, color
  from public.profiles
  order by name;
$$;

grant execute on function public.profiles_publico() to anon, authenticated;
