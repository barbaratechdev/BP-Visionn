# Rollback — RH com Representantes somente leitura (migration `20261008000200`)

A migration `20261008000200_rh_representantes_somente_leitura.sql` só altera a expressão das policies de
INSERT e UPDATE de `representantes` (tira o `is_rh()`). **Não altera dados**, então reverter não perde
nada. O bloco abaixo restaura exatamente o estado anterior a ela — o de produção depois da migration
`20261008000000` (Comercial sem dados internos), que continua valendo e tem seu próprio rollback em
`docs/rollback-comercial-sem-dados-internos.md`.

## Ordem

1. **Frontend primeiro** (se já publicado): `git revert` do commit do frontend (os botões "Novo
   representante"/"Editar" e os de Supervisores voltam a aparecer para o RH).
2. **Banco**: bloco `rollback-rh-representantes-somente-leitura` (um comando só; atômico quando aplicado
   pelo método das fases anteriores, em um `DO`).
3. Conferir com o bloco `verificar-rh-representantes-somente-leitura`.
4. Para reaplicar depois: `delete from supabase_migrations.schema_migrations where version = '20261008000200';`

## 1. Reverter

```sql rollback-rh-representantes-somente-leitura
alter policy "representantes_insert_financeiro" on public.representantes
  with check (((public.is_financeiro() OR public.is_rh()) AND (NOT public.is_comercial()) AND (NOT public.is_demo())));

alter policy "representantes_update_financeiro" on public.representantes
  using (((public.is_financeiro() OR public.is_rh()) AND (NOT public.is_comercial()) AND (NOT public.is_demo())))
  with check (((public.is_financeiro() OR public.is_rh()) AND (NOT public.is_comercial()) AND (NOT public.is_demo())));
```

## 2. Verificar (somente leitura)

```sql verificar-rh-representantes-somente-leitura
select count(*) as escrita_representantes_com_is_rh from pg_policies
 where schemaname = 'public' and tablename = 'representantes'
   and policyname in ('representantes_insert_financeiro','representantes_update_financeiro')
   and coalesce(qual,'')||coalesce(with_check,'') ilike '%is_rh()%';  -- esperado: 2
```
