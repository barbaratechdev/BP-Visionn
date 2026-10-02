# Rollback — fluxo de aprovação de cancelamentos de Abatimentos

Migrations envolvidas (nesta ordem de aplicação):

| Fase | Arquivo | Efeito |
|---|---|---|
| A (aditiva) | `20261002000010_abatimentos_cancelamento_fluxo.sql` | Cria tabela de solicitações, funções e Realtime. **Não muda** o comportamento atual. |
| B (enforcement) | `20261002000020_abatimentos_cancelamento_enforcement.sql` | Bloqueia o cancelamento direto e protege a auditoria do fluxo. |

**Regra de ouro:** se algo der errado, reverta primeiro a **Fase B**. Isso devolve o
comportamento antigo na hora e **não perde nenhum dado**. Reverter a Fase A é a
última opção (ver abaixo).

Todos os comandos abaixo rodam como dono do banco (SQL Editor do Supabase ou MCP
`execute_sql`/`apply_migration`). Nenhum deles apaga abatimentos ou histórico de
solicitações.

## 1. Pausa rápida da Fase B (reversível, sem apagar nada)

Use quando alguém precisa cancelar **agora** e o fluxo novo está atrapalhando.
É preciso desligar os **dois** gatilhos: o frontend antigo, depois de cancelar,
também grava `Abatimento cancelado` na auditoria, e o gatilho da auditoria
recusaria esse registro.

```sql pausa
alter table public.abatimentos disable trigger abatimentos_proteger_cancelamento_trigger;
alter table public.auditoria   disable trigger auditoria_proteger_fluxo_cancelamento_trigger;
```

Reativar (assim que o problema for resolvido — enquanto estiver desligado, o
cancelamento direto pela API volta a funcionar para o Financeiro):

```sql reativa
alter table public.abatimentos enable trigger abatimentos_proteger_cancelamento_trigger;
alter table public.auditoria   enable trigger auditoria_proteger_fluxo_cancelamento_trigger;
```

## 2. Rollback da Fase B (remove a trava; preserva o histórico)

```sql rollback-b
drop trigger if exists abatimentos_proteger_cancelamento_trigger on public.abatimentos;
drop trigger if exists auditoria_proteger_fluxo_cancelamento_trigger on public.auditoria;
drop function if exists public.abatimentos_proteger_cancelamento();
drop function if exists public.auditoria_proteger_fluxo_cancelamento();
```

Depois disso: o frontend antigo volta a cancelar; o frontend novo continua
funcionando (solicitar/aprovar/cancelar direto); a tabela
`cancelamento_solicitacoes` segue protegida e com todo o histórico.

Para reaplicar a Fase B, rode de novo `20261002000020_abatimentos_cancelamento_enforcement.sql`.

## 3. Rollback da Fase A (último recurso)

**Só se a tabela `cancelamento_solicitacoes` estiver vazia ou depois de exportar o
histórico** — o rollback apaga a tabela. Antes, confirme e exporte:

```sql exportar
select * from public.cancelamento_solicitacoes order by created_at;
```

Reverta a Fase B primeiro (seção 2) e então:

```sql rollback-a
do $$
begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cancelamento_solicitacoes') then
    alter publication supabase_realtime drop table public.cancelamento_solicitacoes;
  end if;
end $$;
drop function if exists public.solicitar_cancelamento_abatimento(uuid, text);
drop function if exists public.decidir_cancelamento_abatimento(uuid, boolean, text);
drop function if exists public.cancelar_abatimento_direto(uuid, text);
drop table if exists public.cancelamento_solicitacoes;
drop function if exists public.cancelamento_solicitacoes_proteger();
drop function if exists public.is_aprovador_cancelamento();
```

Os abatimentos já cancelados continuam cancelados (o status fica em `abatimentos`).
As linhas de auditoria já geradas (`Cancelamento de abatimento …`) também ficam.

## 4. Frontend

O frontend novo **depende** da Fase A: sem as funções no banco, solicitar e
cancelar dão erro. Se for preciso voltar o site, faça o *redeploy instantâneo*
do deploy anterior no painel da Vercel (projeto `bp-visionn`) — não exige mexer
no banco. Atenção ao combinar com a Fase B: o frontend **antigo** é bloqueado
pela Fase B, então volte o site **e** a Fase B juntos (seção 2).

| Situação | Frontend antigo | Frontend novo |
|---|---|---|
| Sem Fase A nem B | Cancela | **Ninguém cancela** (funções não existem) |
| Só Fase A | Cancela | Solicita / aprova / cancela direto |
| Fase A + B | **Bloqueado** | Solicita / aprova / cancela direto |

## 5. Se a Bárbara não puder agir

Ela cancela direto pela tela de Abatimentos (função `cancelar_abatimento_direto`).
Se o problema for com a conta dela, use a pausa (seção 1) para liberar o
cancelamento direto temporariamente e reative depois.

## 6. Verificações depois de qualquer rollback (somente leitura)

```sql verificar
select tgname, tgenabled from pg_trigger
 where tgname in ('abatimentos_proteger_cancelamento_trigger','auditoria_proteger_fluxo_cancelamento_trigger',
                  'cancelamento_solicitacoes_proteger_trigger');
select status, count(*) from public.abatimentos group by status;
select status, count(*) from public.cancelamento_solicitacoes group by status;
```
