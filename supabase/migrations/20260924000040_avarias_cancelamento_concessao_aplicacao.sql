-- Cancelamento de concessão e aplicação — avaria e solicitação já
-- suportavam status CANCELADO desde a criação do módulo
-- (20260924000000/20260924000010). Concessões e aplicações não tinham
-- conceito de status: eram só o registro de um fato já ocorrido. Agora
-- que a exclusão física foi removida (20260924000030), precisam de uma
-- forma de "desfazer" um lançamento errado sem apagar a linha.

alter table public.avaria_concessoes
  add column status text not null default 'ATIVA' check (status in ('ATIVA','CANCELADA')),
  add column motivo_cancelamento text,
  add column cancelado_em timestamptz,
  add column cancelado_por uuid references public.profiles(id) on delete set null,
  add column cancelado_por_nome text;

alter table public.avaria_aplicacoes
  add column status text not null default 'ATIVA' check (status in ('ATIVA','CANCELADA')),
  add column motivo_cancelamento text,
  add column cancelado_em timestamptz,
  add column cancelado_por uuid references public.profiles(id) on delete set null,
  add column cancelado_por_nome text;

create index avaria_concessoes_status_idx on public.avaria_concessoes(status);
create index avaria_aplicacoes_status_idx on public.avaria_aplicacoes(status);

comment on column public.avaria_concessoes.status is 'ATIVA por padrão; CANCELADA é a forma de corrigir um lançamento errado sem apagar a linha (exclusão física foi removida do módulo).';
comment on column public.avaria_aplicacoes.status is 'ATIVA por padrão; CANCELADA é a forma de corrigir um lançamento errado sem apagar a linha (exclusão física foi removida do módulo).';

-- Regra de integridade pedida explicitamente pela usuária: não pode
-- cancelar uma concessão enquanto existir aplicação ATIVA vinculada a
-- ela — evita o estado inconsistente "concessão cancelada + aplicação
-- ativa". Cancelar a aplicação primeiro é obrigatório. Não existe o
-- inverso (bloquear cancelar aplicação por causa da concessão) porque
-- aplicação é a ponta final da cadeia — nada depende dela.
create or replace function public.avaria_concessoes_impedir_cancelamento_com_aplicacao_ativa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'CANCELADA' and old.status = 'ATIVA' then
    if exists (
      select 1 from public.avaria_aplicacoes
      where concessao_id = old.id and status = 'ATIVA'
    ) then
      raise exception 'Não é possível cancelar esta concessão: existe uma aplicação ativa vinculada a ela. Cancele a aplicação primeiro.';
    end if;
  end if;
  return new;
end;
$$;

create trigger avaria_concessoes_check_cancelamento
  before update on public.avaria_concessoes
  for each row execute function public.avaria_concessoes_impedir_cancelamento_com_aplicacao_ativa();

-- Novos tipos de evento no histórico, pro cancelamento de avaria/
-- concessão/aplicação (SOLICITACAO_CANCELADA já existia desde o início).
-- Localiza o nome do constraint em vez de assumir o padrão de geração
-- automática do Postgres — mesmo cuidado já usado em
-- 20260809140000_add_demo_readonly_role.sql pro constraint de profiles.role.
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where t.relname = 'avaria_historico'
    and n.nspname = 'public'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%tipo%';

  if conname is not null then
    execute format('alter table public.avaria_historico drop constraint %I', conname);
  end if;

  alter table public.avaria_historico add constraint avaria_historico_tipo_check
    check (tipo in (
      'AVARIA_CRIADA','AVARIA_EDITADA','AVARIA_CANCELADA','SOLICITACAO_CRIADA','STATUS_ALTERADO',
      'DESCONTO_CONCEDIDO','DESCONTO_NEGADO','DESCONTO_APLICADO','CONCESSAO_CANCELADA',
      'APLICACAO_CANCELADA','SOLICITACAO_CANCELADA','TENTATIVA_DUPLICIDADE'
    ));
end $$;

-- avarias_verificar_duplicidade agora só considera concessões ATIVAS —
-- uma concessão cancelada (corrigida por engano, por exemplo) não deve
-- mais gerar alerta de "possível desconto já concedido" pra uma nova
-- tentativa, porque na prática esse desconto nunca foi de fato mantido.
create or replace function public.avarias_verificar_duplicidade(
  p_filial text,
  p_numero_nf text,
  p_produto_codigo text,
  p_produto_nome text,
  p_tipo_avaria text
)
returns table (
  avaria_id uuid,
  numero_nf text,
  produto_nome text,
  produto_codigo text,
  tipo_avaria text,
  laboratorio text,
  valor_concedido numeric,
  data_concessao date,
  solicitante_nome text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id, a.numero_nf, a.produto_nome, a.produto_codigo, a.tipo_avaria,
    s.laboratorio, c.valor_concedido, c.data_concessao, s.solicitante_nome
  from public.avarias a
  join public.avaria_solicitacoes s on s.avaria_id = a.id
  join public.avaria_concessoes c on c.solicitacao_id = s.id
  where (public.is_financeiro() or public.is_demo())
    and c.status = 'ATIVA'
    and a.filial = p_filial
    and a.numero_nf = p_numero_nf
    and a.tipo_avaria = p_tipo_avaria
    and (
      (p_produto_codigo is not null and a.produto_codigo = p_produto_codigo)
      or a.produto_nome ilike p_produto_nome
    )
  order by c.data_concessao desc;
$$;
