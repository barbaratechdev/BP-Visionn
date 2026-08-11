-- Papel "demo": conta de demonstração com visão ampla (como Supervisora
-- em termos de leitura — Dashboard, todas as tarefas, contratos,
-- representantes, auditoria) mas ZERO permissão de escrita, em lugar
-- nenhum — nem na própria linha de profiles (status/foto).
--
-- O app fala com o Supabase usando a chave pública (anon key), exposta
-- no bundle do navegador. Esconder botão na tela não impede alguém de
-- abrir o DevTools e chamar supabase.from(...).update(...) direto. Por
-- isso o bloqueio real está aqui, no RLS — a interface só evita mostrar
-- controles que dariam erro.

-- profiles.role: adiciona 'demo' ao check constraint existente,
-- localizando o nome real do constraint em vez de assumir o padrão
-- "profiles_role_check" (mais seguro caso tenha sido criado com outro nome).
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where t.relname = 'profiles'
    and n.nspname = 'public'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%role%';

  if conname is not null then
    execute format('alter table public.profiles drop constraint %I', conname);
  end if;

  alter table public.profiles add constraint profiles_role_check
    check (role in ('admin','func','demo'));
end $$;

create or replace function public.is_demo()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'demo'
  );
$$;

-- profiles: demo nunca escreve, nem na própria linha.
alter policy "profiles_update_self_or_admin"
  on public.profiles
  using ((id = auth.uid() or public.is_admin()) and not public.is_demo())
  with check ((id = auth.uid() or public.is_admin()) and not public.is_demo());

-- representantes: leitura ampliada pra demo; escrita sempre bloqueada.
alter policy "representantes_select_financeiro"
  on public.representantes
  using (public.is_financeiro() or public.is_demo());

alter policy "representantes_insert_financeiro"
  on public.representantes
  with check (public.is_financeiro() and not public.is_demo());

alter policy "representantes_update_financeiro"
  on public.representantes
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());

alter policy "representantes_delete_admin"
  on public.representantes
  using (public.is_admin() and not public.is_demo());

-- contratos: idem.
alter policy "contratos_select_financeiro"
  on public.contratos
  using (public.is_financeiro() or public.is_demo());

alter policy "contratos_insert_financeiro"
  on public.contratos
  with check (public.is_financeiro() and not public.is_demo());

alter policy "contratos_update_financeiro"
  on public.contratos
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());

alter policy "contratos_delete_admin"
  on public.contratos
  using (public.is_admin() and not public.is_demo());

-- pendencias: idem.
alter policy "pendencias_select_financeiro"
  on public.pendencias
  using (public.is_financeiro() or public.is_demo());

alter policy "pendencias_insert_financeiro"
  on public.pendencias
  with check (public.is_financeiro() and not public.is_demo());

alter policy "pendencias_update_financeiro"
  on public.pendencias
  using (public.is_financeiro() and not public.is_demo())
  with check (public.is_financeiro() and not public.is_demo());

alter policy "pendencias_delete_admin"
  on public.pendencias
  using (public.is_admin() and not public.is_demo());

-- tarefas: demo enxerga tudo (como admin), nunca escreve.
alter policy "tarefas_select_own_or_admin"
  on public.tarefas
  using (public.is_admin() or public.is_demo() or responsavel_id = auth.uid());

alter policy "tarefas_insert_authenticated"
  on public.tarefas
  with check (not public.is_demo());

alter policy "tarefas_update_own_or_admin"
  on public.tarefas
  using ((public.is_admin() or responsavel_id = auth.uid()) and not public.is_demo())
  with check ((public.is_admin() or responsavel_id = auth.uid()) and not public.is_demo());

alter policy "tarefas_delete_admin"
  on public.tarefas
  using (public.is_admin() and not public.is_demo());

-- tarefas_historico: leitura ampliada pra demo; nunca insere.
alter policy "tarefas_historico_select_own_or_admin"
  on public.tarefas_historico
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefas_historico.tarefa_id
        and (public.is_admin() or public.is_demo() or t.responsavel_id = auth.uid())
    )
  );

alter policy "tarefas_historico_insert_own_or_admin"
  on public.tarefas_historico
  with check (
    not public.is_demo() and exists (
      select 1 from public.tarefas t
      where t.id = tarefas_historico.tarefa_id
        and (public.is_admin() or t.responsavel_id = auth.uid())
    )
  );

-- auditoria: demo pode ver o log (parte da navegação de demonstração), nunca grava.
alter policy "auditoria_select_admin"
  on public.auditoria
  using (public.is_admin() or public.is_demo());

alter policy "auditoria_insert_authenticated"
  on public.auditoria
  with check (not public.is_demo());

-- Aponta o perfil DEMONSTRAÇÃO já existente pro novo papel. O gatilho
-- profiles_protect_role_setor (de 20260729012946) bloqueia troca de role
-- fora de uma sessão autenticada como admin — o que é o caso aqui, rodando
-- via migration direto no banco — então precisa ser desligado só pra este
-- UPDATE pontual.
alter table public.profiles disable trigger profiles_protect_role_setor;
update public.profiles set role = 'demo' where email = 'demonstracao@bp-visionn.com';
alter table public.profiles enable trigger profiles_protect_role_setor;
