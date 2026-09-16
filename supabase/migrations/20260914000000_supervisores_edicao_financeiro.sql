-- Generaliza pode_editar_supervisores() de uma lista nominal (Esmeralda,
-- Ana, Paulo) pra usar is_financeiro() — reflete a decisão de negócio de
-- liberar a aba Supervisores (incluir/editar) pra todo o setor Financeiro,
-- não só pras pessoas que haviam sido citadas nominalmente até aqui. Mantém
-- a exceção nominal só pra Esmeralda/Ana, caso alguma delas não esteja
-- cadastrada com setor='Financeiro' — evita remover acesso que já existia
-- (ver App.tsx: isSupervisoresExtra/podeEditarSupervisores, mesmo critério).
create or replace function public.pode_editar_supervisores()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_financeiro() or exists (
    select 1 from public.profiles
    where id = auth.uid() and name ~* '\y(esmeralda|ana)\y'
  );
$$;
