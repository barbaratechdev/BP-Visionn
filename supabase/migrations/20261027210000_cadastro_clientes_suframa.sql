-- Cadastro de Clientes — SUFRAMA (27/10/2026).
--
-- Novo documento opcional: data de vencimento da SUFRAMA. Usado sobretudo nos cadastros do Pará, mas não é
-- exigido para nenhum cliente, estado ou região.
--   * Vazio = "Não informado" (sem documento ou ainda não informado). Não é pendência e não entra nos
--     indicadores, filtros ou alertas dos alvarás.
--   * Com documento, a equipe informa a data de vencimento.
-- Só ACRESCENTA: a coluna começa vazia em todos os cadastros (nenhum dado existente é alterado) e a tela
-- anterior continua funcionando, porque não envia a coluna. Policies, RLS e permissões NÃO mudam (a coluna
-- segue as permissões da tabela). Alvarás, Sintegra e Serasa ficam como estão.
--
-- Publicação: aplicar esta migration ANTES de publicar a tela nova (a tela nova envia suframa_vencimento).
-- Reversão: docs/rollback-cadastro-clientes-suframa.md.

-- 1) Coluna nova -------------------------------------------------------------------------------------
alter table public.clientes_cadastro add column suframa_vencimento date;

comment on column public.clientes_cadastro.suframa_vencimento is 'SUFRAMA: data de vencimento do documento. Opcional para todos os clientes; vazio = não informado (não é pendência).';

-- 2) Histórico: SUFRAMA entra na lista de campos acompanhados, como documento -----------------------
-- Igual à função da etapa A das melhorias (20261023000000), mais suframa_vencimento.
create or replace function public.clientes_cadastro_registrar_historico()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text;
  v_novo jsonb := to_jsonb(new);
  v_velho jsonb;
  v_campo text;
  v_tipo text;
  v_anterior text;
  v_atual text;
  c_campos constant text[] := array[
    'razao_social', 'codigo_razao_social', 'cnpj', 'grupo', 'televendas', 'responsavel_nome', 'telefone',
    'email', 'origem_cadastro', 'representante_tipo', 'representante_id', 'representante_externo_nome',
    'representante_codigo', 'supervisor_id', 'data_inclusao_target', 'observacoes', 'situacao',
    'doc_contrato_social', 'doc_cnpj', 'doc_crf', 'doc_fotos', 'doc_notas', 'doc_controlados',
    'alvara_prefeitura_vencimento', 'alvara_sanitario_vencimento', 'suframa_vencimento',
    'sintegra', 'serasa', 'serasa_valor_pendencias'
  ];
begin
  select coalesce(nullif(btrim(nome_exibicao), ''), name) into v_nome from public.profiles where id = v_uid;

  if tg_op = 'INSERT' then
    insert into public.clientes_cadastro_historico (cadastro_id, tipo, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
    values (new.id, 'INCLUSAO', null, null, new.razao_social, v_uid, v_nome);
    return null;
  end if;

  v_velho := to_jsonb(old);
  foreach v_campo in array c_campos loop
    v_anterior := v_velho->>v_campo;
    v_atual := v_novo->>v_campo;
    if v_anterior is distinct from v_atual then
      -- Representante/supervisor: o histórico mostra o nome, não o id.
      if v_campo = 'representante_id' then
        v_campo := 'representante'; v_anterior := old.representante_nome; v_atual := new.representante_nome;
      elsif v_campo = 'supervisor_id' then
        v_campo := 'supervisor'; v_anterior := old.supervisor_nome; v_atual := new.supervisor_nome;
      end if;
      v_tipo := case
        when v_campo = 'situacao' then 'SITUACAO'
        when v_campo like 'doc\_%' or v_campo like 'alvara\_%'
             or v_campo in ('suframa_vencimento', 'sintegra', 'serasa', 'serasa_valor_pendencias') then 'DOCUMENTO'
        else 'ALTERACAO' end;
      insert into public.clientes_cadastro_historico (cadastro_id, tipo, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
      values (new.id, v_tipo, v_campo, v_anterior, v_atual, v_uid, v_nome);
    end if;
  end loop;

  if old.excluido_em is null and new.excluido_em is not null then
    insert into public.clientes_cadastro_historico (cadastro_id, tipo, usuario_id, usuario_nome)
    values (new.id, 'EXCLUSAO', v_uid, v_nome);
  elsif old.excluido_em is not null and new.excluido_em is null then
    insert into public.clientes_cadastro_historico (cadastro_id, tipo, usuario_id, usuario_nome)
    values (new.id, 'RESTAURACAO', v_uid, v_nome);
  end if;
  return null;
end;
$$;
revoke all on function public.clientes_cadastro_registrar_historico() from public, anon, authenticated;
