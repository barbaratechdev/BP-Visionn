# Rollback — Comercial sem dados internos (migration `20261008000000`)

A migration `20261008000000_comercial_sem_dados_internos.sql` só altera expressões de 12 policies
(RH, Representantes, Supervisores) e o filtro da função `supervisores_lista()`. **Não altera dados**,
então reverter não perde nada. O bloco abaixo restaura exatamente o estado de produção lido em
07/10/2026, **depois** da migration `20261007000100` (leitura geral + Comercial opera) — que continua
valendo e tem seu próprio rollback em `docs/rollback-leitura-geral-comercial.md`.

## Ordem

1. **Frontend primeiro** (se já publicado): `git revert` do commit do frontend (as abas RH,
   Representantes e Supervisores voltam a aparecer para o Comercial).
2. **Banco**: bloco `rollback-comercial-sem-dados-internos` (um comando só; atômico quando aplicado
   pelo método das fases anteriores, em um `DO`).
3. Conferir com o bloco `verificar-comercial-sem-dados-internos`.
4. Para reaplicar depois: `delete from supabase_migrations.schema_migrations where version = '20261008000000';`

## 1. Reverter

```sql rollback-comercial-sem-dados-internos
alter policy "funcionarios_select_rh" on public.funcionarios
  using ((public.pode_gerenciar_funcionarios() OR public.pode_ver_modulos()));

alter policy "funcionario_salarios_select_rh" on public.funcionario_salarios
  using ((public.pode_gerenciar_funcionarios() OR public.pode_ver_modulos()));

alter policy "funcionario_ocorrencias_select_rh" on public.funcionario_ocorrencias
  using ((public.pode_gerenciar_funcionarios() OR public.pode_ver_modulos()));

alter policy "funcionario_documentos_select_rh" on public.funcionario_documentos
  using ((public.pode_gerenciar_funcionarios() OR public.pode_ver_modulos()));

alter policy "funcionario_exames_select_rh" on public.funcionario_exames
  using ((public.pode_gerenciar_funcionarios() OR public.pode_ver_modulos()));

alter policy "ferias_select_rh" on public.ferias
  using ((public.pode_gerenciar_funcionarios() OR public.pode_ver_modulos()));

alter policy "representantes_select_financeiro" on public.representantes
  using ((public.pode_ver_modulos() OR (public.is_demo() AND (nome ~~* '%TESTE%'::text))));

alter policy "representantes_insert_financeiro" on public.representantes
  with check (((public.is_financeiro() OR public.is_rh() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "representantes_update_financeiro" on public.representantes
  using (((public.is_financeiro() OR public.is_rh() OR public.is_comercial()) AND (NOT public.is_demo())))
  with check (((public.is_financeiro() OR public.is_rh() OR public.is_comercial()) AND (NOT public.is_demo())));

alter policy "supervisores_select_authenticated" on public.supervisores
  using ((NOT public.is_demo()));

alter policy "supervisores_insert_admin" on public.supervisores
  with check ((public.is_admin() OR public.pode_editar_supervisores() OR public.is_comercial()));

alter policy "supervisores_update_admin" on public.supervisores
  using ((public.is_admin() OR public.pode_editar_supervisores() OR public.is_comercial()))
  with check ((public.is_admin() OR public.pode_editar_supervisores() OR public.is_comercial()));

CREATE OR REPLACE FUNCTION public.supervisores_lista()
 RETURNS TABLE(id uuid, nome text, cpf text, email text, telefone text, data_nascimento date, cargo text, regiao text, data_inicio date, data_fim date, status text, observacoes text, foto_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  where (not public.is_demo() or s.nome ilike '%TESTE%')
  order by s.nome;
$function$;
```

## 2. Verificar (somente leitura)

```sql verificar-comercial-sem-dados-internos
select count(*) as policies_com_not_is_comercial from pg_policies
 where schemaname = 'public' and coalesce(qual,'')||coalesce(with_check,'') ilike '%NOT is_comercial()%';  -- esperado: 1 (só tarefas_insert_authenticated, da 20261007000000)
select pg_get_functiondef('public.supervisores_lista()'::regprocedure) ilike '%is_comercial%' as lista_cita_comercial;  -- esperado: false
select qual from pg_policies where policyname = 'supervisores_select_authenticated';  -- esperado: (NOT is_demo())
```
