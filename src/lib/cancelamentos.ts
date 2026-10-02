import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { fBRL } from "./helpers";

// Barbára Pinon — única aprovadora de cancelamentos. Precisa bater com
// is_aprovador_cancelamento() no banco (20261002000010/20261002000020): a trava de verdade
// é lá; aqui só decide o que a interface mostra.
export const APROVADOR_CANCELAMENTO_ID = "6db64d55-bca1-49d0-b789-dabdbc646463";

export const SOLICITACAO_STATUS = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
};

export function mapSolicitacaoRow(row){
  const s = row.snapshot || {};
  return {
    id: row.id,
    tipo: row.tipo,
    entidadeId: row.entidade_id,
    laboratorio: s.laboratorio || "",
    filial: s.filial || "",
    nf: s.nf || "",
    valorAbatimento: s.valor_abatimento==null ? 0 : Number(s.valor_abatimento),
    valorPago: s.valor_pago==null ? 0 : Number(s.valor_pago),
    data: s.data || "",
    motivo: row.motivo || "",
    status: row.status,
    solicitanteId: row.solicitante_id || "",
    solicitanteNome: row.solicitante_nome || "",
    createdAt: row.created_at || "",
    decididoPor: row.decidido_por || "",
    decididoPorNome: row.decidido_por_nome || "",
    decididoEm: row.decidido_em || "",
    motivoRecusa: row.motivo_recusa || "",
  };
}

// As mensagens das funções do banco já são em português e pensadas pra
// quem usa o sistema — mostra direto nos códigos conhecidos.
export function mensagemErroCancelamento(error, padrao){
  console.error("Erro no fluxo de cancelamento:", error);
  if(error && ["42501","23514","23505","P0002","22023"].includes(error.code) && error.message) return error.message;
  if(error && (error.code==="PGRST202" || error.code==="42P01")) return "O fluxo de aprovação de cancelamentos ainda não está disponível neste ambiente.";
  return padrao + (error&&error.code?" (código "+error.code+")":"");
}

// Avisos do fluxo: contador de pendentes (Barbára) e notificação das
// decisões (quem solicitou). Persistente de verdade — vem do banco, não do
// estado local do sino —, então chega mesmo se a pessoa não estava online na
// hora: ao entrar, carrega o que ficou pendente/decidido; depois escuta o
// Realtime (a RLS de select decide quem recebe cada evento).
export function useCancelamentoAvisos(user, addN){
  const [pendentes, setPendentes] = useState(0);
  const addNRef = useRef(addN);
  useEffect(()=>{ addNRef.current = addN; });

  const refresh = useCallback(async ()=>{
    if(!user || user.id!==APROVADOR_CANCELAMENTO_ID) return;
    const { count, error } = await supabase.from("cancelamento_solicitacoes").select("id",{count:"exact",head:true}).eq("status","PENDENTE");
    if(!error) setPendentes(count||0);
  },[user&&user.id]);

  useEffect(()=>{
    if(!user || user.role==="demo") return;
    const ehAprovador = user.id===APROVADOR_CANCELAMENTO_ID;
    const chaveVisto = "bv_cancel_visto_"+user.id;
    let cancelado = false;

    async function carregarInicial(){
      if(ehAprovador){
        const { count, error } = await supabase.from("cancelamento_solicitacoes").select("id",{count:"exact",head:true}).eq("status","PENDENTE");
        if(error || cancelado) return;
        setPendentes(count||0);
        if(count) addNRef.current(count+" solicitação"+(count===1?"":"ões")+" de cancelamento aguardando sua aprovação");
        return;
      }
      // Solicitante: avisa das decisões que aconteceram desde a última vez.
      let desde = "";
      try { desde = localStorage.getItem(chaveVisto) || ""; } catch { /* sem storage: só não lembra */ }
      const agora = new Date().toISOString();
      try { localStorage.setItem(chaveVisto, agora); } catch { /* idem */ }
      if(!desde) return;
      const { data, error } = await supabase.from("cancelamento_solicitacoes").select("*")
        .eq("solicitante_id", user.id).neq("status","PENDENTE").gt("decidido_em", desde).order("decidido_em",{ascending:true});
      if(error || cancelado || !data) return;
      data.map(mapSolicitacaoRow).forEach(s=>addNRef.current(textoDecisao(s)));
    }
    carregarInicial();

    const canal = supabase
      .channel("cancelamentos-"+user.id)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"cancelamento_solicitacoes" }, payload=>{
        if(!ehAprovador) return;
        const s = mapSolicitacaoRow(payload.new);
        addNRef.current("Nova solicitação de cancelamento: boleto "+s.nf+" — "+s.laboratorio+" ("+s.solicitanteNome+")");
        refresh();
      })
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"cancelamento_solicitacoes" }, payload=>{
        const s = mapSolicitacaoRow(payload.new);
        if(ehAprovador){ refresh(); return; }
        if(s.solicitanteId===user.id && s.status!=="PENDENTE") addNRef.current(textoDecisao(s));
      })
      .subscribe();

    return ()=>{ cancelado = true; supabase.removeChannel(canal); };
  },[user&&user.id]);

  return { pendentes, refresh };
}

function textoDecisao(s){
  const ref = "Boleto "+s.nf+" — "+s.laboratorio+" ("+fBRL(s.valorAbatimento)+")";
  return s.status==="APROVADA"
    ? "Cancelamento aprovado: "+ref
    : "Cancelamento recusado: "+ref+(s.motivoRecusa?" — "+s.motivoRecusa:"");
}
