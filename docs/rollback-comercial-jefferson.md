# Rollback — setor Comercial somente leitura (migration `20261007000000`)

A migration `20261007000000_comercial_somente_leitura.sql` só altera expressões de policies,
cria a função `is_comercial()` e acrescenta uma condição em `supervisores_lista()`.
**Não altera dados**, então reverter não perde nada. Os blocos abaixo restauram exatamente o
estado de produção lido em 07/10/2026 (antes desta migration).

## Ordem

1. **Frontend primeiro** (se já publicado): `git revert` do commit do frontend. Sem isso, com o
   banco revertido, o menu do Comercial continuaria mostrando as abas (vazias, sem erro).
2. **Banco**: bloco `rollback-comercial` abaixo, em um único comando (é atômico por ser um `DO`
   quando executado pelo método das fases anteriores).
3. Conferir com o bloco `verificar-comercial`.
4. Se for preciso reaplicar depois, apagar a linha do histórico:
   `delete from supabase_migrations.schema_migrations where version = '20261007000000';`

## 1. Reverter (restaura as 9 policies, a RPC e remove `is_comercial()`)

```sql rollback-comercial
alter policy "pendencias_select_financeiro" on public.pendencias using (public.is_financeiro() and not public.is_demo());
alter policy "abatimentos_select_financeiro" on public.abatimentos using (public.is_financeiro() and not public.is_demo());
alter policy "avarias_select_financeiro" on public.avarias using (public.is_financeiro() and not public.is_demo());
alter policy "avaria_historico_select_financeiro" on public.avaria_historico using (public.is_financeiro() and not public.is_demo());
alter policy "avaria_solicitacoes_select_financeiro" on public.avaria_solicitacoes using (public.is_financeiro() and not public.is_demo());
alter policy "avaria_concessoes_select_financeiro" on public.avaria_concessoes using (public.is_financeiro() and not public.is_demo());
alter policy "avaria_aplicacoes_select_financeiro" on public.avaria_aplicacoes using (public.is_financeiro() and not public.is_demo());

alter policy "supervisores_select_authenticated" on public.supervisores using (not public.is_demo());
alter policy "tarefas_insert_authenticated" on public.tarefas with check (not public.is_demo());

create or replace function public.supervisores_lista()
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

-- Por último: nenhuma policy ou função usa mais is_comercial().
drop function public.is_comercial();
```

## 2. Verificar (somente leitura)

```sql verificar-comercial
select tablename, policyname, cmd, regexp_replace(coalesce(qual, with_check, ''), '\s+', ' ', 'g') as expressao
  from pg_policies
 where policyname in ('pendencias_select_financeiro','abatimentos_select_financeiro','avarias_select_financeiro',
   'avaria_historico_select_financeiro','avaria_solicitacoes_select_financeiro','avaria_concessoes_select_financeiro',
   'avaria_aplicacoes_select_financeiro','supervisores_select_authenticated','tarefas_insert_authenticated')
 order by tablename;
select to_regprocedure('public.is_comercial()') as is_comercial_existe;  -- esperado: nulo
select pg_get_functiondef('public.supervisores_lista()'::regprocedure) not ilike '%is_comercial%' as lista_original;
```
