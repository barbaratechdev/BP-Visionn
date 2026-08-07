-- auditoria: trilha de auditoria — registro append-only de ações realizadas
-- no sistema (criação/edição de tarefas, contratos, usuários, exportações etc).
-- "usuario_nome" guarda uma cópia do nome no momento da ação, para que o
-- histórico não se perca caso o profile seja excluído futuramente.
create table public.auditoria (
  id bigint generated always as identity primary key,
  tipo text not null,
  referencia text,
  detalhe text,
  usuario_id uuid references public.profiles(id) on delete set null,
  usuario_nome text,
  created_at timestamptz not null default now()
);

comment on table public.auditoria is 'Trilha de auditoria append-only. Sem UPDATE/DELETE por design.';

create index auditoria_usuario_idx on public.auditoria(usuario_id);
create index auditoria_created_at_idx on public.auditoria(created_at desc);
