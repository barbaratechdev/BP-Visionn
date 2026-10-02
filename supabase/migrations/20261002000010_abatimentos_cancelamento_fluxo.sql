-- Fluxo de aprovação obrigatória pra cancelamento de Abatimentos — FASE A
-- (aditiva). Cria tudo que o fluxo novo precisa — função da aprovadora,
-- tabela de solicitações/histórico, funções solicitar/decidir/cancelar
-- direto e Realtime — SEM mudar o comportamento atual: o frontend antigo
-- (update direto de status) continua cancelando normalmente. A trava que
-- bloqueia o cancelamento direto está na FASE B
-- (20261002000020_abatimentos_cancelamento_enforcement.sql), que só deve
-- ser aplicada depois que o frontend novo estiver publicado e recarregado.
--
-- Ariana, Esmeralda e Paulo (is_financeiro) só poderão SOLICITAR o
-- cancelamento; quem efetiva (ou recusa) é a Barbára Pinon, única
-- aprovadora, identificada pelo id do usuário autenticado.
--
-- Convenção usada nas duas fases: um gatilho só bloqueia quem executa como
-- papel authenticated/anon (current_user). Mudanças vindas de dentro das
-- funções security definer deste fluxo rodam como o dono da função e
-- passam. Um cliente nunca consegue forjar isso — current_user é definido
-- pelo PostgREST a partir do JWT.

-- 1) Quem aprova -----------------------------------------------------------
create or replace function public.is_aprovador_cancelamento()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select auth.uid() = '6db64d55-bca1-49d0-b789-dabdbc646463'::uuid;  -- Barbára Pinon
$$;

-- 2) Solicitações + histórico (a própria tabela é o histórico) -------------
create table public.cancelamento_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'ABATIMENTO' check (tipo in ('ABATIMENTO')),
  entidade_id uuid not null references public.abatimentos(id) on delete restrict,
  -- Retrato do lançamento no momento do pedido (laboratório = fornecedor).
  snapshot jsonb not null,
  motivo text not null check (char_length(btrim(motivo)) >= 5),
  status text not null default 'PENDENTE'
    check (status in ('PENDENTE','APROVADA','RECUSADA')),
  -- Ids de usuário SEM foreign key de propósito: o histórico é imutável, e
  -- um "on delete set null" (excluir conta pela Edge Function delete-user,
  -- que apaga o perfil em cascata) é um UPDATE que o gatilho de proteção
  -- recusaria — travaria a exclusão de quem tem histórico. Id + nome ficam
  -- gravados como estavam, mesmo depois que a conta some.
  solicitante_id uuid,
  solicitante_nome text,
  created_at timestamptz not null default now(),
  decidido_por uuid,
  decidido_por_nome text,
  decidido_em timestamptz,
  motivo_recusa text,
  constraint cancelamento_solicitacoes_coerencia check (
    (status = 'PENDENTE' and decidido_em is null and motivo_recusa is null)
    or (status = 'APROVADA' and decidido_em is not null and motivo_recusa is null)
    or (status = 'RECUSADA' and decidido_em is not null
        and char_length(btrim(coalesce(motivo_recusa,''))) >= 5)
  )
);

comment on table public.cancelamento_solicitacoes is 'Solicitações de cancelamento (hoje só de abatimentos) e suas decisões. Append-only: só as funções solicitar_/decidir_/cancelar_ escrevem; nunca editável nem excluível pelo cliente.';

-- Uma única solicitação pendente por lançamento.
create unique index cancelamento_solicitacoes_uma_pendente_idx
  on public.cancelamento_solicitacoes (tipo, entidade_id)
  where status = 'PENDENTE';
create index cancelamento_solicitacoes_entidade_idx on public.cancelamento_solicitacoes (entidade_id);
create index cancelamento_solicitacoes_status_idx on public.cancelamento_solicitacoes (status);
create index cancelamento_solicitacoes_solicitante_idx on public.cancelamento_solicitacoes (solicitante_id);

alter table public.cancelamento_solicitacoes enable row level security;

-- Leitura: Financeiro (acompanha o status) e a aprovadora — explícita, pra
-- não depender de ela continuar admin. Demo não vê. Nenhuma policy de
-- insert/update/delete.
create policy "cancelamento_solicitacoes_select_financeiro"
  on public.cancelamento_solicitacoes for select
  to authenticated
  using ((public.is_financeiro() or public.is_aprovador_cancelamento()) and not public.is_demo());

revoke all on public.cancelamento_solicitacoes from anon, authenticated;
grant select on public.cancelamento_solicitacoes to authenticated;

