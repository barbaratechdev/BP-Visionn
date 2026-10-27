-- Prorrogação de Boletos — Motivo (28/10/2026), ETAPA B (aplicar SÓ DEPOIS de publicar a tela nova).
-- Pré-requisito: 20261028000000_pendencias_motivo.sql (etapa A).
--
-- Liga no banco a obrigatoriedade que a tela nova já exige:
--   * inclusão de boleto sem motivo é recusada;
--   * um motivo já informado não pode ser apagado.
-- Boletos antigos sem motivo continuam podendo ser aprovados, recusados, editados e excluídos: a regra
-- olha só a inclusão e a remoção do motivo, nunca exige motivo de quem já existia sem ele.
--
-- Reversão: docs/rollback-boletos-motivo.md.

-- Trava: sem a etapa A, o gatilho seria criado sem erro, mas toda inclusão de boleto falharia depois
-- (a coluna não existiria). Para aqui, antes de alterar qualquer coisa.
do $trava$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'pendencias' and column_name = 'motivo') then
    raise exception 'Etapa A não aplicada: falta a coluna motivo em public.pendencias. Aplique 20261028000000_pendencias_motivo.sql antes desta migration.';
  end if;
end
$trava$;

create or replace function public.pendencias_motivo_obrigatorio()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.motivo is null then
    raise exception 'Selecione o motivo do boleto.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.motivo is not null and new.motivo is null then
    raise exception 'O motivo do boleto não pode ficar em branco.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.pendencias_motivo_obrigatorio() from public, anon, authenticated;

create trigger pendencias_motivo_obrigatorio
  before insert or update on public.pendencias
  for each row execute function public.pendencias_motivo_obrigatorio();
