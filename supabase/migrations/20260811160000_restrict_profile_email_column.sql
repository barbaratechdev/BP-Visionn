-- E-mail de outros usuários: só a Supervisora pode ver, e só sob ação
-- explícita (botão "Ver e-mail"), nunca como parte da listagem em massa.
--
-- O RLS de "profiles" (profiles_select_authenticated, using(true)) controla
-- LINHA, não COLUNA — qualquer autenticada já podia enxergar o e-mail de
-- todo mundo, seja pela listagem de Equipe (sincronizarUsuarios faz
-- select("*")) seja chamando a API direto. O mesmo raciocínio já usado em
-- 20260729012946_harden_column_level_permissions.sql (RLS não basta pra
-- restringir coluna) se aplica aqui, só que para leitura em vez de escrita.
--
-- Solução: revoga o privilégio de SELECT na coluna "email" de authenticated
-- e devolve acesso só via função security definer que checa is_admin().

revoke select on public.profiles from authenticated;
grant select (
  id, name, role, setor, initials, color, photo_url, status, last_access,
  created_at, updated_at
) on public.profiles to authenticated;

-- get_user_email: única forma de uma sessão autenticada obter o e-mail de
-- OUTRO usuário depois do revoke acima. Reaproveita is_admin() (já existe
-- em 20260729003645_row_level_security.sql) em vez de criar um mecanismo de
-- permissão novo.
create or replace function public.get_user_email(target_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado text;
begin
  if not public.is_admin() then
    raise exception 'Apenas a Supervisora pode visualizar e-mails de usuários.' using errcode = '42501';
  end if;

  select email into resultado from public.profiles where id = target_id;
  return resultado;
end;
$$;

revoke all on function public.get_user_email(uuid) from public;
grant execute on function public.get_user_email(uuid) to authenticated;
