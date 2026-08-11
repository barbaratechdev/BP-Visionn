-- A policy de insert em conversa_participantes permite que qualquer
-- participante adicione outra pessoa (é assim que a criação de uma
-- conversa nova funciona: self, depois a outra pessoa). Mas nada impedia
-- uma terceira inserção, virando grupo — e o escopo combinado foi
-- explicitamente "só 1-para-1 nesta versão, garantido no banco, não só na
-- interface". Trigger fecha essa lacuna.
create or replace function public.limitar_participantes_conversa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.conversa_participantes where conversa_id = new.conversa_id) >= 2 then
    raise exception 'Esta conversa já tem 2 participantes — grupos não são suportados nesta versão.';
  end if;
  return new;
end;
$$;

create trigger conversa_participantes_limite
  before insert on public.conversa_participantes
  for each row execute function public.limitar_participantes_conversa();
