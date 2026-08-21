import { useEffect, useState } from "react";
import { Plus, Search, X, Pencil, History, Save, AlertCircle, CalendarClock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fData, mapFeriasRow } from "../lib/helpers";
import Av from "./Av";

const FORM_VAZIO = {id:null,funcionarioId:"",periodoAquisitivoInicio:"",periodoAquisitivoFim:"",dataInicio:"",dataFim:"",status:"Pendente",observacoes:""};

// Soma 1 ano (menos 1 dia) a uma data "YYYY-MM-DD" — só serve pra sugerir o
// fim do período aquisitivo quando a Supervisora/RH escolhe o início; o
// valor final salvo é sempre o que estiver no campo, não recalculado.
function sugerirFimPeriodo(inicioStr){
  if(!inicioStr) return "";
  const d = new Date(inicioStr+"T00:00:00");
  d.setFullYear(d.getFullYear()+1);
  d.setDate(d.getDate()-1);
  return d.toISOString().split("T")[0];
}

// Prévia de "dias" só pra exibir no formulário enquanto a Supervisora/RH
// ainda está preenchendo — o valor de verdade é sempre dias_corridos,
// calculado pelo Postgres (coluna gerada); isso aqui nunca é enviado.
function calcularDiasPreview(inicio,fim){
  if(!inicio||!fim||fim<inicio) return null;
  const d1 = new Date(inicio+"T00:00:00");
  const d2 = new Date(fim+"T00:00:00");
  return Math.round((d2.getTime()-d1.getTime())/86400000)+1;
}

const STATUS_OPCOES = ["Pendente","Programada","Em férias","Concluída"];
function statusCor(s,D){
  return ({
    "Pendente": {bg:D.orangeSoft,c:D.orangeText},
    "Programada": {bg:D.blueSoft,c:D.blueText},
    "Em férias": {bg:D.purpleSoft,c:D.purpleText},
    "Concluída": {bg:D.greenSoft,c:D.greenText},
  })[s] || {bg:D.bg,c:D.muted};
}

