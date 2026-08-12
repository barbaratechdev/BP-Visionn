-- Demonstração deixa de enxergar todas as tarefas (como hoje, igual admin,
-- desde 20260809140000) e passa a ver só a(s) tarefa(s) destinada(s ao
-- e-mail fixo teste@bp-visionn.com. O e-mail (não o id do profile) é o
-- identificador estável da regra de negócio: se a conta de teste for
-- recriada, a policy continua correta sem precisar editar SQL.
--
-- tarefa_visivel_para_demo roda security definer porque profiles.email foi
-- revogada de "authenticated" em 20260811160000 — sem isso, a própria
-- policy não conseguiria ler o e-mail pra comparar.
create or replace function public.tarefa_visivel_para_demo(p_responsavel_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = p_responsavel_id and email = 'teste@bp-visionn.com'
  );
$$;

revoke all on function public.tarefa_visivel_para_demo(uuid) from public, anon;
grant execute on function public.tarefa_visivel_para_demo(uuid) to authenticated;

-- demo_responsavel_permitido: expõe só o id (nunca o e-mail) do profile
-- autorizado, para o frontend poder aplicar o mesmo filtro do lado do
-- cliente (defesa em profundidade — a proteção real continua sendo o RLS
-- acima, que vale mesmo para quem chama a API direto).
create or replace function public.demo_responsavel_permitido()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles where email = 'teste@bp-visionn.com';
$$;

revoke all on function public.demo_responsavel_permitido() from public, anon;
grant execute on function public.demo_responsavel_permitido() to authenticated;

alter policy "tarefas_select_own_or_admin"
  on public.tarefas
  using (
    (public.is_demo() and public.tarefa_visivel_para_demo(responsavel_id))
    or (not public.is_demo() and (public.is_admin() or responsavel_id = auth.uid()))
  );

-- tarefas_historico segue a mesma regra por tarefa_id: sem isso, Demonstração
-- continuaria enxergando motivo/data de prorrogação de tarefas de terceiros
-- mesmo depois de travar a tabela "tarefas" principal.
alter policy "tarefas_historico_select_own_or_admin"
  on public.tarefas_historico
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefas_historico.tarefa_id
        and (
          (public.is_demo() and public.tarefa_visivel_para_demo(t.responsavel_id))
          or (not public.is_demo() and (public.is_admin() or t.responsavel_id = auth.uid()))
        )
    )
  );

-- Escrita (insert/update/delete) em tarefas e tarefas_historico já estava
-- 100% bloqueada para Demonstração desde 20260809140000 (not is_demo() em
-- todas as policies de escrita) — nada a mudar aqui.
