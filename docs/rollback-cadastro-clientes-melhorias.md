# Reversão — melhorias do Cadastro de Clientes (23/10/2026)

Migrations: `20261023000000_cadastro_clientes_melhorias.sql` (etapa A) e
`20261023000100_cadastro_clientes_melhorias_regras.sql` (etapa B).

Os dois blocos abaixo foram testados num banco local com a estrutura da produção: aplicar A e B,
reverter B e depois A devolve exatamente o estado anterior (colunas, regras, funções, comentários,
policies, gatilhos e permissões).

## Ordem

1. **Tela:** se a tela nova já estiver publicada, voltar antes o deploy da Vercel para a versão
   anterior (a tela nova grava colunas que deixam de existir na reversão da etapa A).
2. **Etapa B:** rodar o bloco "Reverter a etapa B". Ele só devolve as regras da etapa A, sem
   apagar nada, e pode ser usado sozinho se o problema for só uma obrigatoriedade.
3. **Etapa A:** rodar o bloco "Reverter a etapa A" **só se for preciso desfazer tudo**.
   - **Apaga as colunas novas e o que foi digitado nelas:** origem, representante de outra
     empresa e valor do Serasa. O histórico já gravado fica.
   - **Pré-condição:** nenhum cadastro com Sintegra "Habilitado com restrição". O bloco confere
     isso e para com uma mensagem, sem converter nada.
4. **Histórico de migrations:** remover os registros das versões revertidas.
   - **Antes de remover, consultar a versão real registrada.** Não presumir que ela é igual ao
     número do nome do arquivo: quando a migration é aplicada pelo conector do Supabase, a versão
     gravada é a data e hora da aplicação (já aconteceu com a Ariana, a correção da Ana e o
     Cadastro). Consulta:

     ```sql
     select version, name
     from supabase_migrations.schema_migrations
     where name in ('cadastro_clientes_melhorias', 'cadastro_clientes_melhorias_regras')
     order by version;
     ```

   - Conferir que cada linha devolvida é mesmo a da etapa revertida (o `name` da etapa A é
     `cadastro_clientes_melhorias`; o da etapa B, `cadastro_clientes_melhorias_regras`).
   - Remover só pela versão encontrada na consulta, uma de cada vez, e só a da etapa que foi
     revertida (se só a B foi revertida, a A continua registrada):

     ```sql
     delete from supabase_migrations.schema_migrations
     where version = '<versão encontrada na consulta>';
     ```

Rodar cada bloco numa transação (`begin; ... commit;`), com autorização.

## Reverter a etapa B

