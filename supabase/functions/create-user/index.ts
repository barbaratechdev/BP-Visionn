// Cria uma conta real no Supabase Auth para um novo membro da equipe.
//
// Por que isso precisa ser uma Edge Function (e não uma chamada direta do
// navegador): criar usuários via Admin API (auth.admin.createUser) exige a
// Service Role Key, que ignora todo o RLS. Essa chave NUNCA pode chegar ao
// bundle do frontend — se fosse usada em src/lib/supabase.ts, qualquer
// pessoa com o DevTools aberto poderia ler a chave e criar/apagar/alterar
// qualquer linha de qualquer tabela do projeto. Por isso a criação do
// usuário de Auth acontece aqui (só o servidor tem a Service Role Key) e o
// preenchimento de setor/role em "profiles" é feito depois, pelo próprio
// cliente autenticado como admin (RLS já permite isso normalmente).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Cliente com o token de quem chamou a função — usado só pra confirmar
    // que quem está pedindo a criação é, de fato, uma admin autenticada.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "Não autenticado." }, 401);

    const { data: callerProfile, error: profileErr } = await callerClient
      .from("profiles").select("role").eq("id", caller.id).single();

    if (profileErr || !callerProfile || callerProfile.role !== "admin") {
      return json({ error: "Apenas a Supervisora pode criar usuários." }, 403);
    }

    const { name, email, senha } = await req.json();
    if (!name || !email || !senha) return json({ error: "Preencha nome, e-mail e senha." }, 400);
    if (String(senha).length < 6) return json({ error: "A senha deve ter ao menos 6 caracteres." }, 400);

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createErr || !createdUser?.user) {
      return json({ error: createErr?.message || "Não foi possível criar o usuário." }, 400);
    }

    return json({ id: createdUser.user.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
