-- representantes: representantes comerciais (vendedores/supervisores externos)
-- atendidos pelo BP-Visionn. Hoje esses dados vivem soltos dentro de cada
-- contrato; aqui viram uma entidade própria, e contratos passam a apenas
-- referenciar um representante.
create table public.representantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  regiao text not null check (regiao in ('Pará','Piauí')),
  supervisor_id uuid references public.profiles(id) on delete set null,
  status text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  data_entrada date not null default current_date,
  data_saida date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint representantes_saida_apos_entrada check (data_saida is null or data_saida >= data_entrada)
);

comment on table public.representantes is 'Representantes comerciais vinculados a um supervisor (profile) e a uma região.';
comment on column public.representantes.supervisor_id is 'Supervisor responsável — referencia profiles.id.';

create index representantes_supervisor_idx on public.representantes(supervisor_id);
create index representantes_regiao_idx on public.representantes(regiao);
create index representantes_status_idx on public.representantes(status);

create trigger representantes_set_updated_at
  before update on public.representantes
  for each row execute function public.set_updated_at();
