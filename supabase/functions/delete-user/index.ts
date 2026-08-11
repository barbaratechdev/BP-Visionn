// Exclui permanentemente a conta de um membro da equipe (Supabase Auth +
// profiles, via "on delete cascade").
//
// Por que precisa ser Edge Function (mesmo raciocínio de create-user/index.ts):
// apagar uma conta via Admin API (auth.admin.deleteUser) exige a Service
// Role Key, que ignora todo o RLS. Essa chave nunca pode chegar ao bundle
// do navegador — por isso a exclusão roda aqui, e quem chama é validado
// como Supervisora ANTES de qualquer uso da chave.
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
    // Cliente com o token de quem chamou — confirma que quem está pedindo a
    // exclusão é, de fato, uma Supervisora autenticada. Independe do que a
    // interface esconde: mesmo uma chamada manual à API passa por aqui.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "Não autenticado." }, 401);

    const { data: callerProfile, error: profileErr } = await callerClient
      .from("profiles").select("role").eq("id", caller.id).single();

    if (profileErr || !callerProfile || callerProfile.role !== "admin") {
      return json({ error: "Apenas a Supervisora pode excluir usuários." }, 403);
    }

    const { id } = await req.json();
    if (!id || typeof id !== "string") return json({ error: "Informe o id do usuário." }, 400);

    if (id === caller.id) {
      return json({ error: "Você não pode excluir a própria conta." }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(id);

    if (deleteErr) {
      return json({ error: deleteErr.message || "Não foi possível excluir o usuário." }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