```sql
-- Reversão da ETAPA B (20261023000100): volta às funções da etapa A.
-- Gerado a partir das migrations do repositório; ver docs/rollback-cadastro-clientes-melhorias.md.

create or replace function public.clientes_cadastro_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text;
begin
  if v_uid is null then
    raise exception 'Faça login para gravar cadastros de clientes.' using errcode = '42501';
  end if;
  select coalesce(nullif(btrim(nome_exibicao), ''), name) into v_nome from public.profiles where id = v_uid;

  new.razao_social := btrim(new.razao_social);
  new.codigo_razao_social := nullif(btrim(new.codigo_razao_social), '');
  new.cnpj := nullif(regexp_replace(coalesce(new.cnpj, ''), '[^0-9]', '', 'g'), '');
  new.grupo := nullif(btrim(new.grupo), '');
  new.televendas := nullif(btrim(new.televendas), '');
  new.responsavel_nome := nullif(btrim(new.responsavel_nome), '');
  new.telefone := nullif(btrim(new.telefone), '');
  new.email := nullif(btrim(new.email), '');
  new.observacoes := nullif(btrim(new.observacoes), '');
  -- Código: digitado pela equipe interna (não é mais copiado do representante).
  new.representante_codigo := nullif(btrim(new.representante_codigo), '');
  new.representante_tipo := coalesce(new.representante_tipo, 'INTERNO');
  new.representante_externo_nome := nullif(btrim(new.representante_externo_nome), '');

  -- Representante: da lista oficial (nome copiado da tabela) ou de outra empresa (só o nome digitado).
  if new.representante_tipo = 'EXTERNO' then
    new.representante_id := null;
    new.representante_nome := null;
  else
    new.representante_externo_nome := null;
    if new.representante_id is null then
      new.representante_nome := null;
    elsif tg_op = 'INSERT' or new.representante_id is distinct from old.representante_id then
      select r.nome into new.representante_nome from public.representantes r where r.id = new.representante_id;
    else
      new.representante_nome := old.representante_nome;
    end if;
  end if;
  if new.supervisor_id is null then
    new.supervisor_nome := null;
  elsif tg_op = 'INSERT' or new.supervisor_id is distinct from old.supervisor_id then
    select s.nome into new.supervisor_nome from public.supervisores s where s.id = new.supervisor_id;
  else
    new.supervisor_nome := old.supervisor_nome;
  end if;

  -- Serasa: o valor total só existe com pendências.
  if new.serasa is distinct from 'COM_PENDENCIAS' then
    new.serasa_valor_pendencias := null;
  end if;

  if tg_op = 'INSERT' then
    new.situacao := 'PENDENTE';
    new.created_by := v_uid;
    new.created_by_nome := v_nome;
    new.created_at := now();
    new.excluido_em := null;
    new.excluido_por := null;
    new.excluido_por_nome := null;
  else
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_by_nome := old.created_by_nome;
    new.created_at := old.created_at;
    -- Exclusão/restauração lógica: só quem administra o módulo (Bárbara).
    if (new.excluido_em is null) is distinct from (old.excluido_em is null) then
      if not public.cadastro_clientes_pode_administrar() then
        raise exception 'Somente a administração pode excluir ou restaurar cadastros.' using errcode = '42501';
      end if;
      if new.excluido_em is not null then
        new.excluido_em := now();
        new.excluido_por := v_uid;
        new.excluido_por_nome := v_nome;
      else
        new.excluido_por := null;
        new.excluido_por_nome := null;
      end if;
    else
      new.excluido_em := old.excluido_em;
      new.excluido_por := old.excluido_por;
      new.excluido_por_nome := old.excluido_por_nome;
    end if;
  end if;
  new.updated_by := v_uid;
  new.updated_by_nome := v_nome;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.cadastro_clientes_opcoes()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.cadastro_clientes_pode_ver() then
    raise exception 'Você não tem acesso ao Cadastro de Clientes.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'representantes', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'nome', r.nome, 'codigo', r.numero_core,
                                          'supervisor_id', r.supervisor_cadastro_id, 'status', r.status)
                       order by (r.status = 'Ativo') desc, r.nome)
      from public.representantes r), '[]'::jsonb),
    'supervisores', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'status', s.status)
                       order by (s.status = 'Ativo') desc, s.nome)
      from public.supervisores s), '[]'::jsonb)
  );
end;
$$;
```

## Reverter a etapa A

