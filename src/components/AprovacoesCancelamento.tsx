import { useEffect, useState, type CSSProperties } from "react";
import { Search, AlertCircle, CheckCircle, XCircle, Eye, ClipboardCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fBRL, fData, fDataHoraBR } from "../lib/helpers";
import { APROVADOR_CANCELAMENTO_ID, SOLICITACAO_STATUS, mapSolicitacaoRow, mensagemErroCancelamento } from "../lib/cancelamentos";

// Dia (YYYY-MM-DD) em Brasília de um timestamp — pros filtros De/Até.
function diaBR(iso){
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE",{timeZone:"America/Sao_Paulo"});
}

// Aprovações de Cancelamento — só a Barbára (a trava real é no banco:
// decidir_cancelamento_abatimento recusa qualquer outra pessoa). Auto-contido,
// mesmo padrão de Abatimentos.tsx. Aprovar efetiva o cancelamento do
// abatimento no mesmo passo, dentro de uma transação no banco; recusar exige
// motivo e o lançamento continua ativo.
export default function AprovacoesCancelamento(p) {
  const D = p.D, st = p.st, addN = p.addN, user = p.user;
  const onMudou = p.onMudou;
  const autorizada = !!user && user.id===APROVADOR_CANCELAMENTO_ID;

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroGeral, setErroGeral] = useState("");

  const [busca, setBusca] = useState("");
  const [fSolicitante, setFSolicitante] = useState("todos");
  const [fStatus, setFStatus] = useState("todas");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");

  const [detalhe, setDetalhe] = useState(null);
  const [aprovando, setAprovando] = useState(null);
  const [recusando, setRecusando] = useState(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar(){
    const { data, error } = await supabase.from("cancelamento_solicitacoes").select("*").eq("tipo","ABATIMENTO").order("created_at",{ascending:false});
    if(error){ setErroGeral(mensagemErroCancelamento(error,"Não foi possível carregar as solicitações.")); }
    else { setErroGeral(""); setLista((data||[]).map(mapSolicitacaoRow)); }
    setLoading(false);
  }

  useEffect(()=>{
    if(!autorizada) return;
    carregar();
    // Novas solicitações (e decisões feitas em outra aba) aparecem sem recarregar.
    const canal = supabase
      .channel("aprovacoes-cancel-"+user.id)
      .on("postgres_changes", { event:"*", schema:"public", table:"cancelamento_solicitacoes" }, ()=>{ carregar(); })
      .subscribe();
    return ()=>{ supabase.removeChannel(canal); };
  },[user&&user.id]);

  if(!autorizada) return <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Esta área é exclusiva da aprovadora de cancelamentos.</div>;

  const solicitantes = Array.from(new Set(lista.map(s=>s.solicitanteNome).filter(Boolean))).sort();

  function passaFiltros(s){
    if(fSolicitante!=="todos" && s.solicitanteNome!==fSolicitante) return false;
    if(busca){
      const q = busca.toLowerCase();
      if(!(s.nf.toLowerCase().includes(q) || s.laboratorio.toLowerCase().includes(q))) return false;
    }
    const dia = diaBR(s.createdAt);
    if(fDe && dia<fDe) return false;
    if(fAte && dia>fAte) return false;
    return true;
  }

  const filtradas = lista.filter(passaFiltros);
  const pendentes = filtradas.filter(s=>s.status==="PENDENTE").sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const processadas = filtradas.filter(s=>s.status!=="PENDENTE" && (fStatus==="todas" || s.status===fStatus));

  const totalPendentes = lista.filter(s=>s.status==="PENDENTE").length;
  const totalAprovadas = lista.filter(s=>s.status==="APROVADA").length;
  const totalRecusadas = lista.filter(s=>s.status==="RECUSADA").length;

  function corStatus(s){
    return s==="PENDENTE" ? {bg:D.orangeSoft,c:D.orangeText} : s==="APROVADA" ? {bg:D.greenSoft,c:D.greenText} : {bg:D.redSoft,c:D.redText};
  }
  function selo(s){
    const c = corStatus(s);
    return <span style={{fontSize:11,fontWeight:600,background:c.bg,color:c.c,borderRadius:20,padding:"2px 9px",whiteSpace:"nowrap"}}>{SOLICITACAO_STATUS[s]}</span>;
  }

  function fecharModais(){ setAprovando(null); setRecusando(null); setMotivoRecusa(""); setModalErr(""); }

  async function confirmarAprovar(){
    if(!aprovando) return;
    setSalvando(true); setModalErr("");
    const { error } = await supabase.rpc("decidir_cancelamento_abatimento",{p_solicitacao_id:aprovando.id, p_aprovar:true, p_motivo_recusa:null});
    setSalvando(false);
    if(error){ setModalErr(mensagemErroCancelamento(error,"Não foi possível aprovar.")); if(error.code==="23514") carregar(); return; }
    addN("Cancelamento aprovado: boleto "+aprovando.nf+" — "+aprovando.laboratorio);
    fecharModais(); setDetalhe(null);
    await carregar();
    if(onMudou) onMudou();
  }

  async function confirmarRecusar(){
    if(!recusando) return;
    if(motivoRecusa.trim().length<5){ setModalErr("Informe o motivo da recusa (mínimo de 5 caracteres)."); return; }
    setSalvando(true); setModalErr("");
    const { error } = await supabase.rpc("decidir_cancelamento_abatimento",{p_solicitacao_id:recusando.id, p_aprovar:false, p_motivo_recusa:motivoRecusa.trim()});
    setSalvando(false);
    if(error){ setModalErr(mensagemErroCancelamento(error,"Não foi possível recusar.")); if(error.code==="23514") carregar(); return; }
    addN("Cancelamento recusado: boleto "+recusando.nf+" — "+recusando.laboratorio);
    fecharModais(); setDetalhe(null);
    await carregar();
    if(onMudou) onMudou();
  }

  const th = h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>;
  const btnPrim = {padding:"10px",borderRadius:10,border:"none",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,flex:1};
  const btnSec = {flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500};
  const backdrop: CSSProperties = {position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"};
  const card: CSSProperties = {background:D.white,borderRadius:16,padding:"1.6rem",width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"};
  const campo = (rotulo,valor,full=false)=><div style={full?{gridColumn:"1/-1"}:undefined}><div style={{fontSize:11,color:D.muted}}>{rotulo}</div><div style={{fontWeight:600,color:D.text,wordBreak:"break-word"}}>{valor||"—"}</div></div>;
  const acoes = s=>(
    <div style={{display:"flex",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
      <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Detalhes" onClick={()=>setDetalhe(s)}><Eye size={12}/>Detalhes</button>
      {s.status==="PENDENTE"&&<button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} onClick={()=>{setRecusando(s);setMotivoRecusa("");setModalErr("");}}><XCircle size={12}/>Recusar</button>}
      {s.status==="PENDENTE"&&<button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.greenText,borderColor:D.green+"55"}} onClick={()=>{setAprovando(s);setModalErr("");}}><CheckCircle size={12}/>Aprovar</button>}
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:700,color:D.text}}>Aprovações de Cancelamento</div>
        <div style={{fontSize:13,color:D.muted}}>Solicitações de cancelamento de abatimentos feitas pelo Financeiro</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
        <div className="bv-card" style={{...st.card,display:"flex",flexDirection:"column",gap:4,borderLeft:totalPendentes>0?"3px solid "+D.orange:undefined}}>
          <div style={{fontSize:12,color:D.muted}}>Pendentes</div>
          <div style={{fontSize:22,fontWeight:700,color:totalPendentes>0?D.orangeText:D.text}}>{totalPendentes}</div>
        </div>
        <div className="bv-card" style={{...st.card,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:12,color:D.muted}}>Aprovadas</div>
          <div style={{fontSize:22,fontWeight:700,color:D.text}}>{totalAprovadas}</div>
        </div>
        <div className="bv-card" style={{...st.card,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:12,color:D.muted}}>Recusadas</div>
          <div style={{fontSize:22,fontWeight:700,color:D.text}}>{totalRecusadas}</div>
        </div>
      </div>

      {erroGeral&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"8px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{erroGeral}</div>}

      {loading?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando solicitações...</div>
      ):(
      <>
      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 220px"}}>
          <label style={st.lbl}>Busca rápida</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="Fornecedor ou boleto" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
        </div>
        <div style={{flex:"1 1 160px"}}>
          <label style={st.lbl}>Solicitante</label>
          <select style={st.inp} value={fSolicitante} onChange={e=>setFSolicitante(e.target.value)}>
            <option value="todos">Todos</option>
            {solicitantes.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{flex:"1 1 150px"}}>
          <label style={st.lbl}>Histórico: status</label>
          <select style={st.inp} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="RECUSADA">Recusadas</option>
          </select>
        </div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>Solicitado de</label><input type="date" style={st.inp} value={fDe} onChange={e=>setFDe(e.target.value)}/></div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>Até</label><input type="date" style={st.inp} value={fAte} onChange={e=>setFAte(e.target.value)}/></div>
      </div>

      <div className="bv-card" style={st.card}>
        <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:10,display:"flex",alignItems:"center",gap:8}}><ClipboardCheck size={15} color={D.orange}/>Aguardando decisão ({pendentes.length})</div>
        {pendentes.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:D.muted,fontSize:13}}>Nenhuma solicitação pendente.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Solicitante","Fornecedor / Boleto","Valor","Motivo","Solicitado em",""].map(th)}</tr></thead>
            <tbody>{pendentes.map(s=>(
              <tr key={s.id} style={{borderBottom:"1px solid "+D.border}}>
                <td data-label="Solicitante" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{s.solicitanteNome||"—"}</td>
                <td data-label="Fornecedor / Boleto" style={{padding:"10px 8px",color:D.text}}>{s.laboratorio}<div style={{fontSize:11,color:D.muted}}>Boleto {s.nf}</div></td>
                <td data-label="Valor" style={{padding:"10px 8px",color:D.text,whiteSpace:"nowrap"}}>{fBRL(s.valorAbatimento)}</td>
                <td data-label="Motivo" style={{padding:"10px 8px",color:D.muted,maxWidth:260}}>{s.motivo}</td>
                <td data-label="Solicitado em" style={{padding:"10px 8px",color:D.muted,whiteSpace:"nowrap"}}>{fDataHoraBR(s.createdAt)}</td>
                <td style={{padding:"10px 8px"}}>{acoes(s)}</td>
              </tr>
            ))}</tbody>
          </table>
          </div>
        )}
      </div>

      <div className="bv-card" style={st.card}>
        <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:10}}>Histórico de solicitações processadas ({processadas.length})</div>
        {processadas.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:D.muted,fontSize:13}}>Nenhuma solicitação processada.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Solicitante","Fornecedor / Boleto","Valor","Motivo","Solicitado em","Status","Decisão",""].map(th)}</tr></thead>
            <tbody>{processadas.map(s=>(
              <tr key={s.id} style={{borderBottom:"1px solid "+D.border}}>
                <td data-label="Solicitante" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{s.solicitanteNome||"—"}</td>
                <td data-label="Fornecedor / Boleto" style={{padding:"10px 8px",color:D.text}}>{s.laboratorio}<div style={{fontSize:11,color:D.muted}}>Boleto {s.nf}</div></td>
                <td data-label="Valor" style={{padding:"10px 8px",color:D.text,whiteSpace:"nowrap"}}>{fBRL(s.valorAbatimento)}</td>
                <td data-label="Motivo" style={{padding:"10px 8px",color:D.muted,maxWidth:220}}>{s.motivo}</td>
                <td data-label="Solicitado em" style={{padding:"10px 8px",color:D.muted,whiteSpace:"nowrap"}}>{fDataHoraBR(s.createdAt)}</td>
                <td data-label="Status" style={{padding:"10px 8px"}}>{selo(s.status)}</td>
                <td data-label="Decisão" style={{padding:"10px 8px",color:D.muted,maxWidth:240}}>
                  {s.decididoPorNome||"—"}<div style={{fontSize:11}}>{fDataHoraBR(s.decididoEm)}</div>
                  {s.status==="RECUSADA"&&<div style={{fontSize:11,color:D.redText}}>Recusa: {s.motivoRecusa}</div>}
                </td>
                <td style={{padding:"10px 8px"}}>{acoes(s)}</td>
              </tr>
            ))}</tbody>
          </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* MODAL: detalhes */}
      {detalhe&&!aprovando&&!recusando&&(
        <div className="bv-modal-backdrop" style={{...backdrop,zIndex:500}} onClick={()=>setDetalhe(null)}>
          <div className="bv-modal-card" style={{...card,maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:16,color:D.text}}>Solicitação de cancelamento</div>
              {selo(detalhe.status)}
            </div>
            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Lançamento</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",background:D.bg,borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:13}}>
              {campo("Fornecedor (laboratório)",detalhe.laboratorio,true)}
              {campo("Nº do Boleto",detalhe.nf)}
              {campo("Filial",detalhe.filial)}
              {campo("Valor do abatimento",fBRL(detalhe.valorAbatimento))}
              {campo("Valor pago",fBRL(detalhe.valorPago))}
              {campo("Data do lançamento",detalhe.data?fData(detalhe.data):"")}
            </div>
            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Solicitação</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",background:D.bg,borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:13}}>
              {campo("Solicitante",detalhe.solicitanteNome)}
              {campo("Solicitado em",fDataHoraBR(detalhe.createdAt))}
              {campo("Motivo",detalhe.motivo,true)}
            </div>
            {detalhe.status!=="PENDENTE"&&(<>
              <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Decisão</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",background:D.bg,borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:13}}>
                {campo("Decidido por",detalhe.decididoPorNome)}
                {campo("Decidido em",fDataHoraBR(detalhe.decididoEm))}
                {detalhe.status==="RECUSADA"&&campo("Motivo da recusa",detalhe.motivoRecusa,true)}
              </div>
            </>)}
            <div style={{display:"flex",gap:10}}>
              <button style={btnSec} onClick={()=>setDetalhe(null)}>Fechar</button>
              {detalhe.status==="PENDENTE"&&<button style={{...btnPrim,background:D.red}} onClick={()=>{setRecusando(detalhe);setMotivoRecusa("");setModalErr("");}}>Recusar</button>}
              {detalhe.status==="PENDENTE"&&<button style={{...btnPrim,background:D.green}} onClick={()=>{setAprovando(detalhe);setModalErr("");}}>Aprovar</button>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: confirmar aprovação */}
      {aprovando&&(
        <div className="bv-modal-backdrop" style={{...backdrop,zIndex:600}}>
          <div className="bv-modal-card" style={{...card,maxWidth:400,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:44,height:44,borderRadius:12,background:D.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><CheckCircle size={20} color={D.green}/></div>
            <div style={{fontWeight:700,fontSize:15,color:D.text,marginBottom:6}}>Aprovar cancelamento?</div>
            <div style={{fontSize:13,color:D.muted,marginBottom:14}}>Boleto {aprovando.nf} — {aprovando.laboratorio} ({fBRL(aprovando.valorAbatimento)}). O abatimento será cancelado agora, sai dos totais e fica registrado no histórico.</div>
            <div style={{fontSize:12,color:D.text,background:D.bg,borderRadius:8,padding:"8px 10px",marginBottom:14,textAlign:"left"}}><b>Motivo ({aprovando.solicitanteNome}):</b> {aprovando.motivo}</div>
            {modalErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:14,display:"flex",alignItems:"center",gap:6,textAlign:"left"}}><AlertCircle size={13}/>{modalErr}</div>}
            <div style={{display:"flex",gap:10}}>
              <button style={btnSec} onClick={fecharModais}>Voltar</button>
              <button style={{...btnPrim,background:D.green}} onClick={confirmarAprovar} disabled={salvando}>{salvando?"Aprovando...":"Confirmar aprovação"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: recusar (motivo obrigatório) */}
      {recusando&&(
        <div className="bv-modal-backdrop" style={{...backdrop,zIndex:600}}>
          <div className="bv-modal-card" style={{...card,maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div style={{width:44,height:44,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><XCircle size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:15,color:D.text,marginBottom:6,textAlign:"center"}}>Recusar cancelamento</div>
            <div style={{fontSize:13,color:D.muted,marginBottom:14,textAlign:"center"}}>Boleto {recusando.nf} — {recusando.laboratorio}. O abatimento continua ativo e {recusando.solicitanteNome||"o solicitante"} poderá ver sua decisão.</div>
            <label style={st.lbl}>Motivo da recusa *</label>
            <textarea autoFocus style={{...st.inp,minHeight:84,resize:"vertical",fontFamily:"inherit"}} value={motivoRecusa} onChange={e=>{setMotivoRecusa(e.target.value);setModalErr("");}}/>
            {modalErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{modalErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button style={btnSec} onClick={fecharModais}>Voltar</button>
              <button style={{...btnPrim,background:D.red}} onClick={confirmarRecusar} disabled={salvando}>{salvando?"Recusando...":"Confirmar recusa"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
