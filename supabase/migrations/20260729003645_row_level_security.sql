-- Row Level Security
--
-- O app fala diretamente com o Supabase usando a chave pública (anon key),
-- exposta no bundle do navegador. Sem RLS, qualquer pessoa com essa chave
-- poderia ler/gravar todas as tabelas via API REST. As policies abaixo
-- espelham o controle de acesso por perfil que já existe na interface
-- (isAdmin / isFin), agora aplicado também no banco.

-- Funções auxiliares (security definer) para checar o perfil do usuário
-- autenticado sem cair em recursão de RLS ao consultar "profiles".
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_financeiro()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'admin' or setor = 'Financeiro')
  );
$$;

-- profiles ----------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Sem policy de insert/delete: profiles são criados pelo trigger
-- on_auth_user_created (security definer) e não são excluídos pelo cliente.

-- representantes ------------------------------------------------------------
alter table public.representantes enable row level security;

create policy "representantes_select_financeiro"
  on public.representantes for select
  to authenticated
  using (public.is_financeiro());

create policy "representantes_insert_financeiro"
  on public.representantes for insert
  to authenticated
  with check (public.is_financeiro());

create policy "representantes_update_financeiro"
  on public.representantes for update
  to authenticated
  using (public.is_financeiro())
  with check (public.is_financeiro());

create policy "representantes_delete_admin"
  on public.representantes for delete
  to authenticated
  using (public.is_admin());

-- contratos -----------------------------------------------------------------
alter table public.contratos enable row level security;

create policy "contratos_select_financeiro"
  on public.contratos for select
  to authenticated
  using (public.is_financeiro());

create policy "contratos_insert_financeiro"
  on public.contratos for insert
  to authenticated
  with check (public.is_financeiro());

create policy "contratos_update_financeiro"
  on public.contratos for update
  to authenticated
  using (public.is_financeiro())
  with check (public.is_financeiro());

create policy "contratos_delete_admin"
  on public.contratos for delete
  to authenticated
  using (public.is_admin());

-- pendencias ------------------------------------------------------------
alter table public.pendencias enable row level security;

create policy "pendencias_select_financeiro"
  on public.pendencias for select
  to authenticated
  using (public.is_financeiro());

create policy "pendencias_insert_financeiro"
  on public.pendencias for insert
  to authenticated
  with check (public.is_financeiro());

create policy "pendencias_update_financeiro"
  on public.pendencias for update
  to authenticated
  using (public.is_financeiro())
  with check (public.is_financeiro());

create policy "pendencias_delete_admin"
  on public.pendencias for delete
  to authenticated
  using (public.is_admin());

-- tarefas ---------------------------------------------------------------
alter table public.tarefas enable row level security;

create policy "tarefas_select_own_or_admin"
  on public.tarefas for select
  to authenticated
  using (public.is_admin() or responsavel_id = auth.uid());

create policy "tarefas_insert_authenticated"
  on public.tarefas for insert
  to authenticated
  with check (true);

create policy "tarefas_update_own_or_admin"
  on public.tarefas for update
  to authenticated
  using (public.is_admin() or responsavel_id = auth.uid())
  with check (public.is_admin() or responsavel_id = auth.uid());

create policy "tarefas_delete_admin"
  on public.tarefas for delete
  to authenticated
  using (public.is_admin());

-- tarefas_historico -------------------------------------------------------
alter table public.tarefas_historico enable row level security;

create policy "tarefas_historico_select_own_or_admin"
  on public.tarefas_historico for select
  to authenticated
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefas_historico.tarefa_id
        and (public.is_admin() or t.responsavel_id = auth.uid())
    )
  );

create policy "tarefas_historico_insert_own_or_admin"
  on public.tarefas_historico for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefas_historico.tarefa_id
        and (public.is_admin() or t.responsavel_id = auth.uid())
    )
  );

-- Sem update/delete: histórico de prorrogação é append-only.

-- auditoria -----------------------------------------------------------------
alter table public.auditoria enable row level security;

create policy "auditoria_select_admin"
  on public.auditoria for select
  to authenticated
  using (public.is_admin());

create policy "auditoria_insert_authenticated"
  on public.auditoria for insert
  to authenticated
  with check (true);

-- Sem update/delete: trilha de auditoria é append-only.
