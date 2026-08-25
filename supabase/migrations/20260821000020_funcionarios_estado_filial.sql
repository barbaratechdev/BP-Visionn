-- "Estado/Filial" no cadastro de funcionarios — identifica em qual
-- localidade/unidade cada funcionário está (Benevides, Ananindeua,
-- Maranhão, Piauí). Lista fechada por check constraint, não enum do
-- Postgres, no mesmo padrão já usado em tarefas.status/pendencias.situacao
-- neste projeto — trocar/adicionar uma opção no futuro é um ALTER TABLE
-- simples, sem migração de tipo. Os valores batem 1:1 com
-- ESTADOS_FILIAL em src/constants.ts.
--
-- Nullable e sem default: cadastros já existentes ficam sem localidade
-- definida até serem editados (não quebra nada). Indexado desde já pra
-- filtro futuro por Estado/Filial na listagem, sem precisar de outra
-- migration só pra isso.
alter table public.funcionarios
  add column estado_filial text
    check (estado_filial in ('PA — Benevides','PA — Ananindeua (Filial)','MA','PI'));

comment on column public.funcionarios.estado_filial is 'Localidade/filial do funcionário — nulo em cadastros anteriores a esta coluna, até serem editados.';

create index funcionarios_estado_filial_idx on public.funcionarios(estado_filial);
