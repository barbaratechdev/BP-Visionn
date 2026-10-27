# Reversão — Motivo, filtro e paginação na Prorrogação de Boletos

Migrations: `supabase/migrations/20261028000000_pendencias_motivo.sql` (A) e
`supabase/migrations/20261028000100_pendencias_motivo_obrigatorio.sql` (B).
Tela: ramo `feature/boletos-motivo` (arquivos `src/App.tsx`, `src/lib/helpers.ts`, `src/index.css`).

## Ordem de publicação (e por que ela importa)

1. **Etapa A** — cria a coluna `pendencias.motivo` (vazia em todos os boletos existentes). A tela anterior continua
   funcionando, porque não envia a coluna.
2. **Publicar a tela nova** — ela envia `motivo` ao incluir e ao editar. Publicada **antes** da etapa A, toda inclusão
   e edição de boleto falharia (coluna inexistente).
3. **Etapa B** — liga no banco a obrigatoriedade (inclusão sem motivo é recusada; motivo informado não pode ser
   apagado). Aplicada com a tela anterior ainda no ar, a inclusão de boletos pela tela anterior pararia de funcionar.
   A etapa B tem uma trava: sem a etapa A, ela para na primeira instrução, sem alterar nada.

## Reverter

Faça na ordem inversa da publicação, só até onde for preciso.

### 1. Etapa B (obrigatoriedade)

```sql
drop trigger if exists pendencias_motivo_obrigatorio on public.pendencias;
drop function if exists public.pendencias_motivo_obrigatorio();
```

A tela continua exigindo o motivo na inclusão; só o banco deixa de exigir. Nenhum dado muda.

### 2. Tela

Voltar o deploy de produção na Vercel para o anterior (promover o deploy da versão sem Motivo). A coluna e os motivos
já gravados continuam no banco.

**Antes de seguir para o passo 3**, a etapa B precisa estar revertida (passo 1): com o gatilho no ar, a tela anterior
não consegue incluir boletos.

### 3. Etapa A (coluna) — só se for preciso tirá-la

**Atenção:** apagar a coluna apaga os motivos já informados. Antes, faça backup e confirme com a equipe. Conferir:

```sql
select motivo, count(*) from public.pendencias group by motivo;
```

```sql
alter table public.pendencias drop column motivo;
```

### 4. Histórico de migrations

Consultar a versão real registrada (quando aplicada pelo conector do Supabase, a versão é a data e hora da aplicação,
não o número do arquivo) e remover só a da etapa revertida:

```sql
select version, name from supabase_migrations.schema_migrations
where name in ('pendencias_motivo', 'pendencias_motivo_obrigatorio') order by version;
delete from supabase_migrations.schema_migrations where version = '<versão encontrada na consulta>';
```

## Conferência depois de reverter

```sql
select count(*) from pg_trigger where tgname = 'pendencias_motivo_obrigatorio';                       -- 0 (passo 1)
select count(*) from information_schema.columns
where table_schema = 'public' and table_name = 'pendencias' and column_name = 'motivo';               -- 0 (passo 3)
```
