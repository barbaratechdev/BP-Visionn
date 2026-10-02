-- Libera para a Ariana (setor "Financeiro - MA") o mesmo acesso de banco do
-- setor Financeiro (Esmeralda, Paulo), sem alterar o setor dela.
--
-- Exceção individual, por id (imutável) — não depende de nome nem e-mail.
-- Todas as policies e funções do Financeiro passam por is_financeiro(),
-- então este é o único ponto a ajustar. Demais usuários seguem avaliados
-- por role/setor exatamente como antes.
create or replace function public.is_financeiro()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or setor = 'Financeiro'
        or id = '95dd833e-db0e-4e65-b7fe-1188ed8ee5a3'  -- Ariana
      )
  );
$$;
