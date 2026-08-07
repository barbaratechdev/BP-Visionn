-- contratos: contratos comerciais gerados a partir de um modelo (supervisor,
-- vendedor ou recibo) para um representante específico.
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  representante_id uuid not null references public.representantes(id) on delete restrict,
  tipo text not null check (tipo in ('supervisor','vendedor','recibo')),
  cpf_cnpj text,
  porcentagem numeric(5,2) not null check (porcentagem >= 0 and porcentagem <= 100),
  email text,
  telefone text,
  data_inicio date not null default current_date,
  status text not null default 'ativo' check (status in ('ativo','encerrado')),
  documento_texto text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contratos is 'Contratos vinculados a um representante (representantes.id).';
comment on column public.contratos.documento_texto is 'Snapshot do texto do contrato/recibo no momento da exportação em PDF.';
comment on column public.contratos.representante_id is 'on delete restrict: não é possível excluir um representante que já possui contratos.';

create index contratos_representante_idx on public.contratos(representante_id);
create index contratos_status_idx on public.contratos(status);

create trigger contratos_set_updated_at
  before update on public.contratos
  for each row execute function public.set_updated_at();