-- Imutabilidade: o cliente nunca grava (insert/update/delete); mesmo as
-- funções só podem decidir uma solicitação PENDENTE e sem mexer nos dados
-- do pedido.
create or replace function public.cancelamento_solicitacoes_proteger()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated','anon') then
    raise exception 'Solicitações de cancelamento só podem ser alteradas pelo fluxo de aprovação.'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'O histórico de cancelamentos não pode ser excluído.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if old.status <> 'PENDENTE' then
      raise exception 'Esta solicitação já foi decidida.' using errcode = '23514';
    end if;
    if (new.id, new.tipo, new.entidade_id, new.snapshot, new.motivo,
        new.solicitante_id, new.solicitante_nome, new.created_at)
       is distinct from
       (old.id, old.tipo, old.entidade_id, old.snapshot, old.motivo,
        old.solicitante_id, old.solicitante_nome, old.created_at) then
      raise exception 'Os dados do pedido de cancelamento não podem ser alterados.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger cancelamento_solicitacoes_proteger_trigger
  before insert or update or delete on public.cancelamento_solicitacoes
  for each row execute function public.cancelamento_solicitacoes_proteger();

-- 3) Funções do fluxo ------------------------------------------------------
create or replace function public.solicitar_cancelamento_abatimento(p_abatimento_id uuid, p_motivo text)
returns public.cancelamento_solicitacoes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_abat public.abatimentos%rowtype;
  v_nome text;
  v_sol public.cancelamento_solicitacoes%rowtype;
begin
  if v_uid is null or not public.is_financeiro() or public.is_demo() then
    raise exception 'Você não tem permissão para solicitar cancelamentos.' using errcode = '42501';
  end if;
  if public.is_aprovador_cancelamento() then
    raise exception 'A aprovadora cancela diretamente, sem solicitar.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_motivo,''))) < 5 then
    raise exception 'Informe o motivo do cancelamento.' using errcode = '23514';
  end if;

  -- Trava o lançamento: serializa com decisão/cancelamento concorrente.
  select * into v_abat from public.abatimentos where id = p_abatimento_id for update;
  if not found then
    raise exception 'Abatimento não encontrado.' using errcode = 'P0002';
  end if;
  if v_abat.status <> 'ATIVO' then
    raise exception 'Este abatimento já está cancelado.' using errcode = '23514';
  end if;

  select coalesce(nullif(btrim(nome_exibicao),''), name) into v_nome from public.profiles where id = v_uid;

  begin
    insert into public.cancelamento_solicitacoes (tipo, entidade_id, snapshot, motivo, solicitante_id, solicitante_nome)
    values (
      'ABATIMENTO', v_abat.id,
      jsonb_build_object(
        'laboratorio', v_abat.laboratorio, 'filial', v_abat.filial, 'nf', v_abat.nf,
        'valor_abatimento', v_abat.valor_abatimento, 'valor_pago', v_abat.valor_pago, 'data', v_abat.data
      ),
      btrim(p_motivo), v_uid, v_nome
    )
    returning * into v_sol;
  exception when unique_violation then
    raise exception 'Já existe uma solicitação de cancelamento pendente para este lançamento.' using errcode = '23505';
  end;

  insert into public.auditoria (tipo, referencia, detalhe, usuario_id, usuario_nome)
  values ('Cancelamento de abatimento solicitado', v_abat.nf || ' — ' || v_abat.laboratorio,
          'Motivo: ' || btrim(p_motivo), v_uid, v_nome);

  return v_sol;
end;
$$;

create or replace function public.decidir_cancelamento_abatimento(
  p_solicitacao_id uuid, p_aprovar boolean, p_motivo_recusa text default null
)
returns public.cancelamento_solicitacoes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_sol public.cancelamento_solicitacoes%rowtype;
  v_nome text;
  v_ref text;
begin
  if v_uid is null or not public.is_aprovador_cancelamento() then
    raise exception 'Somente a aprovadora pode decidir cancelamentos.' using errcode = '42501';
  end if;
  if p_aprovar is null then
    raise exception 'Informe se a solicitação foi aprovada ou recusada.' using errcode = '22023';
  end if;

  -- Trava a solicitação: impede decisão duplicada/concorrente.
  select * into v_sol from public.cancelamento_solicitacoes where id = p_solicitacao_id for update;
  if not found then
    raise exception 'Solicitação não encontrada.' using errcode = 'P0002';
  end if;
  if v_sol.status <> 'PENDENTE' then
    raise exception 'Esta solicitação já foi decidida.' using errcode = '23514';
  end if;

  select coalesce(nullif(btrim(nome_exibicao),''), name) into v_nome from public.profiles where id = v_uid;
  v_ref := (v_sol.snapshot->>'nf') || ' — ' || (v_sol.snapshot->>'laboratorio');

  if p_aprovar then
    perform 1 from public.abatimentos where id = v_sol.entidade_id for update;
    update public.abatimentos
       set status = 'CANCELADO', updated_by = v_uid, updated_by_nome = v_nome
     where id = v_sol.entidade_id and status = 'ATIVO';
    update public.cancelamento_solicitacoes
       set status = 'APROVADA', decidido_por = v_uid, decidido_por_nome = v_nome, decidido_em = now()
     where id = v_sol.id
     returning * into v_sol;
    insert into public.auditoria (tipo, referencia, detalhe, usuario_id, usuario_nome)
    values ('Cancelamento de abatimento aprovado', v_ref,
            'Solicitado por ' || coalesce(v_sol.solicitante_nome,'—') || ' — ' || v_sol.motivo, v_uid, v_nome);
  else
    if char_length(btrim(coalesce(p_motivo_recusa,''))) < 5 then
      raise exception 'Informe o motivo da recusa.' using errcode = '23514';
    end if;
    update public.cancelamento_solicitacoes
       set status = 'RECUSADA', decidido_por = v_uid, decidido_por_nome = v_nome,
           decidido_em = now(), motivo_recusa = btrim(p_motivo_recusa)
     where id = v_sol.id
     returning * into v_sol;
    insert into public.auditoria (tipo, referencia, detalhe, usuario_id, usuario_nome)
    values ('Cancelamento de abatimento recusado', v_ref,
            'Solicitado por ' || coalesce(v_sol.solicitante_nome,'—') || ' — Recusa: ' || v_sol.motivo_recusa, v_uid, v_nome);
  end if;

  return v_sol;
