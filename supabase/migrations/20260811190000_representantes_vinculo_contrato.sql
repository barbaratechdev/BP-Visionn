-- Tipo de vínculo do representante (Temporário/Fixo/Recibo) e status do
-- contrato (Aguardando assinatura/Concluído) — conceitos novos, distintos
-- do que já existe:
--   - representantes.status (Ativo/Inativo) é sobre a PESSOA estar na
--     empresa, não sobre o contrato dela.
--   - contratos.tipo (supervisor/vendedor/recibo) é o MODELO do documento
--     gerado pra impressão/PDF, não o vínculo comercial atual do vendedor.
--   - contratos.status (ativo/encerrado) é sobre o contrato de comissão em
--     si, não sobre o processo de assinatura do vínculo.
--
-- Os campos abaixo guardam sempre o vínculo ATUAL (rápido de listar/filtrar
-- na tela de Representantes). Ao trocar de tipo_vinculo (ex.: Temporário
-- vira Fixo), o trigger no fim deste arquivo arquiva o período anterior em
-- representante_vinculos_historico antes de sobrescrever — nada se perde.
alter table public.representantes
  add column numero_core text,
  add column tipo_vinculo text check (tipo_vinculo in ('temporario','fixo','recibo')),
  add column vinculo_data_inicio date,
  add column vinculo_data_termino_previsto date
    generated always as (
      case when tipo_vinculo = 'temporario' and vinculo_data_inicio is not null
        then vinculo_data_inicio + 90
        else null
      end
    ) stored,
  add column status_contrato text check (status_contrato in ('aguardando_assinatura','concluido')),
  add column contrato_data_envio date,
  add column contrato_data_conclusao date;

comment on column public.representantes.numero_core is 'Número de registro no CORE — atributo da pessoa, não muda por contrato.';
comment on column public.representantes.tipo_vinculo is 'Vínculo comercial ATUAL do representante. Histórico de vínculos anteriores fica em representante_vinculos_historico.';
comment on column public.representantes.vinculo_data_termino_previsto is 'Calculado (90 dias corridos a partir de vinculo_data_inicio), só quando tipo_vinculo=temporario.';
comment on column public.representantes.status_contrato is 'Status da assinatura do vínculo ATUAL — reinicia a cada troca de tipo_vinculo.';

-- representante_vinculos_historico: snapshot de cada período de vínculo já
-- encerrado (mesma razão de existir de tarefas_historico: substituir um
-- campo que seria sobrescrito por uma tabela filha append-only).
create table public.representante_vinculos_historico (
  id uuid primary key default gen_random_uuid(),
  representante_id uuid not null references public.representantes(id) on delete cascade,
  tipo_vinculo text not null check (tipo_vinculo in ('temporario','fixo','recibo')),
  vinculo_data_inicio date,
  vinculo_data_termino_previsto date,
  status_contrato text check (status_contrato in ('aguardando_assinatura','concluido')),
  contrato_data_envio date,
  contrato_data_conclusao date,
  encerrado_em timestamptz not null default now(),
  registrado_por uuid references public.profiles(id) on delete set null
);

comment on table public.representante_vinculos_historico is 'Snapshot de cada período de vínculo (Temporário/Fixo/Recibo) já substituído por outro — gravado automaticamente pelo trigger, nunca pelo cliente.';

create index representante_vinculos_historico_rep_idx on public.representante_vinculos_historico(representante_id);

alter table public.representante_vinculos_historico enable row level security;

create policy "representante_vinculos_historico_select"
  on public.representante_vinculos_historico for select
  to authenticated
  using (public.is_financeiro() or public.is_demo());

-- Sem policy de insert/update/delete: só o trigger (security definer)
-- grava aqui, o mesmo espírito de "profiles são criados só pelo trigger".

create or replace function public.arquivar_vinculo_anterior()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.tipo_vinculo is not null and old.tipo_vinculo is distinct from new.tipo_vinculo then
    insert into public.representante_vinculos_historico (
      representante_id, tipo_vinculo, vinculo_data_inicio, vinculo_data_termino_previsto,
      status_contrato, contrato_data_envio, contrato_data_conclusao, registrado_por
    ) values (
      old.id, old.tipo_vinculo, old.vinculo_data_inicio, old.vinculo_data_termino_previsto,
      old.status_contrato, old.contrato_data_envio, old.contrato_data_conclusao, auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger representantes_arquivar_vinculo
  before update on public.representantes
  for each row execute function public.arquivar_vinculo_anterior();
