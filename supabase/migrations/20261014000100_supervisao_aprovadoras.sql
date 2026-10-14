-- Supervisão: Barbára e Thaisa com os MESMOS privilégios administrativos.
--
-- Decisão (14/10/2026, Bárbara): a conta Thaisa (Supervisão, role 'admin') tem exatamente o mesmo
-- nível de acesso da Bárbara. Tudo o que é administrativo já é por role (is_admin(), Edge Functions
-- create-user/delete-user) e, portanto, já vale para as duas. A ÚNICA autorização restrita a uma
-- pessoa era is_aprovador_cancelamento() (id fixo da Bárbara), que controla:
--   * cancelar abatimento direto, aprovar/recusar solicitações de cancelamento
--     (cancelar_abatimento_direto, decidir_cancelamento_abatimento);
--   * ler as solicitações de cancelamento (policy cancelamento_solicitacoes_select_financeiro);
--   * a regra "a aprovadora cancela direto, não solicita" (solicitar_cancelamento_abatimento);
--   * excluir abatimento CANCELADO (excluir_abatimento_cancelado);
--   * excluir funcionário INATIVO (excluir_funcionario).
--
-- O que esta migration faz (e SÓ isso): is_aprovador_cancelamento() passa a reconhecer as DUAS
-- contas, por lista EXPLÍCITA de ids — não por role/setor, para que nenhuma outra conta (nem um
-- admin criado no futuro) ganhe essas permissões automaticamente. Mesma assinatura, mesmas
-- propriedades (sql, stable, security definer, search_path) e mesmos grants.
--
-- Não muda: as regras de cada operação (só CANCELADO se exclui abatimento; só INATIVO se exclui
-- funcionário; motivo etc.), a auditoria (as funções gravam auth.uid() e o nome de quem executou),
-- nenhuma policy, nenhum dado, nenhuma permissão de outros usuários. RLS continua ligado.
--
-- Reversão: recriar a função só com a Bárbara (corpo de 20261002000010):
--   create or replace function public.is_aprovador_cancelamento() returns boolean language sql
--   security definer set search_path = public, pg_temp stable as $$
--     select auth.uid() = '6db64d55-bca1-49d0-b789-dabdbc646463'::uuid; $$;

create or replace function public.is_aprovador_cancelamento()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(auth.uid() in (
    '6db64d55-bca1-49d0-b789-dabdbc646463'::uuid,  -- Barbára Pinon (Supervisão)
    '62a9289c-95e3-4efd-bace-3a4ba8f9f014'::uuid   -- Thaisa (Supervisão)
  ), false);
$$;
