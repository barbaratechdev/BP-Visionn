# Rollback — RH sem módulos operacionais (migration `20261008000100`)

A migration `20261008000100_rh_sem_modulos_operacionais.sql` só altera a expressão de 8 policies de
leitura (Prorrogação de Boletos, Avarias, Abatimentos e Contratos). **Não altera dados**, então
reverter não perde nada. O bloco abaixo restaura exatamente o estado de produção lido em 07/10/2026,
**depois** da migration `20261008000000` (Comercial sem dados internos) — que continua valendo e tem
seu próprio rollback em `docs/rollback-comercial-sem-dados-internos.md`.

## Ordem

1. **Frontend primeiro** (se já publicado): `git revert` do commit do frontend (as 4 abas voltam a
   aparecer para o RH).
2. **Banco**: bloco `rollback-rh-sem-modulos-operacionais` (um comando só; atômico quando aplicado
   pelo método das fases anteriores, em um `DO`).
3. Conferir com o bloco `verificar-rh-sem-modulos-operacionais`.
4. Para reaplicar depois: `delete from supabase_migrations.schema_migrations where version = '20261008000100';`

## 1. Reverter

```sql rollback-rh-sem-modulos-operacionais
alter policy "pendencias_select_financeiro" on public.pendencias
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));

alter policy "abatimentos_select_financeiro" on public.abatimentos
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));

alter policy "avarias_select_financeiro" on public.avarias
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));

alter policy "avaria_historico_select_financeiro" on public.avaria_historico
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));

alter policy "avaria_solicitacoes_select_financeiro" on public.avaria_solicitacoes
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));

alter policy "avaria_concessoes_select_financeiro" on public.avaria_concessoes
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));

alter policy "avaria_aplicacoes_select_financeiro" on public.avaria_aplicacoes
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));

alter policy "contratos_select_financeiro" on public.contratos
  using ((public.pode_ver_modulos() AND (NOT public.is_demo())));
```

## 2. Verificar (somente leitura)

```sql verificar-rh-sem-modulos-operacionais
select count(*) as selects_com_pode_ver_modulos from pg_policies
 where schemaname = 'public' and cmd = 'SELECT'
   and policyname in ('pendencias_select_financeiro','abatimentos_select_financeiro','avarias_select_financeiro',
     'avaria_historico_select_financeiro','avaria_solicitacoes_select_financeiro','avaria_concessoes_select_financeiro',
     'avaria_aplicacoes_select_financeiro','contratos_select_financeiro')
   and qual ilike '%pode_ver_modulos()%';  -- esperado: 8
```
