-- Prorrogação de Boletos ganha um campo de valor (mesmo padrão de
-- tarefas.valor: numeric opcional) e passa a poder ser editada de verdade
-- (fornecedor/NF/vencimento/estado/valor) pela Supervisora, não só criada
-- e ter a situação trocada.
alter table public.pendencias add column valor numeric(12,2);

-- Amplia a mesma trava de 20260729012946: fornecedor/numero_nf/vencimento/
-- contrato_id já eram admin-only na edição; valor e estado (unidade
-- federativa, adicionada em 20260812000000) entram na mesma lista — são
-- fatos da NF, não do fluxo de negociação (isso é "situacao", que
-- continua liberada pro Financeiro via a policy de update normal).
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
      or new.valor is distinct from old.valor
      or new.estado is distinct from old.estado
      or new.contrato_id is distinct from old.contrato_id then
      raise exception 'Apenas a Supervisora pode editar fornecedor, NF, vencimento, valor, estado ou contrato vinculado.';
    end if;
  end if;
  return new;
end;
$$;