end;
$$;

-- Cancelamento direto pela aprovadora. Se já havia um pedido pendente para
-- o lançamento, ele é decidido (APROVADA) em vez de ficar órfão; senão,
-- registra uma linha APROVADA própria, pro histórico ficar completo.
create or replace function public.cancelar_abatimento_direto(p_abatimento_id uuid, p_motivo text default null)
returns public.cancelamento_solicitacoes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_abat public.abatimentos%rowtype;
  v_sol public.cancelamento_solicitacoes%rowtype;
  v_nome text;
  v_motivo text := nullif(btrim(coalesce(p_motivo,'')), '');
begin
  if v_uid is null or not public.is_aprovador_cancelamento() then
    raise exception 'Somente a aprovadora pode cancelar diretamente.' using errcode = '42501';
  end if;
  if v_motivo is not null and char_length(v_motivo) < 5 then
    raise exception 'O motivo do cancelamento é muito curto.' using errcode = '23514';
  end if;

  select * into v_abat from public.abatimentos where id = p_abatimento_id for update;
  if not found then
    raise exception 'Abatimento não encontrado.' using errcode = 'P0002';
  end if;
  if v_abat.status <> 'ATIVO' then
    raise exception 'Este abatimento já está cancelado.' using errcode = '23514';
  end if;

  select coalesce(nullif(btrim(nome_exibicao),''), name) into v_nome from public.profiles where id = v_uid;

  update public.abatimentos
     set status = 'CANCELADO', updated_by = v_uid, updated_by_nome = v_nome
   where id = v_abat.id;

  select * into v_sol from public.cancelamento_solicitacoes
   where tipo = 'ABATIMENTO' and entidade_id = v_abat.id and status = 'PENDENTE' for update;
  if found then
    update public.cancelamento_solicitacoes
       set status = 'APROVADA', decidido_por = v_uid, decidido_por_nome = v_nome, decidido_em = now()
     where id = v_sol.id
     returning * into v_sol;
  else
    insert into public.cancelamento_solicitacoes
      (tipo, entidade_id, snapshot, motivo, status, solicitante_id, solicitante_nome,
       decidido_por, decidido_por_nome, decidido_em)
    values (
      'ABATIMENTO', v_abat.id,
      jsonb_build_object(
        'laboratorio', v_abat.laboratorio, 'filial', v_abat.filial, 'nf', v_abat.nf,
        'valor_abatimento', v_abat.valor_abatimento, 'valor_pago', v_abat.valor_pago, 'data', v_abat.data
      ),
      coalesce(v_motivo, 'Cancelamento direto pela aprovadora'), 'APROVADA', v_uid, v_nome,
      v_uid, v_nome, now()
    )
    returning * into v_sol;
  end if;

  insert into public.auditoria (tipo, referencia, detalhe, usuario_id, usuario_nome)
  values ('Abatimento cancelado', v_abat.nf || ' — ' || v_abat.laboratorio,
          'Cancelamento direto' || coalesce(' — ' || v_motivo, ''), v_uid, v_nome);

  return v_sol;
end;
$$;

-- Só usuários autenticados chamam as funções (cada uma revalida o perfil).
revoke execute on function public.solicitar_cancelamento_abatimento(uuid, text) from public, anon;
revoke execute on function public.decidir_cancelamento_abatimento(uuid, boolean, text) from public, anon;
revoke execute on function public.cancelar_abatimento_direto(uuid, text) from public, anon;
revoke execute on function public.is_aprovador_cancelamento() from public, anon;
grant execute on function public.solicitar_cancelamento_abatimento(uuid, text) to authenticated;
grant execute on function public.decidir_cancelamento_abatimento(uuid, boolean, text) to authenticated;
grant execute on function public.cancelar_abatimento_direto(uuid, text) to authenticated;
grant execute on function public.is_aprovador_cancelamento() to authenticated;

-- 4) Realtime: a Barbára vê novas solicitações e o solicitante vê a
-- decisão sem recarregar (a RLS de select decide quem recebe cada evento).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cancelamento_solicitacoes'
     ) then
    alter publication supabase_realtime add table public.cancelamento_solicitacoes;
  end if;
end $$;
