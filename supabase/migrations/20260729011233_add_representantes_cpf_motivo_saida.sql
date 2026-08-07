-- Campos que faltavam para o cadastro completo de representantes:
-- CPF (documento da pessoa) e motivo da saída (preenchido só quando
-- o status muda para Inativo — por isso é opcional).
alter table public.representantes
  add column cpf text,
  add column motivo_saida text;

comment on column public.representantes.cpf is 'CPF do representante (texto livre, sem validação de formato — mesmo padrão de contratos.cpf_cnpj).';
comment on column public.representantes.motivo_saida is 'Preenchido apenas quando status = Inativo.';
