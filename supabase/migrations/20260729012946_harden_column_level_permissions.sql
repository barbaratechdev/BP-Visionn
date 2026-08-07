-- Restrições em nível de coluna, complementando o RLS.
--
-- O RLS decide QUAL LINHA um perfil pode alterar (ex.: "a própria", "uma
-- linha de qualquer Financeiro"). Ele não decide QUAIS COLUNAS dessa linha
-- podem mudar. Isso abre uma falha real: qualquer pessoa autenticada que
-- tenha permissão de UPDATE sobre uma linha (a própria, no caso de
-- profiles) pode, via chamada direta à API — sem passar pela interface —
-- alterar QUALQUER coluna dessa linha, inclusive as que a tela nunca expõe.
--
-- VULNERABILIDADE CRÍTICA encontrada e corrigida aqui: a policy
-- "profiles_update_self_or_admin" permite que cada usuário atualize a
-- própria linha em profiles, mas não impedia qual coluna — ou seja,
-- qualquer Funcionária autenticada podia rodar, direto no console do
-- navegador:
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', meuId)
-- e se autopromover a Supervisora, ganhando acesso total ao sistema.
-- O mesmo valia para "setor" (bastava setar 'Financeiro' pra destravar
-- Contratos/Representantes/Pendências). Os gatilhos abaixo bloqueiam
-- explicitamente qualquer alteração de "role" ou "setor" que não venha de
-- quem já é admin.

create or replace function public.proteger_profiles_role_setor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Apenas a Supervisora pode alterar o cargo.';
    end if;
    if new.setor is distinct from old.setor then
      raise exception 'Apenas a Supervisora pode alterar o setor.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role_setor
  before update on public.profiles
  for each row execute function public.proteger_profiles_role_setor();

-- tarefas: a policy de RLS já garante que uma Funcionária só grava na
-- própria tarefa (responsavel_id = auth.uid()), mas dentro dessa linha ela
-- poderia, hoje, alterar fornecedor/valor/observação/responsável via API
-- direta — campos que a interface só deixa a Supervisora tocar (o "Editar"
-- da lista de tarefas é admin-only; Funcionária só tem Concluir/Prorrogar).
-- Numa ferramenta que controla boleto a pagar, isso é risco real de
-- adulteração de valor/fornecedor pela própria pessoa responsável.
create or replace function public.proteger_tarefas_campos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.fornecedor is distinct from old.fornecedor
      or new.valor is distinct from old.valor
      or new.observacao is distinct from old.observacao
      or new.responsavel_id is distinct from old.responsavel_id then
      raise exception 'Apenas a Supervisora pode editar fornecedor, valor, observação ou responsável.';
    end if;
  end if;
  return new;
end;
$$;

create trigger tarefas_protect_campos
  before update on public.tarefas
  for each row execute function public.proteger_tarefas_campos();

-- contratos: a interface só deixa quem é Financeiro/admin salvar a revisão
-- do texto do documento (documento_texto) depois que o contrato existe —
-- nunca reeditar representante, percentual de comissão, CPF/CNPJ etc. Sem
-- este gatilho, qualquer conta do Financeiro poderia mudar esses campos
-- por API direta.
create or replace function public.proteger_contratos_campos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.representante_id is distinct from old.representante_id
      or new.tipo is distinct from old.tipo
      or new.cpf_cnpj is distinct from old.cpf_cnpj
      or new.porcentagem is distinct from old.porcentagem
      or new.email is distinct from old.email
      or new.telefone is distinct from old.telefone
      or new.data_inicio is distinct from old.data_inicio
      or new.status is distinct from old.status then
      raise exception 'Apenas a Supervisora pode editar os dados do contrato.';
    end if;
  end if;
  return new;
end;
$$;

create trigger contratos_protect_campos
  before update on public.contratos
  for each row execute function public.proteger_contratos_campos();

-- pendencias: a interface só deixa Financeiro/admin mudar o "estado" da
-- negociação numa NF já cadastrada — renomear fornecedor/NF/vencimento ou
-- trocar o contrato vinculado depois de criada é só da Supervisora.
create or replace function public.proteger_pendencias_campos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.fornecedor is distinct from old.fornecedor
      or new.numero_nf is distinct from old.numero_nf
      or new.vencimento is distinct from old.vencimento
      or new.contrato_id is distinct from old.contrato_id then
      raise exception 'Apenas a Supervisora pode editar fornecedor, NF, vencimento ou contrato vinculado.';
    end if;
  end if;
  return new;
end;
$$;

create trigger pendencias_protect_campos
  before update on public.pendencias
  for each row execute function public.proteger_pendencias_campos();
