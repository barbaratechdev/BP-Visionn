-- Correção do módulo "Acesso ao sistema": registrar_login() só era chamada
-- em doLogin() (App.tsx), isto é, só quando alguém de fato submete o
-- formulário de e-mail/senha com sucesso. Como o cliente Supabase usa
-- persistSession/autoRefreshToken por padrão (createClient sem opções em
-- src/lib/supabase.ts) e o app nunca desliga isso, a sessão sobrevive a
-- fechar a aba, reabrir o navegador etc. — pra quase todo uso do dia a dia,
-- a pessoa nunca volta a digitar a senha, então registrar_login() nunca é
-- chamada de novo. Resultado: "Total de acessos"/"Último acesso" só
-- refletiam a última vez que alguém realmente digitou a senha, não o uso
-- real do sistema — exatamente o sintoma relatado (0 acessos, "Nunca
-- acessou", mesmo entrando todo dia).
--
-- Esta migration não altera a função original (zero parâmetros, chamada em
-- doLogin() a cada login de verdade) nem apaga/zera nada — só adiciona uma
-- SOBRECARGA pra Postgres (duas funções de mesmo nome com assinaturas
-- diferentes coexistem sem problema). O parâmetro é OBRIGATÓRIO (sem
-- default) de propósito: a documentação do Postgres é explícita que um
-- parâmetro com default pode causar "ambiguous function call" numa chamada
-- sem argumentos, já que ela passaria a bater com as duas funções ao mesmo
-- tempo — o que quebraria a chamada zero-argumento já existente em
-- doLogin(). Sem default, só há uma função candidata pra cada aridade:
-- registrar_login() continua resolvendo só pra versão original, e
-- registrar_login('acesso') só pra esta nova — nenhuma ambiguidade possível.
--
-- O frontend passa a chamar esta nova versão (sempre com o argumento
-- explícito) também no boot do app, quando encontra uma sessão já
-- autenticada (supabase.auth.getSession(), uma vez por carregamento real da
-- página — nunca no re-disparo de SIGNED_IN por troca de aba, que já era
-- filtrado antes e continua sendo). Isso cobre exatamente "abri o sistema de
-- novo hoje", sem contar troca de aba/foco como um acesso novo.
create or replace function public.registrar_login(p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
  v_ua text;
begin
  if auth.uid() is null then
    return;
  end if;

  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := nullif(trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  v_ua := v_headers->>'user-agent';

  insert into public.login_history (user_id, ip_address, user_agent, event_type)
  values (auth.uid(), v_ip, v_ua, coalesce(nullif(p_event_type, ''), 'login'));
end;
$$;

revoke all on function public.registrar_login(text) from public, anon;
grant execute on function public.registrar_login(text) to authenticated;
