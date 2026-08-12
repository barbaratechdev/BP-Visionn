-- Demonstração deixa de enxergar toda a lista de representantes e
-- supervisores (mesmo alcance de leitura do Financeiro/admin) e passa a
-- ver só os registros cujo nome contenha "TESTE" — mesmo raciocínio já
-- aplicado a tarefas em 20260811200000_restringir_tarefas_demo_ao_email_teste.sql:
-- Demonstração só deve enxergar dado marcado como fictício/de teste, nunca
-- gente real da equipe ou representante comercial de verdade.
--
-- ilike (case-insensitive) porque "TESTE" pode ter sido digitado em
-- qualquer caixa no cadastro; a regra é sobre a palavra estar presente,
-- não sobre maiúsculas exatas.

-- representantes: mesma policy de select, só adiciona a condição de nome
-- pro branch do is_demo() — is_financeiro() (inclui admin) continua igual.
alter policy "representantes_select_financeiro"
  on public.representantes
  using (public.is_financeiro() or (public.is_demo() and nome ilike '%TESTE%'));

-- supervisores: a tabela em si já bloqueia demo por completo (RLS
-- "not is_demo()"); o filtro entra na função de leitura, que é o único
-- jeito de Demonstração enxergar qualquer linha.
drop function if exists public.supervisores_lista();

create function public.supervisores_lista()
returns table (
  id uuid,
  nome text,
  cpf text,
  email text,
  telefone text,
  data_nascimento date,
  cargo text,
  regiao text,
  data_inicio date,
  data_fim date,
  status text,
  observacoes text,
  foto_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id, s.nome,
    case when public.is_demo() then null else s.cpf end,
    case when public.is_demo() then null else s.email end,
    case when public.is_demo() then null else s.telefone end,
    case when public.is_demo() then null else s.data_nascimento end,
    s.cargo, s.regiao, s.data_inicio, s.data_fim, s.status,
    case when public.is_demo() then null else s.observacoes end,
    s.foto_url, s.created_at, s.updated_at
  from public.supervisores s
  where not public.is_demo() or s.nome ilike '%TESTE%'
  order by s.nome;
$$;

revoke all on function public.supervisores_lista() from public, anon;
grant execute on function public.supervisores_lista() to authenticated;