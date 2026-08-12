-- Histórico de acessos: quem está entrando no sistema, visível só pra
-- Supervisora (Configurações > Acessos ao sistema).
--
-- Por que uma tabela própria em vez de auth.audit_log_entries (log interno
-- do GoTrue): é schema não documentado, não exposto via API, e não dá pra
-- confirmar de forma confiável que "login" e "token refresh" ficam
-- claramente distinguíveis nem que user-agent é sempre gravado. Preferimos
-- possuir o dado: uma linha por chamada bem-sucedida a signInWithPassword,
-- gravada pelo próprio código que sabe exatamente quando isso aconteceu —
-- nunca por um listener genérico de sessão (esses também disparam em
-- refresh de página, o que geraria contagem errada).
create table public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  event_type text not null default 'login'
);

comment on table public.login_history is 'Um registro por login bem-sucedido (signInWithPassword). Nunca por refresh/resumo de sessão.';

create index login_history_user_idx on public.login_history(user_id, created_at desc);
create index login_history_created_idx on public.login_history(created_at desc);

alter table public.login_history enable row level security;

-- Só a Supervisora lê — nem Demonstração, nem Financeiro, nem a própria
-- pessoa dona da linha. Sem policy de insert/update/delete pra
-- "authenticated": a única porta de escrita é registrar_login() (security
-- definer, abaixo), que nunca expõe controle de qual linha inserir.
create policy "login_history_select_admin"
  on public.login_history for select
  to authenticated
  using (public.is_admin());

-- registrar_login: chamada pelo frontend logo após signInWithPassword
-- resolver com sucesso. user_id vem de auth.uid() (não de parâmetro —
-- não dá pra registrar login em nome de outra pessoa). IP e user-agent são
-- lidos dos headers da própria requisição HTTP via PostgREST
-- (current_setting('request.headers')), nunca de algo que o cliente
-- informe — não tem como falsificar.
create or replace function public.registrar_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
  v_ua text;
begin
  if auth.uid() is null then
    return;
  end if;

  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := nullif(trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  v_ua := v_headers->>'user-agent';

  insert into public.login_history (user_id, ip_address, user_agent)
  values (auth.uid(), v_ip, v_ua);
end;
$$;

revoke all on function public.registrar_login() from public, anon;
grant execute on function public.registrar_login() to authenticated;

-- login_history_resumo: uma linha por perfil (mesmo quem nunca logou —
-- left join), com total de logins e último acesso. Alimenta a tabela
-- principal da tela.
create or replace function public.login_history_resumo()
returns table (
  user_id uuid,
  nome text,
  email text,
  role text,
  setor text,
  total_logins bigint,
  ultimo_login timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas a Supervisora pode ver o histórico de acessos.' using errcode = '42501';
  end if;

  return query
    select p.id, p.name, p.email, p.role, p.setor,
           count(lh.id) as total_logins,
           max(lh.created_at) as ultimo_login
    from public.profiles p
    left join public.login_history lh on lh.user_id = p.id
    group by p.id, p.name, p.email, p.role, p.setor
    order by ultimo_login desc nulls last, p.name;
end;
$$;

revoke all on function public.login_history_resumo() from public, anon;
grant execute on function public.login_history_resumo() to authenticated;

-- login_history_geral: os 4 números do topo da tela (usuários que já
-- logaram alguma vez, logins hoje, logins nos últimos 7 dias, último
-- acesso de qualquer pessoa no sistema).
create or replace function public.login_history_geral()
returns table (
  usuarios_ativos bigint,
  logins_hoje bigint,
  logins_7dias bigint,
  ultimo_acesso timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas a Supervisora pode ver o histórico de acessos.' using errcode = '42501';
  end if;

  return query
    select
      (select count(distinct user_id) from public.login_history),
      (select count(*) from public.login_history where created_at >= date_trunc('day', now())),
      (select count(*) from public.login_history where created_at >= now() - interval '7 days'),
      (select max(created_at) from public.login_history);
end;
$$;

revoke all on function public.login_history_geral() from public, anon;
grant execute on function public.login_history_geral() to authenticated;

-- login_history_detalhe: histórico bruto de UM usuário (drill-down ao
-- clicar numa linha da tabela principal).
create or replace function public.login_history_detalhe(p_user_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  ip_address text,
  user_agent text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas a Supervisora pode ver o histórico de acessos.' using errcode = '42501';
  end if;

  return query
    select lh.id, lh.created_at, lh.ip_address, lh.user_agent
    from public.login_history lh
    where lh.user_id = p_user_id
    order by lh.created_at desc
    limit 500;
end;
$$;

revoke all on function public.login_history_detalhe(uuid) from public, anon;
grant execute on function public.login_history_detalhe(uuid) to authenticated;