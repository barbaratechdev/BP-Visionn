import { useEffect, useState } from "react";
import { Plus, Search, Printer, AlertCircle, Ban, Pencil } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fBRL, fData, parseMoedaInput, fMoedaInput, mapAbatimentoRow, nomeVisivel } from "../lib/helpers";
import { hoje, ESTADOS_FILIAL } from "../constants";
import { useDraggable } from "../lib/useDraggable";
import CampoValor from "./CampoValor";

const FORM_VAZIO = {id:null,laboratorio:"",filial:"",nf:"",valorAbatimento:"",valorPago:"",data:hoje};

function mensagemErroSalvar(error){
  console.error("Erro ao salvar abatimento:", error);
  if(!error) return "Não foi possível salvar. Verifique os dados e tente novamente.";
  if(error.code==="42501") return "Você não tem permissão para registrar abatimentos. Fale com a administração do sistema.";
  if(error.code==="23502") return "Preencha todos os campos obrigatórios antes de salvar.";
  if(error.code==="23514") return "Um dos valores informados não é válido — confira filial e valores.";
  return "Não foi possível salvar"+(error.code?" (código "+error.code+")":"")+". Se o problema continuar, informe esse código ao suporte.";
}

// Controle de Abatimentos — registro simples de descontos recebidos em
// boletos, pro Financeiro ter uma consulta centralizada. Auto-contido
// (busca os próprios dados via useEffect), mesmo padrão de Avarias.tsx —
// não entra no mega-fetch central de App.tsx. Sem exclusão física: corrigir
// é cancelar (status), mesmo conceito de avarias. Independente de
// Avarias/NFD por decisão explícita — sem vínculo entre os dois módulos.
export default function Abatimentos(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN, user = p.user;
  const isDemo = !!p.isDemo;
  const podeEditar = !isDemo;
  const usuarioNome = nomeVisivel(user);

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [fLaboratorio, setFLaboratorio] = useState("");
  const [fNf, setFNf] = useState("");
  const [fFilial, setFFilial] = useState("todas");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { dragStyle, dragHandleProps, resetDrag } = useDraggable();

  const [cancelando, setCancelando] = useState(null);

  async function carregar(){
    setLoading(true);
    const { data, error } = await supabase.from("abatimentos").select("*").order("data",{ascending:false});
    if(!error&&data) setLista(data.map(mapAbatimentoRow));
    setLoading(false);
  }

  useEffect(()=>{ carregar(); },[]);

  function abrirNovo(){ setForm(FORM_VAZIO); setFormErr(""); setShowForm(true); resetDrag(); }

  function abrirEditar(a){
    setForm({id:a.id,laboratorio:a.laboratorio,filial:a.filial,nf:a.nf,valorAbatimento:fMoedaInput(a.valorAbatimento),valorPago:fMoedaInput(a.valorPago),data:a.data});
    setFormErr(""); setShowForm(true); resetDrag();
  }

  function fecharForm(){ setShowForm(false); setFormErr(""); }

  const laboratoriosConhecidos = Array.from(new Set(lista.map(a=>a.laboratorio).filter(Boolean)));

  async function salvar(){
    if(!form.laboratorio.trim()){ setFormErr("Informe o laboratório."); return; }
    if(!form.filial){ setFormErr("Selecione a filial."); return; }
    if(!form.nf.trim()){ setFormErr("Informe a NF."); return; }
    const valorAbatimento = parseMoedaInput(form.valorAbatimento);
    if(valorAbatimento==null||valorAbatimento<0){ setFormErr("Informe um valor de abatimento válido."); return; }
    const valorPago = parseMoedaInput(form.valorPago);
    if(valorPago==null||valorPago<0){ setFormErr("Informe um valor pago válido."); return; }
    if(!form.data){ setFormErr("Informe a data."); return; }
    setSalvando(true); setFormErr("");
    const payload = {
      laboratorio: form.laboratorio.trim(),
      filial: form.filial,
      nf: form.nf.trim(),
      valor_abatimento: valorAbatimento,
      valor_pago: valorPago,
      data: form.data,
    };
    const query = form.id
      ? supabase.from("abatimentos").update({...payload, updated_by:user?user.id:null, updated_by_nome:usuarioNome||null}).eq("id",form.id).select().single()
      : supabase.from("abatimentos").insert({...payload, created_by:user?user.id:null, created_by_nome:usuarioNome||null}).select().single();
    const { data, error } = await query;
    setSalvando(false);
    if(error||!data){ setFormErr(mensagemErroSalvar(error)); return; }
    const linha = mapAbatimentoRow(data);
    setLista(prev=>{
      const semEle = prev.filter(a=>a.id!==linha.id);
      return [linha,...semEle].sort((a,b)=>(b.data||"").localeCompare(a.data||""));
    });
    const referencia = linha.nf+" — "+linha.laboratorio;
    if(form.id){
      addA("Abatimento editado", referencia, "Dados atualizados");
    } else {
      addA("Abatimento cadastrado", referencia, "Filial "+linha.filial+", valor "+fBRL(linha.valorAbatimento));
      addN("Novo abatimento registrado: NF "+linha.nf);
    }
    fecharForm();
  }

  async function confirmarCancelar(){
    if(!cancelando) return;
    const { data, error } = await supabase.from("abatimentos").update({status:"CANCELADO", updated_by:user?user.id:null, updated_by_nome:usuarioNome||null}).eq("id",cancelando.id).select().single();
    if(error||!data){ setCancelando(null); return; }
    const linha = mapAbatimentoRow(data);
    setLista(prev=>prev.map(a=>a.id===linha.id?linha:a));
    addA("Abatimento cancelado", linha.nf+" — "+linha.laboratorio, "Filial "+linha.filial);
    setCancelando(null);
  }

  function matchesBusca(a, q){
    const s = q.toLowerCase();
    return a.nf.toLowerCase().includes(s) || a.laboratorio.toLowerCase().includes(s);
  }

  const visiveis = lista.filter(a=>
    (fFilial==="todas"||a.filial===fFilial)
    && (!fLaboratorio||a.laboratorio.toLowerCase().includes(fLaboratorio.toLowerCase()))
    && (!fNf||a.nf.toLowerCase().includes(fNf.toLowerCase()))
    && (!fDe||a.data>=fDe)
    && (!fAte||a.data<=fAte)
    && (!busca||matchesBusca(a,busca))
  );

  // Resumo do topo respeita os filtros aplicados (visiveis), igual o
  // dashboard de avarias — só registros ATIVO entram na soma, cancelado
  // não representa mais um abatimento vigente (mesmo raciocínio de
  // concessões canceladas em avarias, que somem dos totais).
  const totalAbatimento = visiveis.filter(a=>a.status==="ATIVO").reduce((s,a)=>s+(a.valorAbatimento||0),0);
  const totalPago = visiveis.filter(a=>a.status==="ATIVO").reduce((s,a)=>s+(a.valorPago||0),0);

  // --- Impressão/exportação — mesmo padrão de imprimirAvarias/imprimirProrrogacoes.
  function imprimir(){
    const w = window.open("","_blank");
    if(!w) return;
    w.opener = null;
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'/><style>@page{size:landscape;margin:1.2cm}body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#111}h1{font-size:14pt;margin:0 0 4px}.sub{font-size:9pt;color:#555;margin:2px 0}.meta{margin-bottom:14px}table{width:100%;table-layout:fixed;border-collapse:collapse}th,td{padding:5px 6px;text-align:left;border-bottom:1px solid #ddd;font-size:8.5pt;word-break:break-word;overflow-wrap:break-word}th{background:#f2f2f2;font-weight:600}thead{display:table-header-group}tr{page-break-inside:avoid}.r{margin-top:22px;font-size:8.5pt;color:#555;text-align:center;border-top:1px solid #ccc;padding-top:8px}@media print{button{display:none}}</style></head><body></body></html>");
    w.document.close();
    w.document.title = "Relatório de Abatimentos";
    const h1 = w.document.createElement("h1");
    h1.textContent = "BP-Visionn — Controle de Abatimentos";
    w.document.body.appendChild(h1);

    const meta = w.document.createElement("div");
    meta.className = "meta";
    const agora = new Date();
    const linhas = [
      "Gerado em "+agora.toLocaleDateString("pt-BR")+" às "+agora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
      visiveis.length+" registro"+(visiveis.length===1?"":"s")+" exibido"+(visiveis.length===1?"":"s"),
    ];
    linhas.forEach(txt=>{ const l=w.document.createElement("div"); l.className="sub"; l.textContent=txt; meta.appendChild(l); });
    w.document.body.appendChild(meta);

    const colunas = [
      {h:"Laboratório", get:a=>a.laboratorio},
      {h:"NF", get:a=>a.nf},
      {h:"Valor do Abatimento", get:a=>fBRL(a.valorAbatimento)},
      {h:"Valor Pago", get:a=>fBRL(a.valorPago)},
      {h:"Data", get:a=>a.data?fData(a.data):"—"},
      {h:"Filial", get:a=>a.filial},
    ];
    const table = w.document.createElement("table");
    const thead = w.document.createElement("thead");
    const trh = w.document.createElement("tr");
    colunas.forEach(c=>{ const th=w.document.createElement("th"); th.textContent=c.h; trh.appendChild(th); });
    thead.appendChild(trh);
    const tbody = w.document.createElement("tbody");
    visiveis.forEach(a=>{
      const tr = w.document.createElement("tr");
      colunas.forEach(c=>{ const td=w.document.createElement("td"); td.textContent=c.get(a)||"—"; tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    table.appendChild(thead); table.appendChild(tbody);
    w.document.body.appendChild(table);

    const rodape = w.document.createElement("div");
    rodape.className = "r";
    rodape.textContent = "Documento gerado pelo BP-Visionn — "+agora.toLocaleDateString("pt-BR")+" às "+agora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    w.document.body.appendChild(rodape);
    w.print();
    w.onafterprint = ()=>w.close();
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Controle de Abatimentos</div><div style={{fontSize:13,color:D.muted}}>{visiveis.length} abatimento(s)</div></div>
        <div style={{display:"flex",gap:8}}>
          <button style={st.btn} onClick={imprimir}><Printer size={14}/>Exportar</button>
          {podeEditar&&<button style={st.btnBlue} onClick={abrirNovo}><Plus size={15}/>Novo Abatimento</button>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <div className="bv-card" style={{...st.card,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:12,color:D.muted}}>Total de Abatimentos</div>
          <div style={{fontSize:22,fontWeight:700,color:D.text}}>{fBRL(totalAbatimento)}</div>
        </div>
        <div className="bv-card" style={{...st.card,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:12,color:D.muted}}>Total Pago</div>
          <div style={{fontSize:22,fontWeight:700,color:D.text}}>{fBRL(totalPago)}</div>
        </div>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando abatimentos...</div>
      ):(
      <>
      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 240px"}}>
          <label style={st.lbl}>Busca rápida</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="Laboratório ou NF" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
        </div>
        <div style={{flex:"1 1 160px"}}><label style={st.lbl}>Laboratório</label><input style={st.inp} value={fLaboratorio} onChange={e=>setFLaboratorio(e.target.value)}/></div>
        <div style={{flex:"1 1 140px"}}><label style={st.lbl}>NF</label><input style={st.inp} value={fNf} onChange={e=>setFNf(e.target.value)}/></div>
        <div style={{flex:"1 1 160px"}}>
          <label style={st.lbl}>Filial</label>
          <select style={st.inp} value={fFilial} onChange={e=>setFFilial(e.target.value)}>
            <option value="todas">Todas</option>
            {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
          </select>
        </div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>De</label><input type="date" style={st.inp} value={fDe} onChange={e=>setFDe(e.target.value)}/></div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>Até</label><input type="date" style={st.inp} value={fAte} onChange={e=>setFAte(e.target.value)}/></div>
      </div>

      <div className="bv-card" style={st.card}>
        {visiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhum abatimento encontrado.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Laboratório","NF","Valor do Abatimento","Valor Pago","Data","Filial",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(a=>(
              <tr key={a.id} style={{borderBottom:"1px solid "+D.border,opacity:a.status==="CANCELADO"?0.55:1}}>
                <td data-label="Laboratório" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>
                  {a.laboratorio}
                  {a.status==="CANCELADO"&&<span style={{marginLeft:8,fontSize:10,fontWeight:600,background:D.redSoft,color:D.redText,borderRadius:20,padding:"2px 8px"}}>Cancelado</span>}
                </td>
                <td data-label="NF" style={{padding:"10px 8px",color:D.text}}>{a.nf}</td>
                <td data-label="Valor do Abatimento" style={{padding:"10px 8px",color:D.muted}}>{fBRL(a.valorAbatimento)}</td>
                <td data-label="Valor Pago" style={{padding:"10px 8px",color:D.muted}}>{fBRL(a.valorPago)}</td>
                <td data-label="Data" style={{padding:"10px 8px",color:D.muted}}>{a.data?fData(a.data):"—"}</td>
                <td data-label="Filial" style={{padding:"10px 8px",color:D.muted}}>{a.filial}</td>
                <td style={{padding:"10px 8px"}}>
                  {podeEditar&&(
                    <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                      <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Editar" onClick={()=>abrirEditar(a)}><Pencil size={12}/></button>
                      {a.status==="ATIVO"&&<button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} title="Cancelar" onClick={()=>setCancelando(a)}><Ban size={12}/></button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* MODAL: novo/editar abatimento */}
      {showForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:560,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",...dragStyle}} onClick={e=>e.stopPropagation()}>
            <div {...dragHandleProps}>
              <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{form.id?"Editar Abatimento":"Novo Abatimento"}</div>
              <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>{form.id?"Atualize os dados do abatimento.":"Registre um abatimento recebido em boleto."}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Laboratório</label><input autoFocus style={st.inp} list="abatimentos-laboratorios" value={form.laboratorio} onChange={e=>{setForm(f=>({...f,laboratorio:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Filial</label>
                <select style={st.inp} value={form.filial} onChange={e=>{setForm(f=>({...f,filial:e.target.value}));setFormErr("");}}>
                  <option value="">Selecione...</option>
                  {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>NF</label><input style={st.inp} value={form.nf} onChange={e=>{setForm(f=>({...f,nf:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Valor do Abatimento (R$)</label><CampoValor style={st.inp} value={form.valorAbatimento} onChange={v=>setForm(f=>({...f,valorAbatimento:v}))} onBlur={()=>setForm(f=>({...f,valorAbatimento:fMoedaInput(f.valorAbatimento)}))}/></div>
              <div><label style={st.lbl}>Valor Pago (R$)</label><CampoValor style={st.inp} value={form.valorPago} onChange={v=>setForm(f=>({...f,valorPago:v}))} onBlur={()=>setForm(f=>({...f,valorPago:fMoedaInput(f.valorPago)}))}/></div>
              <div><label style={st.lbl}>Data</label><input type="date" style={st.inp} value={form.data} onChange={e=>{setForm(f=>({...f,data:e.target.value}));setFormErr("");}}/></div>
            </div>

            <datalist id="abatimentos-laboratorios">{laboratoriosConhecidos.map(v=><option key={v} value={v}/>)}</datalist>

            {formErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{formErr}</div>}

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={fecharForm}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvar} disabled={salvando}>{salvando?"Salvando...":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: confirmar cancelamento */}
      {cancelando&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:"1rem"}} onClick={()=>setCancelando(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:16,padding:"1.6rem",maxWidth:380,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:44,height:44,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Ban size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:15,color:D.text,marginBottom:6}}>Cancelar abatimento?</div>
            <div style={{fontSize:13,color:D.muted,marginBottom:18}}>NF {cancelando.nf} — {cancelando.laboratorio}. O registro continua no histórico, marcado como cancelado, e sai dos totais.</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:13,color:D.text,fontWeight:500}} onClick={()=>setCancelando(null)}>Voltar</button>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600}} onClick={confirmarCancelar}>Cancelar abatimento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
