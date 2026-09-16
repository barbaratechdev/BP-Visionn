-- Libera edição completa (fornecedor/NF/vencimento/contrato/valor/estado) e
-- exclusão de NFs em Prorrogação de Boletos (tabela pendencias) pro setor
-- Financeiro (Adria, Paulo), não só pra Supervisora — decisão de negócio
-- confirmada com a usuária. Antes disso, só is_admin() podia mudar esses
-- campos (trigger proteger_pendencias_campos) e só is_admin() podia
-- excluir (policy pendencias_delete_admin); select/insert/update genéricos
-- já usavam is_financeiro() desde 20260729003645_row_level_security.sql.

create or replace function public.proteger_pendencias_campos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_financeiro() then
    if new.fornecedor is distinct from old.fornecedor
      or new.numero_nf is distinct from old.numero_nf
      or new.vencimento is distinct from old.vencimento
      or new.contrato_id is distinct from old.contrato_id then
      raise exception 'Apenas a Supervisora ou o Financeiro podem editar fornecedor, NF, vencimento ou contrato vinculado.';
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists "pendencias_delete_admin" on public.pendencias;

create policy "pendencias_delete_financeiro"
  on public.pendencias for delete
  to authenticated
  using (public.is_financeiro());