// Sub-aba "Férias" dentro de RH — controle de períodos de férias por
// funcionário, ligado ao cadastro de funcionarios (RH.tsx) via
// funcionario_id, nunca a profiles: o mesmo funcionário pode não ter
// conta de login, e o RH controla férias de todo o quadro (ver
// 20260821000010_create_ferias.sql). A lista de funcionários vem por
// prop (já carregada pelo componente pai, RH.tsx) pra não duplicar a
// busca. RLS restringe leitura/escrita a quem é RH/admin (is_rh(), mesma
// função já usada em funcionarios) — esta tela só é alcançável por quem
// já está dentro da aba RH (ver App.tsx), então nenhuma checagem de
// permissão adicional é feita aqui client-side.
export default function Ferias(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN, funcionarios = p.funcionarios || [];
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [historicoDe, setHistoricoDe] = useState(null);

  async function carregar(){
    setLoading(true);
    const { data, error } = await supabase.from("ferias").select("*, funcionarios(nome, setor)").order("periodo_aquisitivo_inicio",{ascending:false});
    if(!error&&data) setLista(data.map(mapFeriasRow));
    setLoading(false);
  }

  useEffect(()=>{ carregar(); },[]);

  function abrirNovo(funcionarioId?:string){
    setForm({...FORM_VAZIO, funcionarioId: funcionarioId||""});
    setFormErr(""); setShowForm(true);
  }

  function abrirEditar(f){
    setForm({id:f.id,funcionarioId:f.funcionarioId,periodoAquisitivoInicio:f.periodoAquisitivoInicio,periodoAquisitivoFim:f.periodoAquisitivoFim,dataInicio:f.dataInicio,dataFim:f.dataFim,status:f.status,observacoes:f.observacoes});
    setFormErr(""); setShowForm(true);
  }

  function fecharForm(){ setShowForm(false); setFormErr(""); }

  async function salvar(){
    if(!form.funcionarioId){ setFormErr("Selecione o funcionário."); return; }
    if(!form.periodoAquisitivoInicio||!form.periodoAquisitivoFim){ setFormErr("Informe o período aquisitivo."); return; }
    if(form.periodoAquisitivoFim<form.periodoAquisitivoInicio){ setFormErr("O fim do período aquisitivo não pode ser antes do início."); return; }
    if(form.status!=="Pendente"&&(!form.dataInicio||!form.dataFim)){ setFormErr("Informe a data de início e término das férias."); return; }
    if(form.dataInicio&&form.dataFim&&form.dataFim<form.dataInicio){ setFormErr("A data de término não pode ser antes da data de início."); return; }
    setSalvando(true); setFormErr("");
    const payload = {
      funcionario_id: form.funcionarioId,
      periodo_aquisitivo_inicio: form.periodoAquisitivoInicio,
      periodo_aquisitivo_fim: form.periodoAquisitivoFim,
      data_inicio: form.status==="Pendente" ? null : (form.dataInicio||null),
      data_fim: form.status==="Pendente" ? null : (form.dataFim||null),
      status: form.status,
      observacoes: form.observacoes||null,
    };
    const query = form.id
      ? supabase.from("ferias").update(payload).eq("id",form.id).select("*, funcionarios(nome, setor)").single()
      : supabase.from("ferias").insert(payload).select("*, funcionarios(nome, setor)").single();
    const { data, error } = await query;
    setSalvando(false);
    if(error||!data){ setFormErr("Não foi possível salvar. Verifique os dados e tente novamente."); return; }
    const linha = mapFeriasRow(data);
    setLista(prev=>{
      const semEle = prev.filter(x=>x.id!==linha.id);
      return [linha, ...semEle].sort((a,b)=>(b.periodoAquisitivoInicio||"").localeCompare(a.periodoAquisitivoInicio||""));
    });
    if(form.id){
      addA("Férias editadas", linha.funcionarioNome, "Registro atualizado — Status: "+linha.status);
    } else {
      addN("Férias cadastradas: "+linha.funcionarioNome);
      addA("Férias cadastradas", linha.funcionarioNome, "Período aquisitivo "+fData(linha.periodoAquisitivoInicio)+" a "+fData(linha.periodoAquisitivoFim));
    }
    fecharForm();
  }

  // Troca rápida de status direto na listagem — mesmo padrão já usado em
  // Situação (Prorrogação de Boletos) e no seletor de status de Tarefas em
  // App.tsx: um <select> que já é a própria ação, sem precisar abrir o
  // formulário de edição. Passar por "Pendente" limpa as datas (regra
  // também reforçada no banco via ferias_datas_exigidas_fora_pendente),
  // então isso aqui só é permitido vindo de um registro que já tem os
  // outros campos preenchidos.
  async function mudarStatus(f,novoStatus){
    if(novoStatus!=="Pendente"&&(!f.dataInicio||!f.dataFim)){
      abrirEditar({...f,status:novoStatus});
      return;
    }
    const payload = novoStatus==="Pendente" ? {status:novoStatus,data_inicio:null,data_fim:null} : {status:novoStatus};
    const { data, error } = await supabase.from("ferias").update(payload).eq("id",f.id).select("*, funcionarios(nome, setor)").single();
    if(error||!data) return;
    const linha = mapFeriasRow(data);
    setLista(prev=>prev.map(x=>x.id===linha.id?linha:x));
    addA("Status alterado",f.funcionarioNome,f.status+" → "+novoStatus);
  }

  const visiveis = lista.filter(f=>
    (filtroStatus==="todos"||f.status===filtroStatus) &&
    (!busca || f.funcionarioNome.toLowerCase().includes(busca.toLowerCase()) || (f.funcionarioSetor||"").toLowerCase().includes(busca.toLowerCase()))
  );

  const historicoLista = historicoDe ? lista.filter(f=>f.funcionarioId===historicoDe).sort((a,b)=>(b.periodoAquisitivoInicio||"").localeCompare(a.periodoAquisitivoInicio||"")) : [];
  const historicoNome = historicoLista[0]?historicoLista[0].funcionarioNome:"";

  if(loading) return <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando férias...</div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Controle de Férias</div><div style={{fontSize:13,color:D.muted}}>{visiveis.length} registro(s)</div></div>
        <button style={st.btnBlue} onClick={()=>abrirNovo()}><Plus size={15}/>Nova Férias</button>
      </div>

      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 220px"}}>
          <label style={st.lbl}>Pesquisar</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="Funcionário ou setor" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
        </div>
        <div style={{flex:"1 1 160px"}}>
          <label style={st.lbl}>Status</label>
          <select style={st.inp} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
            <option value="todos">Todos</option>
            {STATUS_OPCOES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bv-card" style={st.card}>
        {visiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhum registro de férias encontrado.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Funcionário","Setor","Período aquisitivo","Início","Término","Dias","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(f=>{
              const sc=statusCor(f.status,D);
              return (
              <tr key={f.id} style={{borderBottom:"1px solid "+D.border}}>
                <td data-label="Funcionário" style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Av name={f.funcionarioNome} color={D.blue} size={30}/>
                    <div style={{fontWeight:500,color:D.text}}>{f.funcionarioNome}</div>
                  </div>
                </td>
                <td data-label="Setor" style={{padding:"10px 8px",color:D.muted}}>{f.funcionarioSetor||"—"}</td>
                <td data-label="Período aquisitivo" style={{padding:"10px 8px",color:D.muted}}>{fData(f.periodoAquisitivoInicio)} a {fData(f.periodoAquisitivoFim)}</td>
                <td data-label="Início" style={{padding:"10px 8px",color:D.muted}}>{f.dataInicio?fData(f.dataInicio):"—"}</td>
                <td data-label="Término" style={{padding:"10px 8px",color:D.muted}}>{f.dataFim?fData(f.dataFim):"—"}</td>
                <td data-label="Dias" style={{padding:"10px 8px",color:D.muted}}>{f.dias||"—"}</td>
                <td data-label="Status" style={{padding:"10px 8px"}}>
                  <select value={f.status} onChange={e=>mudarStatus(f,e.target.value)} style={{fontSize:11,fontWeight:600,background:sc.bg,color:sc.c,border:"none",borderRadius:20,padding:"3px 10px",cursor:"pointer",outline:"none"}}>
                    {STATUS_OPCOES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Histórico do funcionário" onClick={()=>setHistoricoDe(f.funcionarioId)}><History size={12}/></button>
                    <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Editar" onClick={()=>abrirEditar(f)}><Pencil size={12}/></button>
                  </div>
                </td>
              </tr>
              );
            })}</tbody>
          </table>
          </div>
        )}
      </div>

      {/* MODAL: cadastro / edição */}
      {showForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={fecharForm}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:560,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><CalendarClock size={22} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{form.id?"Editar Férias":"Nova Férias"}</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>{form.id?"Atualize o registro de férias.":"Cadastre um período de férias pra um funcionário."}</div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Funcionário</label>
                <select style={st.inp} value={form.funcionarioId} onChange={e=>{setForm(f=>({...f,funcionarioId:e.target.value}));setFormErr("");}} disabled={!!form.id}>
                  <option value="">Selecione...</option>
                  {funcionarios.map(fn=><option key={fn.id} value={fn.id}>{fn.nome}{fn.setor?" — "+fn.setor:""}{fn.status==="Inativo"?" (Inativo)":""}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Início do período aquisitivo</label><input type="date" style={st.inp} value={form.periodoAquisitivoInicio} onChange={e=>setForm(f=>({...f,periodoAquisitivoInicio:e.target.value,periodoAquisitivoFim:f.periodoAquisitivoFim||sugerirFimPeriodo(e.target.value)}))}/></div>
              <div><label style={st.lbl}>Fim do período aquisitivo</label><input type="date" style={st.inp} value={form.periodoAquisitivoFim} onChange={e=>setForm(f=>({...f,periodoAquisitivoFim:e.target.value}))}/></div>
              <div><label style={st.lbl}>Status</label>
                <select style={st.inp} value={form.status} onChange={e=>{setForm(f=>({...f,status:e.target.value}));setFormErr("");}}>
                  {STATUS_OPCOES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div/>
              <div><label style={st.lbl}>Data de início das férias{form.status!=="Pendente"?"":" (opcional)"}</label><input type="date" style={st.inp} value={form.dataInicio} onChange={e=>{setForm(f=>({...f,dataInicio:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Data de término das férias{form.status!=="Pendente"?"":" (opcional)"}</label><input type="date" style={st.inp} value={form.dataFim} onChange={e=>{setForm(f=>({...f,dataFim:e.target.value}));setFormErr("");}}/></div>
              {(()=>{const dias=calcularDiasPreview(form.dataInicio,form.dataFim); return dias!=null&&(
                <div style={{gridColumn:"1/-1",fontSize:12.5,color:D.text,background:D.bg,borderRadius:8,padding:"7px 10px"}}>Quantidade de dias: <strong>{dias}</strong></div>
              );})()}
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Observações</label><textarea rows={3} style={{...st.inp,resize:"vertical"}} value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>

            {formErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{formErr}</div>}

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={fecharForm}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvar} disabled={salvando}>{salvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: histórico de férias do funcionário */}
      {historicoDe&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>setHistoricoDe(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:16,padding:"1.6rem",maxWidth:480,width:"100%",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Av name={historicoNome} color={D.blue} size={38}/>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:D.text}}>{historicoNome}</div>
                  <div style={{fontSize:12,color:D.muted}}>Histórico de férias — {historicoLista.length} registro(s)</div>
                </div>
              </div>
              <button onClick={()=>setHistoricoDe(null)} style={{...st.btn,padding:"6px 8px",border:"none",background:"transparent"}}><X size={15}/></button>
            </div>
            {historicoLista.map(f=>{
              const sc=statusCor(f.status,D);
              return (
                <div key={f.id} style={{background:D.bg,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                    <div style={{fontSize:12.5,color:D.text,fontWeight:600}}>Aquisitivo: {fData(f.periodoAquisitivoInicio)} a {fData(f.periodoAquisitivoFim)}</div>
                    <span style={{fontSize:10.5,fontWeight:600,background:sc.bg,color:sc.c,borderRadius:20,padding:"2px 9px"}}>{f.status}</span>
                  </div>
                  <div style={{fontSize:12,color:D.muted,marginTop:4}}>
                    {f.dataInicio&&f.dataFim?fData(f.dataInicio)+" a "+fData(f.dataFim)+" — "+f.dias+" dia(s)":"Sem período definido"}
                  </div>
                  {f.observacoes&&<div style={{fontSize:11.5,color:D.muted,marginTop:4,fontStyle:"italic"}}>{f.observacoes}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
