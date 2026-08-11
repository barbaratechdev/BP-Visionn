-- Chat interno da equipe (1-para-1). Segue o mesmo padrão de autorização já
-- usado no resto do projeto: profiles.role decide quem é quem, funções
-- security definer escopadas em auth.uid() evitam recursão de RLS, e a
-- proteção de verdade fica no banco — a interface só evita mostrar controles
-- que dariam erro.
--
-- "conversa_participantes" guarda quem está em cada conversa e, em
-- last_read_at, até quando essa pessoa já leu — não existe uma tabela de
-- "mensagem lida" por linha (cresceria mensagens × pessoas à toa); não-lida
-- é só "mensagem mais nova que o último last_read_at desse participante".

create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table public.conversas is 'Conversa 1-para-1 entre dois membros da equipe.';

create table public.conversa_participantes (
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversa_id, usuario_id)
);

comment on table public.conversa_participantes is 'Quem participa de cada conversa, e até quando cada um já leu.';

create index conversa_participantes_usuario_idx on public.conversa_participantes(usuario_id);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  remetente_id uuid references public.profiles(id) on delete set null,
  conteudo text not null,
  created_at timestamptz not null default now()
);

comment on table public.mensagens is 'Mensagens de uma conversa. Append-only — sem edição/exclusão nesta versão.';

create index mensagens_conversa_idx on public.mensagens(conversa_id, created_at);

-- esta_na_conversa: mesma lógica de is_admin()/is_demo() — checa o perfil de
-- quem chama sem cair em recursão de RLS ao consultar as próprias tabelas
-- que ela protege.
create or replace function public.esta_na_conversa(p_conversa_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversa_participantes
    where conversa_id = p_conversa_id and usuario_id = auth.uid()
  );
$$;

-- minhas_conversas: lista as conversas de quem chama já com o outro
-- participante, prévia da última mensagem e contagem de não lidas — tudo
-- escopado em auth.uid() (não em parâmetro do chamador), então mesmo sendo
-- security definer só devolve dados da própria pessoa, igual profiles_publico.
create or replace function public.minhas_conversas()
returns table (
  conversa_id uuid,
  outro_usuario_id uuid,
  ultima_mensagem text,
  ultima_mensagem_hora timestamptz,
  nao_lidas bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cp.conversa_id,
    outro.usuario_id as outro_usuario_id,
    ultima.conteudo as ultima_mensagem,
    ultima.created_at as ultima_mensagem_hora,
    coalesce((
      select count(*) from public.mensagens m
      where m.conversa_id = cp.conversa_id
        and m.created_at > cp.last_read_at
        and m.remetente_id is distinct from auth.uid()
    ), 0) as nao_lidas
  from public.conversa_participantes cp
  join public.conversa_participantes outro
    on outro.conversa_id = cp.conversa_id and outro.usuario_id <> cp.usuario_id
  left join lateral (
    select m2.conteudo, m2.created_at from public.mensagens m2
    where m2.conversa_id = cp.conversa_id
    order by m2.created_at desc limit 1
  ) ultima on true
  where cp.usuario_id = auth.uid();
$$;

revoke all on function public.minhas_conversas() from public, anon;
grant execute on function public.minhas_conversas() to authenticated;

-- RLS ------------------------------------------------------------------

alter table public.conversas enable row level security;
alter table public.conversa_participantes enable row level security;
alter table public.mensagens enable row level security;

create policy "conversas_select"
  on public.conversas for select
  to authenticated
  using (public.esta_na_conversa(id));

create policy "conversas_insert"
  on public.conversas for insert
  to authenticated
  with check (not public.is_demo());

create policy "conversa_participantes_select"
  on public.conversa_participantes for select
  to authenticated
  using (public.esta_na_conversa(conversa_id));

-- Insert em duas chamadas sequenciais (self, depois a outra pessoa): a
-- primeira linha passa por "usuario_id = auth.uid()", e a segunda passa
-- porque quem está inserindo já é participante da conversa (inserida na
-- chamada anterior). Bloqueia Demonstração dos dois lados: como quem
-- insere (not is_demo()) e como alvo (o exists no fim).
create policy "conversa_participantes_insert"
  on public.conversa_participantes for insert
  to authenticated
  with check (
    not public.is_demo()
    and (
      usuario_id = auth.uid()
      or exists (
        select 1 from public.conversa_participantes cp
        where cp.conversa_id = conversa_participantes.conversa_id
          and cp.usuario_id = auth.uid()
      )
    )
    and not exists (
      select 1 from public.profiles pr
      where pr.id = conversa_participantes.usuario_id and pr.role = 'demo'
    )
  );

-- Só a própria marcação de leitura (last_read_at) pode ser atualizada.
create policy "conversa_participantes_update_own"
  on public.conversa_participantes for update
  to authenticated
  using (usuario_id = auth.uid() and not public.is_demo())
  with check (usuario_id = auth.uid() and not public.is_demo());

create policy "mensagens_select"
  on public.mensagens for select
  to authenticated
  using (public.esta_na_conversa(conversa_id));

create policy "mensagens_insert"
  on public.mensagens for insert
  to authenticated
  with check (
    not public.is_demo()
    and remetente_id = auth.uid()
    and public.esta_na_conversa(conversa_id)
  );

-- Sem update/delete em mensagens nesta versão (sem editar/apagar mensagem).

-- Realtime: publica INSERTs de "mensagens" para quem tiver permissão de
-- SELECT na linha (RLS também vale para postgres_changes).
alter publication supabase_realtime add table public.mensagens;
