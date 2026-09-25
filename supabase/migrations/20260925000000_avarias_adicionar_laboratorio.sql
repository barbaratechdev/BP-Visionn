-- Laboratório passa a ser um dado da própria avaria (não só da
-- solicitação) — decisão de negócio: a avaria representa o laboratório
-- informado no cadastro; avaria_solicitacoes.laboratorio continua
-- existindo e representa o laboratório efetivamente usado numa tentativa
-- específica (pode divergir do laboratório original, ex.: reenviada pra
-- outro laboratório numa nova tentativa após negativa).
--
-- Nullable e sem default: cadastros já existentes (nenhum em produção
-- ainda) ficam sem valor até serem editados, mesmo cuidado já usado em
-- funcionarios.estado_filial (20260821000020).
alter table public.avarias add column laboratorio text;

comment on column public.avarias.laboratorio is 'Laboratório informado no cadastro da avaria. Distinto de avaria_solicitacoes.laboratorio, que é o laboratório efetivamente usado em cada tentativa de solicitação — os dois podem divergir.';

create index avarias_laboratorio_idx on public.avarias(laboratorio);
