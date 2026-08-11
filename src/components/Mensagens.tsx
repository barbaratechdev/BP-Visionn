import { useEffect, useRef, useState } from "react";
import { Plus, Send, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import Av from "./Av";

function horaMsg(iso){ return iso ? new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : ""; }
function horaLista(iso){
  if(!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString()===hoje.toDateString();
  return mesmoDia ? horaMsg(iso) : d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
}
function statusLabel(s){ return s==="online"?"Online":s==="away"?"Ausente":"Offline"; }
function porRecencia(a,b){ return new Date(b.ultimaMensagemHora||0).getTime()-new Date(a.ultimaMensagemHora||0).getTime(); }

// Chat interno 1-para-1. Cuida da própria busca/realtime do Supabase (não
// passa pelo useEffect gigante do App.tsx) porque nada mais no app depende
// desses dados. Autorização de verdade é no RLS (esta_na_conversa) — aqui
// só listamos o que o backend já deixou a pessoa ver.
export default function Mensagens(p) {
  const D = p.D, st = p.st, user = p.user;
  const [conversas, setConversas] = useState([]);
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [draft, setDraft] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const conversaAtivaRef = useRef(null);
  const msgsFimRef = useRef(null);

  useEffect(()=>{ conversaAtivaRef.current = conversaAtivaId; },[conversaAtivaId]);

  async function carregarConversas(){
    const { data, error } = await supabase.rpc("minhas_conversas");
    if(error||!data) return;
    const lista = data.map(row=>{
      const outro = p.users.find(u=>u.id===row.outro_usuario_id) || null;
      return {
        conversaId: row.conversa_id,
        outroId: row.outro_usuario_id,
        outro,
        ultimaMensagem: row.ultima_mensagem || "",
        ultimaMensagemHora: row.ultima_mensagem_hora,
        naoLidas: Number(row.nao_lidas) || 0,
      };
    }).sort(porRecencia);
    setConversas(lista);
  }

  async function marcarComoLida(conversaId){
    if(!user) return;
    setConversas(prev=>prev.map(c=>c.conversaId===conversaId?{...c,naoLidas:0}:c));
    await supabase.from("conversa_participantes")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversa_id", conversaId).eq("usuario_id", user.id);
  }

  useEffect(()=>{
    if(!user) return;
    carregarConversas();

    // Um canal só, sem filtro de conversa: RLS decide o que chega (só
    // mensagens de conversas das quais este usuário participa). Roteia pra
    // a conversa aberta (se for o caso) ou só atualiza contador/prévia.
    const canal = supabase
      .channel("mensagens-"+user.id)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"mensagens" }, payload=>{
        const nova = payload.new;
        if(nova.conversa_id===conversaAtivaRef.current){
          setMensagens(prev=>prev.some(m=>m.id===nova.id) ? prev : [...prev, nova]);
          if(nova.remetente_id!==user.id) marcarComoLida(nova.conversa_id);
        }
        setConversas(prev=>{
          if(!prev.some(c=>c.conversaId===nova.conversa_id)){ carregarConversas(); return prev; }
          return prev.map(c=>c.conversaId!==nova.conversa_id ? c : {
            ...c,
            ultimaMensagem: nova.conteudo,
            ultimaMensagemHora: nova.created_at,
            naoLidas: (nova.conversa_id===conversaAtivaRef.current || nova.remetente_id===user.id) ? c.naoLidas : c.naoLidas+1,
          }).sort(porRecencia);
        });
      })
      .subscribe();

    return ()=>{ supabase.removeChannel(canal); };
  },[user&&user.id]);

  useEffect(()=>{
    const total = conversas.reduce((s,c)=>s+c.naoLidas,0);
    if(p.onNaoLidasChange) p.onNaoLidasChange(total);
  },[conversas]);

  useEffect(()=>{
    if(msgsFimRef.current) msgsFimRef.current.scrollIntoView({block:"end"});
  },[mensagens.length, conversaAtivaId]);

  async function abrirConversa(c){
    setConversaAtivaId(c.conversaId);
    setMensagens([]);
    setShowNova(false);
    const { data, error } = await supabase.from("mensagens").select("*").eq("conversa_id", c.conversaId).order("created_at");
    if(!error&&data) setMensagens(data);
    if(c.naoLidas>0) marcarComoLida(c.conversaId);
  }

  async function iniciarConversa(outro){
    setShowNova(false);
    const existente = conversas.find(c=>c.outroId===outro.id);
    if(existente){ abrirConversa(existente); return; }
    // Id gerado no cliente (não pelo "returning" do insert): logo após criar
    // a conversa ainda não existe nenhum participante, então a policy de
    // SELECT (esta_na_conversa) bloquearia a leitura de volta da própria
    // linha recém-criada. Sem ".select()" aqui, só a policy de INSERT
    // (not is_demo()) entra em jogo.
    const novoId = crypto.randomUUID();
    const { error: e1 } = await supabase.from("conversas").insert({ id:novoId });
    if(e1) return;
    const { error: e2 } = await supabase.from("conversa_participantes").insert({ conversa_id:novoId, usuario_id:user.id });
    if(e2) return;
    const { error: e3 } = await supabase.from("conversa_participantes").insert({ conversa_id:novoId, usuario_id:outro.id });
    if(e3) return;
    const nova = { conversaId:novoId, outroId:outro.id, outro, ultimaMensagem:"", ultimaMensagemHora:null, naoLidas:0 };
    setConversas(prev=>[nova,...prev]);
    setConversaAtivaId(nova.conversaId);
    setMensagens([]);
  }

  async function enviar(){
    const texto = draft.trim();
    if(!texto||!conversaAtivaId||enviando) return;
    setEnviando(true);
    const { data, error } = await supabase.from("mensagens").insert({
      conversa_id: conversaAtivaId, remetente_id: user.id, conteudo: texto,
    }).select().single();
    setEnviando(false);
    if(error||!data) return;
    setDraft("");
    setMensagens(prev=>prev.some(m=>m.id===data.id) ? prev : [...prev, data]);
    setConversas(prev=>prev.map(c=>c.conversaId!==conversaAtivaId ? c : {
      ...c, ultimaMensagem: data.conteudo, ultimaMensagemHora: data.created_at,
    }).sort(porRecencia));
  }

  function onKeyDownMsg(e){
    if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); enviar(); }
  }

  const contatos = p.users.filter(u=>u.id!==user.id && u.role!=="demo");
  const conversaAtual = conversas.find(c=>c.conversaId===conversaAtivaId) || null;

  return (
    <div className={"bv-chat"+(conversaAtivaId?" bv-chat-thread-open":"")} style={{display:"flex",height:"72vh",border:"1px solid "+D.border,borderRadius:16,overflow:"hidden",background:D.white}}>
      <div className="bv-chat-lista" style={{width:300,flexShrink:0,borderRight:"1px solid "+D.border,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid "+D.border,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:700,fontSize:15,color:D.text}}>Mensagens</div>
          <button style={{...st.btn,padding:"6px 8px"}} title="Nova conversa" onClick={()=>setShowNova(v=>!v)}><Plus size={15}/></button>
        </div>
        {showNova&&(
          <div style={{borderBottom:"1px solid "+D.border,maxHeight:220,overflowY:"auto"}}>
            {contatos.length===0&&<div style={{padding:"12px 16px",fontSize:12,color:D.muted}}>Nenhum contato disponível.</div>}
            {contatos.map(u=>(
              <div key={u.id} onClick={()=>iniciarConversa(u)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 16px",cursor:"pointer"}}>
                <Av name={u.name} initials={u.initials} color={u.color} photo={u.photo} status={u.status} D={D} ringColor={D.white} size={30}/>
                <div style={{fontSize:13,color:D.text,fontWeight:500}}>{u.name}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{flex:1,overflowY:"auto"}}>
          {conversas.length===0&&!showNova&&<div style={{padding:"20px 16px",fontSize:13,color:D.muted,textAlign:"center"}}>Nenhuma conversa ainda. Toque em + para começar.</div>}
          {conversas.map(c=>(
            <div key={c.conversaId} onClick={()=>abrirConversa(c)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:conversaAtivaId===c.conversaId?D.blueSoft:"transparent",borderBottom:"1px solid "+D.border}}>
              <Av name={c.outro?c.outro.name:"?"} initials={c.outro?c.outro.initials:"?"} color={c.outro?c.outro.color:D.blue} photo={c.outro&&c.outro.photo} status={c.outro&&c.outro.status} D={D} ringColor={D.white} size={38}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                  <div style={{fontSize:13,fontWeight:c.naoLidas>0?700:500,color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.outro?c.outro.name:"Usuário"}</div>
                  {c.ultimaMensagemHora&&<div style={{fontSize:10,color:D.muted,flexShrink:0}}>{horaLista(c.ultimaMensagemHora)}</div>}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                  <div style={{fontSize:12,color:D.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.ultimaMensagem||"Nenhuma mensagem ainda"}</div>
                  {c.naoLidas>0&&<span style={{fontSize:10,fontWeight:700,background:D.blue,color:"#fff",borderRadius:20,padding:"1px 6px",flexShrink:0}}>{c.naoLidas}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bv-chat-thread" style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {!conversaAtivaId?(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:D.muted,fontSize:13}}>Selecione uma conversa para começar</div>
        ):(
          <>
            <div style={{padding:"12px 16px",borderBottom:"1px solid "+D.border,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <button className="bv-chat-voltar" style={{...st.btn,padding:"6px 8px",border:"none",background:D.bg}} onClick={()=>setConversaAtivaId(null)}><ArrowLeft size={16}/></button>
              <Av name={conversaAtual&&conversaAtual.outro?conversaAtual.outro.name:"?"} initials={conversaAtual&&conversaAtual.outro?conversaAtual.outro.initials:"?"} color={conversaAtual&&conversaAtual.outro?conversaAtual.outro.color:D.blue} photo={conversaAtual&&conversaAtual.outro&&conversaAtual.outro.photo} status={conversaAtual&&conversaAtual.outro&&conversaAtual.outro.status} D={D} ringColor={D.white} size={34}/>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:D.text}}>{conversaAtual&&conversaAtual.outro?conversaAtual.outro.name:"Usuário"}</div>
                <div style={{fontSize:11,color:D.muted}}>{statusLabel(conversaAtual&&conversaAtual.outro&&conversaAtual.outro.status)}</div>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {mensagens.map(m=>{
                const minha = m.remetente_id===user.id;
                return (
                  <div key={m.id} style={{alignSelf:minha?"flex-end":"flex-start",maxWidth:"70%",display:"flex",flexDirection:"column",alignItems:minha?"flex-end":"flex-start"}}>
                    <div style={{background:minha?D.blue:D.bg,color:minha?"#fff":D.text,borderRadius:14,padding:"8px 12px",fontSize:13,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.conteudo}</div>
                    <div style={{fontSize:10,color:D.muted,marginTop:3}}>{horaMsg(m.created_at)}</div>
                  </div>
                );
              })}
              <div ref={msgsFimRef}/>
            </div>
            <div style={{padding:"10px 12px",borderTop:"1px solid "+D.border,display:"flex",gap:8,alignItems:"flex-end",flexShrink:0}}>
              <textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={onKeyDownMsg} placeholder="Escreva uma mensagem..." rows={1} style={{...st.inp,resize:"none",maxHeight:100}}/>
              <button style={{...st.btnBlue,padding:"9px 14px"}} onClick={enviar} disabled={!draft.trim()||enviando}><Send size={15}/></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