```sql
-- Reversão da ETAPA A (20261023000000): volta ao estado de 22/10/2026. Rodar DEPOIS da reversão da etapa B.
-- Gerado a partir das migrations do repositório; ver docs/rollback-cadastro-clientes-melhorias.md.

-- ATENÇÃO: apaga as colunas novas e o que tiver sido digitado nelas (origem, representante de outra empresa,
-- valor do Serasa). O histórico já gravado é preservado. Pré-condição: nenhum cadastro com
-- sintegra = HABILITADO_COM_RESTRICAO (a consulta abaixo precisa voltar 0; não há conversão automática).
do $chk$ begin
  if exists (select 1 from public.clientes_cadastro where sintegra = 'HABILITADO_COM_RESTRICAO') then
    raise exception 'Há cadastros com Sintegra "Habilitado com restrição": ajuste-os antes de reverter.';
  end if;
end $chk$;

create or replace function public.clientes_cadastro_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text;
begin
  if v_uid is null then
    raise exception 'Faça login para gravar cadastros de clientes.' using errcode = '42501';
  end if;
  select coalesce(nullif(btrim(nome_exibicao), ''), name) into v_nome from public.profiles where id = v_uid;

  new.razao_social := btrim(new.razao_social);
  new.codigo_razao_social := nullif(btrim(new.codigo_razao_social), '');
  new.cnpj := nullif(regexp_replace(coalesce(new.cnpj, ''), '[^0-9]', '', 'g'), '');
  new.grupo := nullif(btrim(new.grupo), '');
  new.televendas := nullif(btrim(new.televendas), '');
  new.responsavel_nome := nullif(btrim(new.responsavel_nome), '');
  new.telefone := nullif(btrim(new.telefone), '');
  new.email := nullif(btrim(new.email), '');
  new.observacoes := nullif(btrim(new.observacoes), '');

  -- Representante e supervisor: nome e código sempre lidos das tabelas de origem (cópia do momento).
  if new.representante_id is null then
    new.representante_nome := null;
    new.representante_codigo := null;
  elsif tg_op = 'INSERT' or new.representante_id is distinct from old.representante_id then
    select r.nome, r.numero_core into new.representante_nome, new.representante_codigo
      from public.representantes r where r.id = new.representante_id;
  else
    new.representante_nome := old.representante_nome;
    new.representante_codigo := old.representante_codigo;
  end if;
  if new.supervisor_id is null then
    new.supervisor_nome := null;
  elsif tg_op = 'INSERT' or new.supervisor_id is distinct from old.supervisor_id then
    select s.nome into new.supervisor_nome from public.supervisores s where s.id = new.supervisor_id;
  else
    new.supervisor_nome := old.supervisor_nome;
  end if;

  if tg_op = 'INSERT' then
    new.situacao := 'PENDENTE';
    new.created_by := v_uid;
    new.created_by_nome := v_nome;
    new.created_at := now();
    new.excluido_em := null;
    new.excluido_por := null;
    new.excluido_por_nome := null;
  else
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_by_nome := old.created_by_nome;
    new.created_at := old.created_at;
    -- Exclusão/restauração lógica: só quem administra o módulo (Bárbara).
    if (new.excluido_em is null) is distinct from (old.excluido_em is null) then
      if not public.cadastro_clientes_pode_administrar() then
        raise exception 'Somente a administração pode excluir ou restaurar cadastros.' using errcode = '42501';
      end if;
      if new.excluido_em is not null then
        new.excluido_em := now();
        new.excluido_por := v_uid;
        new.excluido_por_nome := v_nome;
      else
        new.excluido_por := null;
        new.excluido_por_nome := null;
      end if;
    else
      new.excluido_em := old.excluido_em;
      new.excluido_por := old.excluido_por;
      new.excluido_por_nome := old.excluido_por_nome;
    end if;
  end if;
  new.updated_by := v_uid;
  new.updated_by_nome := v_nome;
  new.updated_at := now();
  return new;
end;
$$;

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
    'email', 'representante_id', 'supervisor_id', 'data_inclusao_target', 'observacoes', 'situacao',
    'doc_contrato_social', 'doc_cnpj', 'doc_crf', 'doc_fotos', 'doc_notas', 'doc_controlados',
    'alvara_prefeitura_vencimento', 'alvara_sanitario_vencimento', 'sintegra', 'serasa'
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
        when v_campo like 'doc\_%' or v_campo like 'alvara\_%' or v_campo in ('sintegra', 'serasa') then 'DOCUMENTO'
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

alter table public.clientes_cadastro drop constraint clientes_cadastro_representante_tipo_coerente;
alter table public.clientes_cadastro drop constraint clientes_cadastro_sintegra_check;
alter table public.clientes_cadastro add constraint clientes_cadastro_sintegra_check check (sintegra in ('HABILITADO', 'NAO_HABILITADO'));
alter table public.clientes_cadastro
  drop column origem_cadastro,
  drop column representante_tipo,
  drop column representante_externo_nome,
  drop column serasa_valor_pendencias;
comment on column public.clientes_cadastro.representante_codigo is null;
comment on column public.clientes_cadastro.sintegra is 'Alerta (não é documento faltante). Vazio = não verificado.';
comment on column public.clientes_cadastro.doc_controlados is 'OK ou NAO_CADASTRADO; vazio = não informado. Nunca conta como documento pendente.';
```
