-- A auditoria nunca foi de fato persistida: addA() só gravava em estado local
-- do React, então cada pessoa via somente as próprias ações da sessão atual,
-- e ninguém via o que outra pessoa tinha feito. Pra Financeiro (Ana,
-- Esmeralda) conseguir ver auditoria de tarefas atribuídas a ela — inclusive
-- ações feitas por outra pessoa, como a Supervisora atribuindo uma tarefa —,
-- os registros precisam existir de verdade no banco.
--
-- "tarefa_id" liga o registro de auditoria à tarefa que ele descreve (nulo
-- pra ações que não são sobre tarefa — contrato, representante, usuário
-- etc.). "on delete set null" segue o mesmo padrão já usado em usuario_id.
alter table public.auditoria
  add column tarefa_id uuid references public.tarefas(id) on delete set null;

create index auditoria_tarefa_idx on public.auditoria(tarefa_id);

-- Além do que já existe (auditoria_select_admin: admin/demo veem tudo),
-- qualquer autenticada passa a ver os registros ligados a tarefas das quais
-- ela é responsável — o mesmo vínculo responsavel_id já usado no RLS de
-- "tarefas". Como é uma policy PERMISSIVE adicional, ela só amplia o que já
-- existe (nunca restringe o acesso que admin/demo já tinham).
create policy "auditoria_select_own_tarefa"
  on public.auditoria for select
  to authenticated
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = auditoria.tarefa_id
        and t.responsavel_id = auth.uid()
    )
  );

-- Sem mudança na policy de insert (auditoria_insert_authenticated já
-- permite qualquer autenticada não-demo gravar).
