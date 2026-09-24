-- Checagem de possível duplicidade: antes de uma nova solicitação de
-- desconto, verifica se já existe uma avaria com a mesma filial + NF +
-- tipo de avaria + produto (por código, quando informado, senão por nome)
-- que já teve concessão. Não bloqueia nada — só alimenta o alerta
-- não-bloqueante na tela "Nova Avaria"/"Solicitar desconto". security
-- definer + stable, mesmo estilo de supervisores_lista(): centraliza a
-- lógica de join em um lugar só, em vez de repetir a mesma consulta no
-- formulário de cadastro e na tela de solicitação.
create or replace function public.avarias_verificar_duplicidade(
  p_filial text,
  p_numero_nf text,
  p_produto_codigo text,
  p_produto_nome text,
  p_tipo_avaria text
)
returns table (
  avaria_id uuid,
  numero_nf text,
  produto_nome text,
  produto_codigo text,
  tipo_avaria text,
  laboratorio text,
  valor_concedido numeric,
  data_concessao date,
  solicitante_nome text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id, a.numero_nf, a.produto_nome, a.produto_codigo, a.tipo_avaria,
    s.laboratorio, c.valor_concedido, c.data_concessao, s.solicitante_nome
  from public.avarias a
  join public.avaria_solicitacoes s on s.avaria_id = a.id
  join public.avaria_concessoes c on c.solicitacao_id = s.id
  where (public.is_financeiro() or public.is_demo())
    and a.filial = p_filial
    and a.numero_nf = p_numero_nf
    and a.tipo_avaria = p_tipo_avaria
    and (
      (p_produto_codigo is not null and a.produto_codigo = p_produto_codigo)
      or a.produto_nome ilike p_produto_nome
    )
  order by c.data_concessao desc;
$$;

revoke all on function public.avarias_verificar_duplicidade(text, text, text, text, text) from public, anon;
grant execute on function public.avarias_verificar_duplicidade(text, text, text, text, text) to authenticated;
