-- Nome de exibição: versão curta do nome, mostrada no lugar de
-- profiles.name (nome completo/oficial, nunca alterado por essa coluna)
-- na interface e em relatórios/documentos — pensada pra evitar que um
-- nome comprido comprima colunas de relatório impresso. Hoje só a
-- Supervisora consegue alterar (a própria, e qualquer uma, já que ela já
-- podia editar nome/setor de qualquer perfil).
alter table public.profiles add column nome_exibicao text;

comment on column public.profiles.nome_exibicao is 'Nome curto exibido no sistema e em relatórios no lugar de "name" quando preenchido. Nunca substitui o nome completo/oficial. Só a Supervisora pode alterar (mesmo gatilho que já protege role/setor).';

-- Reaproveita o gatilho que já bloqueava troca de role/setor por quem não
-- é admin (20260729012946) — nome_exibicao é administrativo pelo mesmo
-- motivo, então entra na mesma checagem em vez de criar um gatilho novo.
create or replace function public.proteger_profiles_role_setor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Apenas a Supervisora pode alterar o cargo.';
    end if;
    if new.setor is distinct from old.setor then
      raise exception 'Apenas a Supervisora pode alterar o setor.';
    end if;
    if new.nome_exibicao is distinct from old.nome_exibicao then
      raise exception 'Apenas a Supervisora pode alterar o nome de exibição.';
    end if;
  end if;
  return new;
end;
$$;

-- Sem mudança de RLS: profiles_update_self_or_admin (própria linha ou
-- admin) já cobre o UPDATE — o gatilho acima é quem decide QUAL coluna,
-- mesmo padrão de role/setor.
