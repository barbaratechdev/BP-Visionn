import { useEffect, useState } from "react";
import { Plus, Search, AlertCircle, AlertTriangle, Save, Contact, Clock, CheckCircle, Hourglass, FileSearch, CalendarX, CalendarClock, Printer, Eye, Pencil, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fDataHoraBR, nomeVisivel } from "../lib/helpers";
import { useDraggable } from "../lib/useDraggable";
import {
  SITUACOES, situacaoInfo, DOCS_OK_PENDENTE, ALVARAS, OPCOES_CONTROLADOS, OPCOES_SINTEGRA, OPCOES_SERASA,
  mapClienteRow, payloadCliente, hojeBelem, statusAlvara, alvaraInfo, documentosPendentes, alertasCliente, PENDENCIAS_EXTRAS,
  formatarCnpj, soDigitos, cnpjDigitosOk, razoesParecidas, mensagemErroCliente, imprimirFicha,
} from "../lib/cadastroClientes";
import MCard from "./MCard";
import CadastroClienteDetalhe from "./CadastroClienteDetalhe";

const FORM_VAZIO = {
  id:null, razaoSocial:"", codigoRazaoSocial:"", cnpj:"", grupo:"", televendas:"", responsavelNome:"", telefone:"", email:"",
  representanteId:"", supervisorId:"", dataInclusaoTarget:"", observacoes:"", situacao:"PENDENTE",
  docContratoSocial:"PENDENTE", docCnpj:"PENDENTE", docCrf:"PENDENTE", docFotos:"PENDENTE", docNotas:"PENDENTE",
  docControlados:"", alvaraPrefeituraVencimento:"", alvaraSanitarioVencimento:"", sintegra:"", serasa:"",
};

