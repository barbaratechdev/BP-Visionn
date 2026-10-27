# Reversão — SUFRAMA no Cadastro de Clientes

Migration: `supabase/migrations/20261027210000_cadastro_clientes_suframa.sql`
Tela: ramo `feature/cadastro-suframa` (arquivos `src/lib/cadastroClientes.ts`, `src/components/CadastroClientes.tsx`,
`src/components/CadastroClienteDetalhe.tsx`).

A migration só acrescenta: a coluna `suframa_vencimento` (vazia em todos os cadastros existentes) e a SUFRAMA na
lista de campos do histórico. Policies, RLS e permissões não mudam.

## Ordem de publicação (e por que ela importa)

1. Aplicar a migration.
2. Publicar a tela nova.

A tela nova envia `suframa_vencimento` ao salvar. Publicada **antes** da migration, toda inclusão e edição de
cadastro falharia (coluna inexistente). A tela anterior continua funcionando com a migration aplicada, porque
não envia a coluna.

## Reverter

Faça na ordem inversa da publicação.

### 1. Tela

Voltar o deploy de produção na Vercel para o anterior (promover o deploy da versão sem SUFRAMA). Depois disso a
tela não lê nem grava mais a SUFRAMA; as datas já gravadas continuam no banco.

### 2. Banco (só se for preciso tirar a coluna)

**Atenção:** apagar a coluna apaga as datas de SUFRAMA já informadas. Antes, faça backup e confirme com a equipe.
Conferir se há dados:

```sql
select count(*) as com_suframa from public.clientes_cadastro where suframa_vencimento is not null;
```

1. **Histórico:** voltar a função à versão da etapa A das melhorias — copiar a seção
   `-- 3) Histórico: campos novos` de `supabase/migrations/20261023000000_cadastro_clientes_melhorias.sql` (o
   `create or replace function public.clientes_cadastro_registrar_historico()` e o `revoke` logo abaixo) e
   executar. Faça isso **antes** de apagar a coluna: a função não falha sem ela (lê o registro como JSON), mas
   assim fica idêntica à de antes.
2. **Coluna:**
   ```sql
   alter table public.clientes_cadastro drop column suframa_vencimento;
   ```
   As linhas do histórico com `campo = 'suframa_vencimento'` continuam (o histórico é imutável); a tela antiga
   as mostra com o nome técnico do campo.
3. **Histórico de migrations:** consultar a versão real registrada (quando aplicada pelo conector do Supabase,
   a versão é a data e hora da aplicação, não o número do arquivo) e remover só ela:
   ```sql
   select version, name from supabase_migrations.schema_migrations where name = 'cadastro_clientes_suframa';
   delete from supabase_migrations.schema_migrations where version = '<versão encontrada na consulta>';
   ```

## Conferência depois de reverter

```sql
select count(*) from information_schema.columns
where table_schema = 'public' and table_name = 'clientes_cadastro' and column_name = 'suframa_vencimento';  -- 0
select position('suframa' in pg_get_functiondef('public.clientes_cadastro_registrar_historico()'::regprocedure)); -- 0
```
