-- "Estado" em pendencias guardava o status da negociação com o fornecedor
-- (Aguardando retorno/Em negociação/Aprovado/Recusado) — nome confuso, já
-- que o resto do app usa "estado" no sentido geográfico (região do
-- representante). Renomeia a coluna existente para "situacao" (mesmo
-- significado, dado preservado) e libera "estado" pra guardar de fato a
-- unidade federativa onde a NF está: Pará, Piauí ou Maranhão.

alter table public.pendencias rename column estado to situacao;
alter index pendencias_estado_idx rename to pendencias_situacao_idx;
alter table public.pendencias rename constraint pendencias_estado_check to pendencias_situacao_check;

alter table public.pendencias add column estado text not null default 'Pará'
  check (estado in ('Pará','Piauí','Maranhão'));

comment on column public.pendencias.estado is 'Unidade federativa da NF: Pará, Piauí ou Maranhão.';
comment on column public.pendencias.situacao is 'Status da negociação com o fornecedor: Aguardando retorno, Em negociação, Aprovado ou Recusado.';

create index pendencias_estado_idx on public.pendencias(estado);