// Cadastro de Clientes — fichas de cadastro enviadas pelos representantes. Um registro por cliente:
// quando um documento chega, o mesmo registro é atualizado. Autor, datas e histórico ficam a cargo do
// banco (20261022000100_cadastro_clientes.sql); aqui só se evita mostrar o que o perfil não pode fazer.
// Auto-contida (busca os próprios dados), mesmo padrão de Avarias.tsx/RH.tsx.
export default function CadastroClientes(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN, user = p.user;
  const podeEditar = !!p.podeEditar, podeAdministrar = !!p.podeAdministrar;
  const hoje = hojeBelem();

  const [lista, setLista] = useState([]);
  const [opcoes, setOpcoes] = useState({representantes:[], supervisores:[]});
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [abertoId, setAbertoId] = useState(null);

  const [busca, setBusca] = useState("");
  const [fCodigo, setFCodigo] = useState("");
  const [fCnpj, setFCnpj] = useState("");
  const [fRep, setFRep] = useState("");
  const [fSup, setFSup] = useState("");
  const [fSit, setFSit] = useState("todas");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");
  const [fDoc, setFDoc] = useState("");
  const [fAlvara, setFAlvara] = useState("");
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { dragStyle, dragHandleProps, resetDrag } = useDraggable();

  useEffect(()=>{
    let ativo = true;
    Promise.all([
      supabase.from("clientes_cadastro").select("*").order("created_at",{ascending:false}),
      supabase.rpc("cadastro_clientes_opcoes"),
    ]).then(([cl, op])=>{
      if(!ativo) return;
      if(cl.error) setErroCarga(mensagemErroCliente(cl.error)); else setLista((cl.data||[]).map(mapClienteRow));
      if(!op.error&&op.data) setOpcoes({representantes:op.data.representantes||[], supervisores:op.data.supervisores||[]});
      setLoading(false);
    });
    return ()=>{ ativo = false; };
  },[]);

  function atualizarNaLista(row){
    const c = mapClienteRow(row);
    setLista(prev=>prev.some(x=>x.id===c.id)?prev.map(x=>x.id===c.id?c:x):[c,...prev]);
    return c;
  }

  // --- Filtros (combinados). Os indicadores usam todos os filtros menos o de situação,
  // para que, ao escolher um representante, os 7 números passem a ser só dele.
  const buscaN = busca.trim().toLowerCase();
  const base = lista.filter(c=>{
    if(c.excluidoEm && !(podeAdministrar&&mostrarExcluidos)) return false;
    if(buscaN && !(c.razaoSocial.toLowerCase().includes(buscaN) || c.responsavelNome.toLowerCase().includes(buscaN) || c.grupo.toLowerCase().includes(buscaN))) return false;
    if(fCodigo.trim() && !c.codigoRazaoSocial.toLowerCase().includes(fCodigo.trim().toLowerCase())) return false;
    if(soDigitos(fCnpj) && !c.cnpj.includes(soDigitos(fCnpj))) return false;
    if(fRep && c.representanteId!==fRep) return false;
    if(fSup && c.supervisorId!==fSup) return false;
    const inclusao = c.createdAt ? new Intl.DateTimeFormat("en-CA",{timeZone:"America/Belem"}).format(new Date(c.createdAt)) : "";
    if(fDe && inclusao<fDe) return false;
    if(fAte && inclusao>fAte) return false;
    if(fDoc && !documentosPendentes(c).some(d=>d.campo===fDoc)) return false;
    if(fAlvara && !ALVARAS.some(a=>statusAlvara(c[a.campo], hoje)===fAlvara)) return false;
    return true;
  });
  const visiveis = base.filter(c=>fSit==="todas"||c.situacao===fSit);
  const ativosBase = base.filter(c=>!c.excluidoEm);
  const contaAlvaras = s => ativosBase.reduce((n,c)=>n+ALVARAS.filter(a=>statusAlvara(c[a.campo], hoje)===s).length,0);
  const kpi = {
    total: ativosBase.length,
    pendentes: ativosBase.filter(c=>c.situacao==="PENDENTE").length,
    analise: ativosBase.filter(c=>c.situacao==="EM_ANALISE").length,
    aguardando: ativosBase.filter(c=>c.situacao==="AGUARDANDO_CLIENTE").length,
    efetivados: ativosBase.filter(c=>c.situacao==="EFETIVADO").length,
    vencidos: contaAlvaras("VENCIDO"),
    aVencer: contaAlvaras("A_VENCER"),
  };
  const filtrosAtivos = !!(busca||fCodigo||fCnpj||fRep||fSup||fSit!=="todas"||fDe||fAte||fDoc||fAlvara);
  function limparFiltros(){ setBusca(""); setFCodigo(""); setFCnpj(""); setFRep(""); setFSup(""); setFSit("todas"); setFDe(""); setFAte(""); setFDoc(""); setFAlvara(""); }

  // --- Formulário
  function abrirNovo(){ setForm(FORM_VAZIO); setFormErr(""); resetDrag(); setShowForm(true); }
  function abrirEditar(c){
    setForm({...FORM_VAZIO, ...c, cnpj:formatarCnpj(c.cnpj)});
    setFormErr(""); resetDrag(); setShowForm(true);
  }
  function fecharForm(){ setShowForm(false); setFormErr(""); }
  function escolherRepresentante(id){
    const r = opcoes.representantes.find(x=>x.id===id);
    // Supervisor vinculado ao representante vem preenchido; pode ser trocado depois.
    setForm(f=>({...f, representanteId:id, supervisorId: r&&r.supervisor_id ? r.supervisor_id : f.supervisorId}));
  }
  const repSelecionado = opcoes.representantes.find(x=>x.id===form.representanteId);
  const parecidos = showForm ? razoesParecidas(lista, form.razaoSocial, form.id) : [];
  const cnpjDig = soDigitos(form.cnpj);
  const dupCnpj = showForm && cnpjDig.length===14 ? lista.find(c=>c.id!==form.id&&!c.excluidoEm&&c.cnpj===cnpjDig) : null;
  const dupCodigo = showForm && form.codigoRazaoSocial.trim() ? lista.find(c=>c.id!==form.id&&!c.excluidoEm&&c.codigoRazaoSocial.toLowerCase()===form.codigoRazaoSocial.trim().toLowerCase()) : null;

  async function salvar(){
    if(!form.razaoSocial.trim()){ setFormErr("Informe a razão social do cliente."); return; }
    if(cnpjDig && cnpjDig.length!==14){ setFormErr("O CNPJ precisa ter 14 dígitos (ou deixe em branco)."); return; }
    if(dupCnpj){ setFormErr("Já existe um cadastro ativo com este CNPJ: "+dupCnpj.razaoSocial+"."); return; }
    if(dupCodigo){ setFormErr("Já existe um cadastro ativo com este código: "+dupCodigo.razaoSocial+"."); return; }
    setSalvando(true); setFormErr("");
    const payload = payloadCliente(form, !!form.id);
    const q = form.id
      ? supabase.from("clientes_cadastro").update(payload).eq("id", form.id).select("*").single()
      : supabase.from("clientes_cadastro").insert(payload).select("*").single();
    const { data, error } = await q;
    setSalvando(false);
    if(error||!data){ setFormErr(mensagemErroCliente(error)); return; }
    const c = atualizarNaLista(data);
    if(addA) addA(form.id?"Cadastro de cliente atualizado":"Cliente cadastrado", c.razaoSocial, form.id?"Ficha de cadastro atualizada":"Nova ficha de cadastro registrada");
    if(addN) addN((form.id?"Cadastro atualizado: ":"Cadastro registrado: ")+c.razaoSocial);
    setShowForm(false);
  }

  function imprimir(c){
    if(!imprimirFicha(c, hoje, nomeVisivel(user))) alert("O navegador bloqueou a janela de impressão. Permita pop-ups para o BP-Visionn e tente de novo.");
  }

  const aberto = abertoId ? lista.find(c=>c.id===abertoId) : null;
  const sel = (v, set, ops, vazio = null) => (
    <select style={st.inp} value={v} onChange={e=>set(e.target.value)}>
      {vazio!=null&&<option value="">{vazio}</option>}
      {ops.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
  const chip = (txt, info, key=undefined) => <span key={key} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,background:info.bg,color:info.c,borderRadius:20,padding:"2px 9px",maxWidth:"100%",textAlign:"left"}}><span style={{width:5,height:5,borderRadius:"50%",background:info.dot,flexShrink:0}}/>{txt}</span>;
  const pendInfo = {bg:D.redSoft, c:D.redText, dot:D.red};
  const secao = t => <div style={{gridColumn:"1/-1",fontSize:11,fontWeight:700,color:D.muted,textTransform:"uppercase",letterSpacing:0.5,marginTop:6,paddingBottom:4,borderBottom:"1px solid "+D.border}}>{t}</div>;

  return (
    <div>
      {aberto ? (
        <CadastroClienteDetalhe
          cliente={aberto} D={D} st={st} user={user} hoje={hoje}
          podeEditar={podeEditar&&!aberto.excluidoEm} podeAdministrar={podeAdministrar}
          onVoltar={()=>setAbertoId(null)} onEditar={()=>abrirEditar(aberto)} onImprimir={()=>imprimir(aberto)}
          onAtualizado={row=>atualizarNaLista(row)} addA={addA} addN={addN}
        />
      ) : (
      <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:D.text}}>Cadastro de Clientes</div>
          <div style={{fontSize:13,color:D.muted}}>{podeEditar?"Fichas recebidas dos representantes — inclua mesmo incompletas e atualize quando os documentos chegarem.":"Consulta das fichas de cadastro e dos documentos pendentes."}</div>
        </div>
        {podeEditar&&<button style={st.btnBlue} onClick={abrirNovo}><Plus size={15}/>Novo cadastro</button>}
      </div>

      {/* 140px: os 7 indicadores cabem numa linha no computador e ficam 2 por linha no celular. */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14,marginBottom:14}}>
        <MCard D={D} Icon={Contact} bg={D.blueSoft} color={D.blue} value={kpi.total} label="Total de cadastros"/>
        <MCard D={D} Icon={Clock} bg={D.redSoft} color={D.red} value={kpi.pendentes} label="Pendentes"/>
        <MCard D={D} Icon={FileSearch} bg={D.blueSoft} color={D.blue} value={kpi.analise} label="Em análise"/>
        <MCard D={D} Icon={Hourglass} bg={D.purpleSoft} color={D.purple} value={kpi.aguardando} label="Aguardando cliente"/>
        <MCard D={D} Icon={CheckCircle} bg={D.greenSoft} color={D.green} value={kpi.efetivados} label="Efetivados"/>
        <MCard D={D} Icon={CalendarX} bg={D.redSoft} color={D.red} value={kpi.vencidos} label="Alvarás vencidos"/>
        <MCard D={D} Icon={CalendarClock} bg={D.orangeSoft} color={D.orange} value={kpi.aVencer} label="Alvarás a vencer (30 dias)"/>
      </div>

      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"2 1 240px"}}>
          <label style={st.lbl}>Nome ou razão social</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="Cliente, responsável ou grupo" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
        </div>
        <div style={{flex:"1 1 140px"}}><label style={st.lbl}>Código da razão social</label><input style={st.inp} value={fCodigo} onChange={e=>setFCodigo(e.target.value)}/></div>
        <div style={{flex:"1 1 160px"}}><label style={st.lbl}>CNPJ</label><input style={st.inp} inputMode="numeric" value={fCnpj} onChange={e=>setFCnpj(formatarCnpj(e.target.value))}/></div>
        <div style={{flex:"1 1 180px"}}><label style={st.lbl}>Representante / vendedor</label>{sel(fRep,setFRep,opcoes.representantes.map(r=>({v:r.id,l:r.nome+(r.status!=="Ativo"?" (inativo)":"")})),"Todos")}</div>
        <div style={{flex:"1 1 180px"}}><label style={st.lbl}>Supervisor</label>{sel(fSup,setFSup,opcoes.supervisores.map(s=>({v:s.id,l:s.nome+(s.status!=="Ativo"?" (inativo)":"")})),"Todos")}</div>
      </div>
      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 160px"}}><label style={st.lbl}>Situação</label>
          <select style={st.inp} value={fSit} onChange={e=>setFSit(e.target.value)}>
            <option value="todas">Todas</option>
            {SITUACOES.map(s=><option key={s} value={s}>{situacaoInfo(s,D).label}</option>)}
          </select>
        </div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>Incluído de</label><input type="date" style={st.inp} value={fDe} onChange={e=>setFDe(e.target.value)}/></div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>Até</label><input type="date" style={st.inp} value={fAte} onChange={e=>setFAte(e.target.value)}/></div>
        <div style={{flex:"1 1 190px"}}><label style={st.lbl}>Documento pendente</label>
          {sel(fDoc,setFDoc,[...DOCS_OK_PENDENTE.map(d=>({v:d.campo,l:d.label})),...ALVARAS.map(a=>({v:a.campo,l:a.label+" (sem data)"})),...PENDENCIAS_EXTRAS.map(p=>({v:p.campo,l:p.label}))],"Qualquer")}
        </div>
        <div style={{flex:"1 1 170px"}}><label style={st.lbl}>Alvarás</label>{sel(fAlvara,setFAlvara,[{v:"VENCIDO",l:"Com alvará vencido"},{v:"A_VENCER",l:"Com alvará a vencer (30 dias)"}],"Todos")}</div>
        {podeAdministrar&&<label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:D.text,padding:"8px 0",cursor:"pointer"}}><input type="checkbox" checked={mostrarExcluidos} onChange={e=>setMostrarExcluidos(e.target.checked)}/>Mostrar excluídos</label>}
        {filtrosAtivos&&<button style={{...st.btn,padding:"8px 12px"}} onClick={limparFiltros}><X size={13}/>Limpar filtros</button>}
      </div>

      <div className="bv-card" style={st.card}>
        {loading?<div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando cadastros...</div>
        :erroCarga?<div style={{fontSize:13,color:D.redText,background:D.redSoft,borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",gap:6}}><AlertCircle size={14}/>{erroCarga}</div>
        :visiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>{lista.length===0?"Nenhum cadastro registrado ainda.":"Nenhum cadastro encontrado com estes filtros."}</div>:(
          <>
          <div style={{fontSize:12,color:D.muted,marginBottom:8}}>{visiveis.length} cadastro(s)</div>
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Cliente","Representante","Supervisor","Inclusão","Situação","Documentos pendentes","Última atualização","Ações"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(c=>{
              const si = situacaoInfo(c.situacao,D);
              const pend = documentosPendentes(c);
              const alertas = alertasCliente(c, hoje);
              return (
              <tr key={c.id} style={{borderBottom:"1px solid "+D.border,cursor:"pointer",opacity:c.excluidoEm?0.55:1}} onClick={()=>setAbertoId(c.id)}>
                {/* Cada célula tem um único bloco: no celular (.bv-table vira cartões) a célula é flex. */}
                <td data-label="Cliente" style={{padding:"10px 8px"}}><div>
                  <div style={{fontWeight:600,color:D.text}}>{c.razaoSocial}</div>
                  <div style={{fontSize:11.5,color:D.muted}}>{[c.codigoRazaoSocial&&"Cód. "+c.codigoRazaoSocial, c.cnpj&&formatarCnpj(c.cnpj)].filter(Boolean).join(" · ")||"Sem código / CNPJ"}</div>
                  {c.excluidoEm&&<div style={{fontSize:11,color:D.redText,fontWeight:600}}>Excluído em {fDataHoraBR(c.excluidoEm)}</div>}
                </div></td>
                <td data-label="Representante" style={{padding:"10px 8px",color:D.text}}><span>{c.representanteNome||"—"}{c.representanteCodigo&&<span style={{color:D.muted}}> ({c.representanteCodigo})</span>}</span></td>
                <td data-label="Supervisor" style={{padding:"10px 8px",color:D.muted}}>{c.supervisorNome||"—"}</td>
                <td data-label="Inclusão" style={{padding:"10px 8px",color:D.muted,whiteSpace:"nowrap"}}>{c.createdAt?fDataHoraBR(c.createdAt).split(" às ")[0]:"—"}</td>
                <td data-label="Situação" style={{padding:"10px 8px"}}>{chip(si.label, si)}</td>
                <td data-label="Documentos pendentes" style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,minWidth:0}}>
                    {pend.length===0?chip("Nenhum",{bg:D.greenSoft,c:D.greenText,dot:D.green}):pend.map(d=>chip(d.label, pendInfo, d.campo))}
                    {alertas.filter(a=>a.tipo==="VENCIDO").length>0&&chip("Alvará vencido",alvaraInfo("VENCIDO",D),"av")}
                    {alertas.filter(a=>a.tipo==="A_VENCER").length>0&&chip("Alvará a vencer",alvaraInfo("A_VENCER",D),"aa")}
                    {alertas.filter(a=>a.tipo==="ALERTA").map((a,i)=><span key={"al"+i} title={a.texto} style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,color:D.orangeText}}><AlertTriangle size={11}/>{a.texto}</span>)}
                  </div>
                </td>
                <td data-label="Última atualização" style={{padding:"10px 8px",color:D.muted,fontSize:12}}><div>{c.updatedAt?fDataHoraBR(c.updatedAt):"—"}{c.updatedByNome&&<div>{c.updatedByNome}</div>}</div></td>
                <td data-label="Ações" style={{padding:"10px 8px"}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...st.btn,padding:"4px 8px"}} title="Ver detalhes" onClick={()=>setAbertoId(c.id)}><Eye size={13}/></button>
                    {podeEditar&&!c.excluidoEm&&<button style={{...st.btn,padding:"4px 8px"}} title="Editar" onClick={()=>abrirEditar(c)}><Pencil size={13}/></button>}
                    <button style={{...st.btn,padding:"4px 8px"}} title="Imprimir ficha" onClick={()=>imprimir(c)}><Printer size={13}/></button>
                  </div>
                </td>
              </tr>
              );
            })}</tbody>
          </table>
          </div>
          </>
        )}
      </div>
      </>
      )}

      {/* MODAL: novo cadastro / editar cadastro */}
      {showForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:760,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",...dragStyle}} onClick={e=>e.stopPropagation()}>
            <div {...dragHandleProps}>
              <div style={{width:48,height:48,borderRadius:12,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Contact size={22} color={D.blue}/></div>
              <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{form.id?"Atualizar cadastro":"Novo cadastro de cliente"}</div>
              <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:18}}>{form.id?"Atualize os documentos que chegaram e os dados do cliente. Tudo fica no histórico.":"Registre a ficha mesmo incompleta. Quem incluiu e quando é gravado automaticamente."}</div>
            </div>

            {parecidos.length>0&&(
              <div style={{background:D.orangeSoft,border:"1px solid "+D.orange+"55",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:12.5,color:D.orangeText}}>
                <div style={{display:"flex",alignItems:"center",gap:6,fontWeight:700,marginBottom:4}}><AlertTriangle size={14}/>Possível cliente já cadastrado</div>
                {parecidos.slice(0,4).map(c=><div key={c.id}>{c.razaoSocial}{c.codigoRazaoSocial?" — cód. "+c.codigoRazaoSocial:""}{c.cnpj?" — "+formatarCnpj(c.cnpj):""} ({situacaoInfo(c.situacao,D).label})</div>)}
                <div style={{fontStyle:"italic",marginTop:4}}>Se for o mesmo cliente, feche este formulário e atualize o cadastro existente.</div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              {secao("Informações gerais")}
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Cliente / Razão social *</label><input autoFocus style={st.inp} value={form.razaoSocial} onChange={e=>{setForm(f=>({...f,razaoSocial:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Código da razão social</label><input style={st.inp} placeholder="Código do sistema da empresa" value={form.codigoRazaoSocial} onChange={e=>{setForm(f=>({...f,codigoRazaoSocial:e.target.value}));setFormErr("");}}/>
                {dupCodigo&&<div style={{fontSize:11.5,color:D.redText,marginTop:3}}>Já usado por {dupCodigo.razaoSocial}</div>}</div>
              <div><label style={st.lbl}>CNPJ</label><input style={st.inp} inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e=>{setForm(f=>({...f,cnpj:formatarCnpj(e.target.value)}));setFormErr("");}}/>
                {dupCnpj&&<div style={{fontSize:11.5,color:D.redText,marginTop:3}}>Já usado por {dupCnpj.razaoSocial}</div>}
                {!dupCnpj&&cnpjDig.length===14&&!cnpjDigitosOk(cnpjDig)&&<div style={{fontSize:11.5,color:D.orangeText,marginTop:3}}>Confira o CNPJ: os dígitos verificadores não conferem.</div>}</div>
              <div><label style={st.lbl}>Grupo</label><input style={st.inp} value={form.grupo} onChange={e=>setForm(f=>({...f,grupo:e.target.value}))}/></div>
              <div><label style={st.lbl}>Nome do responsável pelo cliente</label><input style={st.inp} value={form.responsavelNome} onChange={e=>setForm(f=>({...f,responsavelNome:e.target.value}))}/></div>
              <div><label style={st.lbl}>Telefone</label><input style={st.inp} inputMode="tel" value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/></div>
              <div><label style={st.lbl}>E-mail</label><input style={st.inp} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label style={st.lbl}>Data de inclusão na TARGET</label><input type="date" style={st.inp} value={form.dataInclusaoTarget} onChange={e=>setForm(f=>({...f,dataInclusaoTarget:e.target.value}))}/></div>

              {secao("Representação")}
              <div><label style={st.lbl}>Representante / vendedor</label>
                <select style={st.inp} value={form.representanteId} onChange={e=>escolherRepresentante(e.target.value)}>
                  <option value="">Selecione...</option>
                  {opcoes.representantes.map(r=><option key={r.id} value={r.id}>{r.nome}{r.status!=="Ativo"?" (inativo)":""}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Código do representante</label><input style={{...st.inp,background:D.bg,color:D.muted}} readOnly value={repSelecionado?(repSelecionado.codigo||"Sem código cadastrado"):""} placeholder="Preenchido pelo representante"/></div>
              <div><label style={st.lbl}>Supervisor</label>
                <select style={st.inp} value={form.supervisorId} onChange={e=>setForm(f=>({...f,supervisorId:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {opcoes.supervisores.map(s=><option key={s.id} value={s.id}>{s.nome}{s.status!=="Ativo"?" (inativo)":""}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Televendas</label><input style={st.inp} value={form.televendas} onChange={e=>setForm(f=>({...f,televendas:e.target.value}))}/></div>

              {secao("Documentos")}
              {DOCS_OK_PENDENTE.map(d=>(
                <div key={d.campo}><label style={st.lbl}>{d.label}</label>
                  <div style={{display:"flex",gap:6}}>
                    {["OK","PENDENTE"].map(v=>{
                      const on = form[d.campo]===v, ok = v==="OK";
                      return <button key={v} type="button" onClick={()=>setForm(f=>({...f,[d.campo]:v}))} style={{flex:1,padding:"8px 6px",borderRadius:9,cursor:"pointer",fontSize:12.5,fontWeight:on?700:500,border:"1px solid "+(on?(ok?D.green:D.red):D.border),background:on?(ok?D.greenSoft:D.redSoft):D.white,color:on?(ok?D.greenText:D.redText):D.muted}}>{ok?"OK":"Pendente"}</button>;
                    })}
                  </div>
                </div>
              ))}
              <div><label style={st.lbl}>Controlados</label>{sel(form.docControlados,v=>setForm(f=>({...f,docControlados:v})),OPCOES_CONTROLADOS)}</div>
              {ALVARAS.map(a=>{
                const s = statusAlvara(form[a.campo], hoje), info = alvaraInfo(s,D);
                return <div key={a.campo}><label style={st.lbl}>{a.label} — vencimento</label><input type="date" style={st.inp} value={form[a.campo]} onChange={e=>setForm(f=>({...f,[a.campo]:e.target.value}))}/>
                  <div style={{marginTop:4}}>{chip(info.label, info)}</div></div>;
              })}
              <div><label style={st.lbl}>Sintegra</label>{sel(form.sintegra,v=>setForm(f=>({...f,sintegra:v})),OPCOES_SINTEGRA)}</div>
              <div><label style={st.lbl}>Serasa</label>{sel(form.serasa,v=>setForm(f=>({...f,serasa:v})),OPCOES_SERASA)}</div>

              {secao("Situação e observações")}
              <div><label style={st.lbl}>Situação do cadastro</label>
                {form.id
                  ? <select style={st.inp} value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))}>{SITUACOES.map(s=><option key={s} value={s}>{situacaoInfo(s,D).label}</option>)}</select>
                  : <div style={{padding:"9px 0"}}>{chip("Pendente", situacaoInfo("PENDENTE",D))}<span style={{fontSize:11.5,color:D.muted,marginLeft:6}}>todo cadastro começa como Pendente</span></div>}
                {form.id&&form.situacao==="EFETIVADO"&&documentosPendentes(form).length>0&&<div style={{fontSize:11.5,color:D.orangeText,marginTop:4,display:"flex",gap:4,alignItems:"center"}}><AlertTriangle size={12}/>Ainda há {documentosPendentes(form).length} documento(s) pendente(s). Você pode efetivar mesmo assim.</div>}
                {form.id&&form.situacao!=="EFETIVADO"&&documentosPendentes(form).length===0&&<div style={{fontSize:11.5,color:D.greenText,marginTop:4}}>Todos os documentos estão OK — pronto para efetivar, se a equipe considerar regularizado.</div>}
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Observações</label><textarea rows={2} style={{...st.inp,resize:"vertical"}} value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>

            {formErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{formErr}</div>}

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={fecharForm}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvar} disabled={salvando}>{salvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
