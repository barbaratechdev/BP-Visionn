-- Estado do cliente no Cadastro de Clientes (Pará, Piauí ou Maranhão).
-- Opcional: cadastros antigos ficam sem estado até serem editados.

alter table public.clientes_cadastro add column estado text;
alter table public.clientes_cadastro add constraint clientes_cadastro_estado_check
  check (estado is null or estado in ('Pará','Piauí','Maranhão'));
comment on column public.clientes_cadastro.estado is 'Estado do cliente: Pará, Piauí ou Maranhão. Opcional (cadastros antigos ficam sem estado até serem editados).';

-- Passa a registrar no histórico as mudanças do campo estado (mesma função, só com mais um campo na lista).
do $$
declare d text; novo text;
begin
  select pg_get_functiondef('public.clientes_cadastro_registrar_historico()'::regprocedure) into d;
  novo := replace(d, '''razao_social'', ''codigo_razao_social''', '''razao_social'', ''estado'', ''codigo_razao_social''');
  if novo = d then raise exception 'ponto de troca nao encontrado na funcao de historico'; end if;
  execute novo;
end $$;
