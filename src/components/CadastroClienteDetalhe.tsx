import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Printer, History, AlertTriangle, AlertCircle, Trash2, RotateCcw, FileText, Users, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fData, fDataHoraBR } from "../lib/helpers";
import {
  situacaoInfo, DOCS_OK_PENDENTE, ALVARAS, statusAlvara, alvaraInfo, documentosPendentes, alertasCliente,
  formatarCnpj, ROTULO_CAMPO, valorLegivel, mensagemErroCliente, ROTULO_NAO_CADASTRADO,
  nomeRepresentante, rotuloOrigem, textoSerasaTotal, SUFRAMA, statusSuframa, suframaInfo,
} from "../lib/cadastroClientes";

const TIPO_HIST = {
  INCLUSAO:"Cadastro incluído", ALTERACAO:"Dado alterado", DOCUMENTO:"Documento atualizado",
  SITUACAO:"Situação alterada", EXCLUSAO:"Cadastro excluído", RESTAURACAO:"Cadastro restaurado",
};

// Detalhe de um cadastro de cliente: dados, documentos, alertas e a linha do tempo gravada pelo banco
// (clientes_cadastro_historico, append-only). Excluir/restaurar só aparece para quem administra o
// módulo; o banco confere de novo (cadastro_clientes_excluir/restaurar).
export default function CadastroClienteDetalhe(p) {
  const D = p.D, st = p.st, c = p.cliente, hoje = p.hoje;
  const [historico, setHistorico] = useState([]);
  const [histErro, setHistErro] = useState("");
  const [confirmar, setConfirmar] = useState(null);   // "excluir" | "restaurar"
  const [acaoErro, setAcaoErro] = useState("");
  const [executando, setExecutando] = useState(false);

  // Recarrega a linha do tempo sempre que o cadastro muda (edição, exclusão ou restauração).
  const cid = c.id, versao = c.updatedAt+"|"+c.excluidoEm;
  useEffect(()=>{
    let ativo = true;
    supabase.from("clientes_cadastro_historico").select("*").eq("cadastro_id", cid).order("created_at",{ascending:false}).order("id",{ascending:false})
      .then(({ data, error })=>{
        if(!ativo) return;
        if(error){ setHistErro(mensagemErroCliente(error)); return; }
        setHistErro(""); setHistorico(data||[]);
      });
    return ()=>{ ativo = false; };
  },[cid, versao]);

  async function executar(){
    setExecutando(true); setAcaoErro("");
    const fn = confirmar==="excluir" ? "cadastro_clientes_excluir" : "cadastro_clientes_restaurar";
    const { error } = await supabase.rpc(fn, { p_id: c.id });
    if(error){ setExecutando(false); setAcaoErro(mensagemErroCliente(error)); return; }
    const { data } = await supabase.from("clientes_cadastro").select("*").eq("id", c.id).single();
    setExecutando(false); setConfirmar(null);
    if(data) p.onAtualizado(data);
    if(p.addA) p.addA(confirmar==="excluir"?"Cadastro de cliente excluído":"Cadastro de cliente restaurado", c.razaoSocial, confirmar==="excluir"?"Exclusão lógica — registro e histórico preservados":"Cadastro restaurado com o histórico preservado");
  }

  const si = situacaoInfo(c.situacao, D);
  const pend = documentosPendentes(c);
  const alertas = alertasCliente(c, hoje);
  const chip = (txt, info) => <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11.5,fontWeight:600,background:info.bg,color:info.c,borderRadius:20,padding:"3px 10px",whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:info.dot}}/>{txt}</span>;
  const okInfo = {bg:D.greenSoft,c:D.greenText,dot:D.green}, pendInfo = {bg:D.redSoft,c:D.redText,dot:D.red}, neutro = {bg:D.bg,c:D.muted,dot:D.muted}, alertaInfo = {bg:D.orangeSoft,c:D.orangeText,dot:D.orange};
  const titulo = (Icon, t) => <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Icon size={13}/>{t}</div>;
  const campo = (rotulo, valor) => <div><div style={{fontSize:11.5,color:D.muted}}>{rotulo}</div><div style={{fontSize:13.5,color:D.text,fontWeight:500,wordBreak:"break-word"}}>{valor||"—"}</div></div>;
  const grade = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14};
  const linhaDoc = (rotulo, conteudo) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+D.border,flexWrap:"wrap"}}><span style={{fontSize:13,color:D.text,fontWeight:500}}>{rotulo}</span>{conteudo}</div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <button onClick={p.onVoltar} style={{...st.btn,padding:"8px 10px"}} title="Voltar"><ArrowLeft size={16}/></button>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:D.text}}>{c.razaoSocial}</div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:4}}>
              {chip(si.label, si)}
              <span style={{fontSize:12.5,color:D.muted}}>{[c.codigoRazaoSocial&&"Cód. "+c.codigoRazaoSocial, c.cnpj&&"CNPJ "+formatarCnpj(c.cnpj)].filter(Boolean).join(" · ")}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button style={st.btn} onClick={p.onImprimir}><Printer size={14}/>Imprimir ficha</button>
          {p.podeEditar&&<button style={st.btnBlue} onClick={p.onEditar}><Pencil size={14}/>Atualizar cadastro</button>}
          {p.podeAdministrar&&!c.excluidoEm&&<button style={{...st.btn,color:D.redText,borderColor:D.red+"55"}} onClick={()=>{setAcaoErro("");setConfirmar("excluir");}}><Trash2 size={14}/>Excluir</button>}
          {p.podeAdministrar&&c.excluidoEm&&<button style={{...st.btn,color:D.greenText,borderColor:D.green+"55"}} onClick={()=>{setAcaoErro("");setConfirmar("restaurar");}}><RotateCcw size={14}/>Restaurar</button>}
        </div>
      </div>

      {c.excluidoEm&&<div style={{fontSize:13,color:D.redText,background:D.redSoft,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}><Trash2 size={14}/>Cadastro excluído em {fDataHoraBR(c.excluidoEm)}{c.excluidoPorNome?" por "+c.excluidoPorNome:""}. O registro e o histórico estão preservados.</div>}

      {alertas.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
          {alertas.map((a,i)=>{ const info = a.tipo==="VENCIDO"?alvaraInfo("VENCIDO",D):alertaInfo;
            return <div key={i} style={{fontSize:13,color:info.c,background:info.bg,borderRadius:10,padding:"9px 14px",display:"flex",alignItems:"center",gap:8}}><AlertTriangle size={14}/>{a.texto}</div>; })}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>
        <div className="bv-card" style={st.card}>
          {titulo(FileText,"Dados do cliente")}
          <div style={grade}>
            {campo("Cliente / Razão social", c.razaoSocial)}
            {campo("Código da razão social", c.codigoRazaoSocial)}
            {campo("CNPJ", c.cnpj?formatarCnpj(c.cnpj):"")}
            {campo("Origem do cadastro", rotuloOrigem(c.origemCadastro)||"Não informado")}
            {campo("Grupo", c.grupo)}
            {campo("Responsável pela farmácia", c.responsavelNome)}
            {campo("Telefone", c.telefone)}
            {campo("E-mail", c.email)}
            {campo("Data de inclusão na TARGET", c.dataInclusaoTarget?fData(c.dataInclusaoTarget):"")}
            {campo("Registrado no BP-Visionn", c.createdAt?fDataHoraBR(c.createdAt)+(c.createdByNome?" — "+c.createdByNome:""):"")}
            {campo("Última atualização", c.updatedAt?fDataHoraBR(c.updatedAt)+(c.updatedByNome?" — "+c.updatedByNome:""):"")}
          </div>
          {c.observacoes&&<div style={{marginTop:14}}>{campo("Observações", c.observacoes)}</div>}
        </div>

        <div className="bv-card" style={st.card}>
          {titulo(Users,"Representação")}
          <div style={grade}>
            {campo("Representante / vendedor", nomeRepresentante(c))}
            {campo("Código", c.representanteCodigo)}
            {campo("Supervisor", c.supervisorNome)}
            {campo("Televendas", c.televendas)}
          </div>
          <div style={{marginTop:18}}>
            {titulo(ShieldCheck,"Documentos pendentes")}
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{pend.length===0?chip("Nenhum documento pendente",okInfo):pend.map(d=><span key={d.campo}>{chip(d.label,pendInfo)}</span>)}</div>
          </div>
        </div>

        <div className="bv-card" style={st.card}>
          {titulo(ShieldCheck,"Situação dos documentos")}
          {DOCS_OK_PENDENTE.map(d=><div key={d.campo}>{linhaDoc(d.label, c[d.campo]==="OK"?chip("OK",okInfo):chip("Pendente",pendInfo))}</div>)}
          {linhaDoc("Controlados", c.docControlados==="OK"?chip("OK",okInfo):c.docControlados==="NAO_CADASTRADO"?chip(ROTULO_NAO_CADASTRADO,neutro):chip("Não informado",pendInfo))}
          {ALVARAS.map(a=>{ const s = statusAlvara(c[a.campo], hoje), info = alvaraInfo(s,D);
            return <div key={a.campo}>{linhaDoc(a.label, <span style={{display:"flex",gap:8,alignItems:"center"}}>{c[a.campo]&&<span style={{fontSize:12.5,color:D.muted}}>vence {fData(c[a.campo])}</span>}{chip(info.label,info)}</span>)}</div>; })}
          {(()=>{ const info = suframaInfo(statusSuframa(c[SUFRAMA.campo], hoje),D);
            return linhaDoc(SUFRAMA.label, <span style={{display:"flex",gap:8,alignItems:"center"}}>{c[SUFRAMA.campo]&&<span style={{fontSize:12.5,color:D.muted}}>vence {fData(c[SUFRAMA.campo])}</span>}{chip(info.label,info)}</span>); })()}
          {linhaDoc("Sintegra", c.sintegra==="HABILITADO"?chip("Habilitado",okInfo):c.sintegra==="NAO_HABILITADO"?chip("Não habilitado",alertaInfo):c.sintegra==="HABILITADO_COM_RESTRICAO"?chip("Habilitado com restrição",pendInfo):chip("Não verificado",pendInfo))}
          {linhaDoc("Serasa", c.serasa==="SEM_PENDENCIAS"?chip("Sem pendências",okInfo):c.serasa==="COM_PENDENCIAS"?chip("Com pendências — "+textoSerasaTotal(c),alertaInfo):chip("Não verificado",alertaInfo))}
        </div>

        <div className="bv-card" style={{...st.card,gridColumn:"1/-1"}}>
          {titulo(History,"Histórico")}
          {histErro?<div style={{fontSize:12.5,color:D.redText}}>{histErro}</div>
          :historico.length===0?<div style={{fontSize:13,color:D.muted}}>Carregando histórico...</div>:(
            <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:460,overflowY:"auto"}}>
              {historico.map(h=>(
                <div key={h.id} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid "+D.border}}>
                  <span style={{width:8,height:8,borderRadius:"50%",marginTop:6,flexShrink:0,background:h.tipo==="EXCLUSAO"?D.red:h.tipo==="RESTAURACAO"||h.tipo==="INCLUSAO"?D.green:h.tipo==="DOCUMENTO"?D.blue:h.tipo==="SITUACAO"?D.purple:D.muted}}/>
                  <div style={{fontSize:12.5,color:D.text,lineHeight:1.5}}>
                    <div style={{fontWeight:600}}>{TIPO_HIST[h.tipo]||h.tipo}{h.campo?": "+(ROTULO_CAMPO[h.campo]||h.campo):""}</div>
                    {h.campo&&<div style={{color:D.muted}}>{valorLegivel(h.campo,h.valor_anterior)} → <span style={{color:D.text,fontWeight:500}}>{valorLegivel(h.campo,h.valor_novo)}</span></div>}
                    <div style={{color:D.muted,fontSize:11.5}}>{h.usuario_nome||"—"} · {fDataHoraBR(h.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmar&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:confirmar==="excluir"?D.redSoft:D.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>{confirmar==="excluir"?<Trash2 size={22} color={D.red}/>:<RotateCcw size={22} color={D.green}/>}</div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:6}}>{confirmar==="excluir"?"Excluir cadastro?":"Restaurar cadastro?"}</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:16}}>{confirmar==="excluir"?"O cadastro sai das listas da equipe, mas nada é apagado: o registro e o histórico ficam preservados e podem ser restaurados.":"O cadastro volta para as listas da equipe com todo o histórico preservado."}</div>
            {acaoErro&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{acaoErro}</div>}
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setConfirmar(null)} disabled={executando}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:confirmar==="excluir"?D.red:D.green,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={executar} disabled={executando}>{executando?"Aguarde...":confirmar==="excluir"?"Excluir":"Restaurar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
