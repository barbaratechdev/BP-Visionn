-- "Setor" no cadastro de funcionarios (RH) — faltava: a tabela guarda
-- vínculo/VT/VR mas não departamento. Precisa disso pro Controle de
-- Férias mostrar "Nome — Setor" na listagem. Não reaproveita
-- profiles.setor porque funcionarios é o cadastro de pessoal completo do
-- RH (com ou sem conta de login — ver 20260817000000), então precisa do
-- próprio campo em vez de depender de um profile que pode nem existir.
-- Nullable e sem check: texto livre, mesmo padrão de profiles.setor (não
-- há uma lista fixa de setores no sistema hoje).

alter table public.funcionarios add column setor text;

comment on column public.funcionarios.setor is 'Departamento/setor do funcionário — texto livre, mesmo padrão de profiles.setor.';
