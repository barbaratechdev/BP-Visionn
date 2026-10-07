import { useEffect, useState } from "react";
import { Plus, Search, Printer, AlertCircle, Ban, Pencil, Send } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fBRL, fData, fDataHoraBR, parseMoedaInput, fMoedaInput, mapAbatimentoRow, nomeVisivel } from "../lib/helpers";
import { APROVADOR_CANCELAMENTO_ID, mapSolicitacaoRow, mensagemErroCancelamento } from "../lib/cancelamentos";
import { TIPOS_ABATIMENTO, SITUACOES_ABATIMENTO, situacaoLabel, parsePercentual, fPercentual, fPercentualInput, filtrarAbatimentos, calcularResumo, ehIncompatibilidadeDeBanco } from "../lib/abatimentos";
import { hoje, ESTADOS_FILIAL } from "../constants";
import { useDraggable } from "../lib/useDraggable";
import CampoValor from "./CampoValor";

// Novo abatimento nasce PENDENTE (solicitado ao fornecedor, ainda não abatido);
// vira REALIZADO quando o desconto é efetivamente aplicado no boleto.
// tipoLegado: registro antigo sem classificação — pode ser editado sem
// escolher o tipo (novos registros sempre exigem).
const FORM_VAZIO = {id:null,laboratorio:"",filial:"",tipo:"",nfd:"",nf:"",percentual:"",valorAbatimento:"",valorPago:"",data:hoje,situacao:"PENDENTE",tipoLegado:false};

function mensagemErroSalvar(error){
  console.error("Erro ao salvar abatimento:", error);
  if(!error) return "Não foi possível salvar. Verifique os dados e tente novamente.";
  if(error.code==="42501") return "Você não tem permissão para registrar abatimentos. Fale com a administração do sistema.";
  if(error.code==="23502") return "Preencha todos os campos obrigatórios antes de salvar.";
  if(error.code==="23514") return "Um dos valores informados não é válido — confira filial, tipo, percentual e valores.";
  if(ehIncompatibilidadeDeBanco(error)) return "O banco de dados ainda não foi atualizado para os novos campos do abatimento. Fale com a administração do sistema.";
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
  // Só a Barbára cancela direto; o Financeiro solicita e ela decide (a trava
  // real é no banco — ver 20261002000010/20261002000020). onCancelamentoMudou avisa o App
  // (contador de pendentes da aprovadora) quando algo muda por aqui.
  const isAprovador = !!user && user.id===APROVADOR_CANCELAMENTO_ID;
  const onCancelamentoMudou = p.onCancelamentoMudou;

  const [lista, setLista] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [fLaboratorio, setFLaboratorio] = useState("");
  const [fNf, setFNf] = useState("");
  const [fFilial, setFFilial] = useState("todas");
  const [fTipo, setFTipo] = useState("todos");
  const [fSituacao, setFSituacao] = useState("todas");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { dragStyle, dragHandleProps, resetDrag } = useDraggable();

  // Barbára: cancelamento direto (motivo opcional).
  const [cancelando, setCancelando] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelErr, setCancelErr] = useState("");
  const [cancelSalvando, setCancelSalvando] = useState(false);
  // Financeiro: solicitação de cancelamento (motivo obrigatório).
  const [solicitando, setSolicitando] = useState(null);
  const [solMotivo, setSolMotivo] = useState("");
  const [solErr, setSolErr] = useState("");
  const [solSalvando, setSolSalvando] = useState(false);

  // silencioso: recarga disparada por Realtime não pisca "Carregando..." na lista.
  async function carregar(silencioso=false){
    if(!silencioso) setLoading(true);
    const { data, error } = await supabase.from("abatimentos").select("*").order("data",{ascending:false});
    if(!error&&data) setLista(data.map(mapAbatimentoRow));
    await carregarSolicitacoes();
    if(!silencioso) setLoading(false);
  }

  // Falha aqui (ex.: ambiente sem a migration do fluxo) não derruba a tela.
  async function carregarSolicitacoes(){
    const { data, error } = await supabase.from("cancelamento_solicitacoes").select("*").eq("tipo","ABATIMENTO").order("created_at",{ascending:false});
    if(!error&&data) setSolicitacoes(data.map(mapSolicitacaoRow));
  }

  useEffect(()=>{ carregar(); },[]);

  // Decisão da Barbára (ou cancelamento direto dela) muda status e pedido
  // sem esta tela ter feito nada — recarrega quando chegar o evento.
  useEffect(()=>{
    if(!user) return;
    const canal = supabase
      .channel("abatimentos-cancel-"+user.id)
      .on("postgres_changes", { event:"*", schema:"public", table:"cancelamento_solicitacoes" }, ()=>{ carregar(true); })
      .subscribe();
    return ()=>{ supabase.removeChannel(canal); };
  },[user&&user.id]);

  // Pedido mais recente de cada abatimento (a lista já vem do mais novo pro mais antigo).
  const pedidoPorAbatimento = {};
  solicitacoes.forEach(s=>{ if(!pedidoPorAbatimento[s.entidadeId]) pedidoPorAbatimento[s.entidadeId]=s; });

  function abrirNovo(){ setForm(FORM_VAZIO); setFormErr(""); setShowForm(true); resetDrag(); }

  function abrirEditar(a){
    setForm({id:a.id,laboratorio:a.laboratorio,filial:a.filial,tipo:a.tipoAbatimento,nfd:a.nfd,nf:a.nf,percentual:fPercentualInput(a.percentual),valorAbatimento:fMoedaInput(a.valorAbatimento),valorPago:fMoedaInput(a.valorPago),data:a.data,situacao:a.situacao,tipoLegado:!a.tipoAbatimento});
    setFormErr(""); setShowForm(true); resetDrag();
  }

  function fecharForm(){ setShowForm(false); setFormErr(""); }

  const laboratoriosConhecidos = Array.from(new Set(lista.map(a=>a.laboratorio).filter(Boolean)));

  async function salvar(){
    if(!form.laboratorio.trim()){ setFormErr("Informe o fornecedor."); return; }
    if(!form.filial){ setFormErr("Selecione a filial."); return; }
    if(!form.tipo && !form.tipoLegado){ setFormErr("Selecione o tipo de abatimento."); return; }
    if(!form.nf.trim()){ setFormErr("Informe o número do boleto."); return; }
    const percentual = parsePercentual(form.percentual);
    if(percentual===undefined){ setFormErr("Informe um percentual válido entre 0 e 100 (ou deixe em branco)."); return; }
    const valorAbatimento = parseMoedaInput(form.valorAbatimento);
    if(valorAbatimento==null||valorAbatimento<0){ setFormErr("Informe um valor de abatimento válido."); return; }
    // Valor Pago não é mais indicador do módulo: campo opcional (vazio = 0; a coluna segue guardada).
    const valorPago = form.valorPago.trim()==="" ? 0 : parseMoedaInput(form.valorPago);
    if(valorPago==null||valorPago<0){ setFormErr("Informe um valor pago válido ou deixe em branco."); return; }
    if(!form.data){ setFormErr("Informe a data."); return; }
    setSalvando(true); setFormErr("");
    const payload = {
      laboratorio: form.laboratorio.trim(),
      filial: form.filial,
      tipo_abatimento: form.tipo||null,
      nfd: form.nfd.trim()||null,
      nf: form.nf.trim(),
      percentual,
      valor_abatimento: valorAbatimento,
      valor_pago: valorPago,
      data: form.data,
      situacao: form.situacao,
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
      addA("Abatimento cadastrado", referencia, "Filial "+linha.filial+", "+linha.tipoAbatimento+(linha.nfd?", NFD "+linha.nfd:"")+", valor "+fBRL(linha.valorAbatimento));
      addN("Novo abatimento registrado: boleto "+linha.nf);
    }
    fecharForm();
  }

  // Troca rápida da situação (Pendente ↔ Realizado) direto na tabela. Os
  // totais do topo são derivados da lista, então atualizam sozinhos.
  async function mudarSituacao(a, nova){
    if(nova===a.situacao) return;
    const { data, error } = await supabase.from("abatimentos").update({situacao:nova, updated_by:user?user.id:null, updated_by_nome:usuarioNome||null}).eq("id",a.id).select().single();
    if(error||!data){ console.error("Erro ao alterar situação do abatimento:", error); addN("Não foi possível alterar a situação do abatimento (boleto "+a.nf+")."); return; }
    const linha = mapAbatimentoRow(data);
    setLista(prev=>prev.map(x=>x.id===linha.id?linha:x));
    addA("Situação do abatimento alterada", a.nf+" — "+a.laboratorio, situacaoLabel(a.situacao)+" → "+situacaoLabel(nova));
  }

  function fecharCancelar(){ setCancelando(null); setCancelMotivo(""); setCancelErr(""); }

  // Cancelamento direto — só a Barbára (o banco recusa qualquer outra pessoa).
  // A função já registra a auditoria no servidor, então não chama addA aqui.
  async function confirmarCancelar(){
    if(!cancelando) return;
    setCancelSalvando(true); setCancelErr("");
    const { error } = await supabase.rpc("cancelar_abatimento_direto",{p_abatimento_id:cancelando.id, p_motivo:cancelMotivo.trim()||null});
    setCancelSalvando(false);
    if(error){ setCancelErr(mensagemErroCancelamento(error,"Não foi possível cancelar. Tente novamente.")); return; }
    await carregar(true);
    if(onCancelamentoMudou) onCancelamentoMudou();
    fecharCancelar();
  }

  function abrirSolicitar(a){ setSolicitando(a); setSolMotivo(""); setSolErr(""); }
  function fecharSolicitar(){ setSolicitando(null); setSolMotivo(""); setSolErr(""); }

  // Financeiro: o lançamento continua ATIVO até a Barbára decidir.
  async function confirmarSolicitar(){
    if(!solicitando) return;
    if(solMotivo.trim().length<5){ setSolErr("Informe o motivo do cancelamento (mínimo de 5 caracteres)."); return; }
    setSolSalvando(true); setSolErr("");
    const { error } = await supabase.rpc("solicitar_cancelamento_abatimento",{p_abatimento_id:solicitando.id, p_motivo:solMotivo.trim()});
    setSolSalvando(false);
    if(error){ setSolErr(mensagemErroCancelamento(error,"Não foi possível enviar a solicitação. Tente novamente.")); return; }
    await carregarSolicitacoes();
    addN("Solicitação de cancelamento enviada: boleto "+solicitando.nf+" — aguardando aprovação");
    fecharSolicitar();
  }

  const visiveis = filtrarAbatimentos(lista, {busca, fornecedor:fLaboratorio, boleto:fNf, filial:fFilial, tipo:fTipo, situacao:fSituacao, de:fDe, ate:fAte});

  // Resumo do topo respeita os filtros aplicados (visiveis), igual o
  // dashboard de avarias — só registros ATIVO entram na soma (cancelado não
  // é abatimento vigente). O destaque é o Total de Abatimentos REALIZADOS
  // (efetivamente abatidos); os pendentes aparecem à parte e nunca entram nele.
  const resumo = calcularResumo(visiveis);

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
      {h:"Fornecedor", get:a=>a.laboratorio},
      {h:"Filial", get:a=>a.filial},
      {h:"Tipo de Abatimento", get:a=>a.tipoAbatimento},
      {h:"Nº da NFD", get:a=>a.nfd},
      {h:"Nº do Boleto", get:a=>a.nf},
      {h:"Percentual (%)", get:a=>a.percentual==null?"":fPercentual(a.percentual)},
      {h:"Valor do Abatimento", get:a=>fBRL(a.valorAbatimento)},
      {h:"Data", get:a=>a.data?fData(a.data):"—"},
      {h:"Status", get:a=>a.status==="CANCELADO"?"Cancelado":situacaoLabel(a.situacao)},
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
      {/* Sugestões de fornecedor — usada pelo filtro e pelo formulário */}
      <datalist id="abatimentos-laboratorios">{laboratoriosConhecidos.map(v=><option key={v} value={v}/>)}</datalist>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Controle de Abatimentos</div><div style={{fontSize:13,color:D.muted}}>{visiveis.length} abatimento(s)</div></div>
        <div style={{display:"flex",gap:8}}>
          <button style={st.btn} onClick={imprimir}><Printer size={14}/>Exportar</button>
          {podeEditar&&<button style={st.btnBlue} onClick={abrirNovo}><Plus size={15}/>Novo Abatimento</button>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:20}}>
        <div className="bv-card" style={{...st.card,display:"flex",flexDirection:"column",gap:4,borderLeft:"3px solid "+D.green}}>
          <div style={{fontSize:12,color:D.muted}}>Total de Abatimentos Realizados</div>
          <div style={{fontSize:26,fontWeight:700,color:D.greenText}}>{fBRL(resumo.totalRealizado)}</div>
          <div style={{fontSize:11,color:D.muted}}>{resumo.qtdRealizado} abatimento(s) efetivamente abatido(s)</div>
        </div>
        <div className="bv-card" style={{...st.card,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:12,color:D.muted}}>Abatimentos Pendentes</div>
          <div style={{fontSize:22,fontWeight:700,color:D.text}}>{fBRL(resumo.totalPendente)}</div>
          <div style={{fontSize:11,color:D.muted}}>{resumo.qtdPendente} aguardando o abatimento (não entram no total realizado)</div>
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
            <input style={{...st.inp,paddingLeft:30}} placeholder="Fornecedor, boleto ou NFD" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
        </div>
        <div style={{flex:"1 1 160px"}}><label style={st.lbl}>Fornecedor</label><input style={st.inp} list="abatimentos-laboratorios" value={fLaboratorio} onChange={e=>setFLaboratorio(e.target.value)}/></div>
        <div style={{flex:"1 1 140px"}}><label style={st.lbl}>Nº do Boleto</label><input style={st.inp} value={fNf} onChange={e=>setFNf(e.target.value)}/></div>
        <div style={{flex:"1 1 160px"}}>
          <label style={st.lbl}>Filial</label>
          <select style={st.inp} value={fFilial} onChange={e=>setFFilial(e.target.value)}>
            <option value="todas">Todas</option>
            {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
          </select>
        </div>
        <div style={{flex:"1 1 170px"}}>
          <label style={st.lbl}>Tipo de Abatimento</label>
          <select style={st.inp} value={fTipo} onChange={e=>setFTipo(e.target.value)}>
            <option value="todos">Todos</option>
            {TIPOS_ABATIMENTO.map(t=><option key={t} value={t}>{t}</option>)}
            <option value="sem_tipo">Sem classificação</option>
          </select>
        </div>
        <div style={{flex:"1 1 150px"}}>
          <label style={st.lbl}>Situação</label>
          <select style={st.inp} value={fSituacao} onChange={e=>setFSituacao(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="REALIZADO">Realizados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>De</label><input type="date" style={st.inp} value={fDe} onChange={e=>setFDe(e.target.value)}/></div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>Até</label><input type="date" style={st.inp} value={fAte} onChange={e=>setFAte(e.target.value)}/></div>
      </div>

      <div className="bv-card" style={st.card}>
        {visiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhum abatimento encontrado.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Fornecedor","Filial","Tipo de Abatimento","Nº da NFD","Nº do Boleto","Percentual (%)","Valor do Abatimento","Data","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(a=>(
              <tr key={a.id} style={{borderBottom:"1px solid "+D.border,opacity:a.status==="CANCELADO"?0.55:1}}>
                <td data-label="Fornecedor" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{a.laboratorio}</td>
                <td data-label="Filial" style={{padding:"10px 8px",color:D.muted}}>{a.filial}</td>
                <td data-label="Tipo de Abatimento" style={{padding:"10px 8px",color:D.muted}}>{a.tipoAbatimento||"—"}</td>
                <td data-label="Nº da NFD" style={{padding:"10px 8px",color:D.text}}>{a.nfd||"—"}</td>
                <td data-label="Nº do Boleto" style={{padding:"10px 8px",color:D.text}}>{a.nf}</td>
                <td data-label="Percentual (%)" style={{padding:"10px 8px",color:D.muted}}>{fPercentual(a.percentual)}</td>
                <td data-label="Valor do Abatimento" style={{padding:"10px 8px",color:D.text,whiteSpace:"nowrap"}}>{fBRL(a.valorAbatimento)}</td>
                <td data-label="Data" style={{padding:"10px 8px",color:D.muted}}>{a.data?fData(a.data):"—"}</td>
                <td data-label="Status" style={{padding:"10px 8px"}}>
                  {a.status==="CANCELADO"?(
                    <span style={{fontSize:11,fontWeight:600,background:D.redSoft,color:D.redText,borderRadius:20,padding:"3px 10px"}}>Cancelado</span>
                  ):(
                    <select value={a.situacao} disabled={!podeEditar} onChange={e=>mudarSituacao(a,e.target.value)} title={podeEditar?"Alterar situação":undefined} style={{fontSize:11,fontWeight:600,background:a.situacao==="REALIZADO"?D.greenSoft:D.orangeSoft,color:a.situacao==="REALIZADO"?D.greenText:D.orangeText,border:"none",borderRadius:20,padding:"3px 10px",cursor:podeEditar?"pointer":"default",outline:"none"}}>
                      {SITUACOES_ABATIMENTO.map(s=><option key={s.valor} value={s.valor}>{s.label}</option>)}
                    </select>
                  )}
                  {a.status==="ATIVO"&&pedidoPorAbatimento[a.id]&&pedidoPorAbatimento[a.id].status==="PENDENTE"&&<div><span title={"Solicitado por "+pedidoPorAbatimento[a.id].solicitanteNome+" em "+fDataHoraBR(pedidoPorAbatimento[a.id].createdAt)+" — "+pedidoPorAbatimento[a.id].motivo} style={{display:"inline-block",marginTop:4,fontSize:10,fontWeight:600,background:D.orangeSoft,color:D.orangeText,borderRadius:20,padding:"2px 8px"}}>Cancelamento pendente</span></div>}
                  {a.status==="ATIVO"&&pedidoPorAbatimento[a.id]&&pedidoPorAbatimento[a.id].status==="RECUSADA"&&<div><span title={"Recusado por "+pedidoPorAbatimento[a.id].decididoPorNome+" em "+fDataHoraBR(pedidoPorAbatimento[a.id].decididoEm)+" — "+pedidoPorAbatimento[a.id].motivoRecusa} style={{display:"inline-block",marginTop:4,fontSize:10,fontWeight:600,background:D.redSoft,color:D.redText,borderRadius:20,padding:"2px 8px"}}>Cancelamento recusado</span><div style={{fontSize:11,fontWeight:400,color:D.muted,marginTop:3}}>Recusa: {pedidoPorAbatimento[a.id].motivoRecusa}</div></div>}
                </td>
                <td style={{padding:"10px 8px"}}>
                  {podeEditar&&(
                    <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                      <button style={{...st.btn,padding:"4px 8px",fontSize:11,opacity:pedidoPorAbatimento[a.id]&&pedidoPorAbatimento[a.id].status==="PENDENTE"?0.5:1}} title={pedidoPorAbatimento[a.id]&&pedidoPorAbatimento[a.id].status==="PENDENTE"?"Não é possível editar com cancelamento pendente":"Editar"} disabled={!!pedidoPorAbatimento[a.id]&&pedidoPorAbatimento[a.id].status==="PENDENTE"} onClick={()=>abrirEditar(a)}><Pencil size={12}/></button>
                      {a.status==="ATIVO"&&isAprovador&&<button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} title="Cancelar" onClick={()=>{setCancelando(a);setCancelMotivo("");setCancelErr("");}}><Ban size={12}/></button>}
                      {a.status==="ATIVO"&&!isAprovador&&!(pedidoPorAbatimento[a.id]&&pedidoPorAbatimento[a.id].status==="PENDENTE")&&<button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} title="Solicitar cancelamento" aria-label="Solicitar cancelamento" onClick={()=>abrirSolicitar(a)}><Ban size={12}/></button>}
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
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Fornecedor</label><input autoFocus style={st.inp} list="abatimentos-laboratorios" value={form.laboratorio} onChange={e=>{setForm(f=>({...f,laboratorio:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Filial</label>
                <select style={st.inp} value={form.filial} onChange={e=>{setForm(f=>({...f,filial:e.target.value}));setFormErr("");}}>
                  <option value="">Selecione...</option>
                  {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Tipo de Abatimento</label>
                <select style={st.inp} value={form.tipo} onChange={e=>{setForm(f=>({...f,tipo:e.target.value}));setFormErr("");}}>
                  <option value="">Selecione...</option>
                  {TIPOS_ABATIMENTO.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Nº da NFD (Nota Fiscal de Devolução)</label><input style={st.inp} placeholder="Opcional" value={form.nfd} onChange={e=>{setForm(f=>({...f,nfd:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Nº do Boleto</label><input style={st.inp} value={form.nf} onChange={e=>{setForm(f=>({...f,nf:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Percentual (%)</label><input style={st.inp} inputMode="decimal" placeholder="Opcional — ex.: 2 ou 2,5" value={form.percentual} onChange={e=>{setForm(f=>({...f,percentual:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Valor do Abatimento (R$)</label><CampoValor style={st.inp} value={form.valorAbatimento} onChange={v=>setForm(f=>({...f,valorAbatimento:v}))} onBlur={()=>setForm(f=>({...f,valorAbatimento:fMoedaInput(f.valorAbatimento)}))}/></div>
              <div><label style={st.lbl}>Valor Pago (R$) — opcional</label><CampoValor style={st.inp} value={form.valorPago} onChange={v=>setForm(f=>({...f,valorPago:v}))} onBlur={()=>setForm(f=>({...f,valorPago:fMoedaInput(f.valorPago)}))}/></div>
              <div><label style={st.lbl}>Data</label><input type="date" style={st.inp} value={form.data} onChange={e=>{setForm(f=>({...f,data:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Situação</label>
                <select style={st.inp} value={form.situacao} onChange={e=>setForm(f=>({...f,situacao:e.target.value}))}>
                  {SITUACOES_ABATIMENTO.map(s=><option key={s.valor} value={s.valor}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {formErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{formErr}</div>}

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={fecharForm}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvar} disabled={salvando}>{salvando?"Salvando...":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: confirmar cancelamento direto (só a Barbára) */}
      {cancelando&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:"1rem"}} onClick={fecharCancelar}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:16,padding:"1.6rem",maxWidth:380,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:44,height:44,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Ban size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:15,color:D.text,marginBottom:6}}>Cancelar abatimento?</div>
            <div style={{fontSize:13,color:D.muted,marginBottom:14}}>Boleto {cancelando.nf} — {cancelando.laboratorio}. O registro continua no histórico, marcado como cancelado, e sai dos totais.{pedidoPorAbatimento[cancelando.id]&&pedidoPorAbatimento[cancelando.id].status==="PENDENTE"?" Há uma solicitação pendente para este lançamento; ela será marcada como aprovada.":""}</div>
            <div style={{textAlign:"left",marginBottom:14}}>
              <label style={st.lbl}>Motivo (opcional)</label>
              <textarea style={{...st.inp,minHeight:64,resize:"vertical",fontFamily:"inherit"}} value={cancelMotivo} onChange={e=>{setCancelMotivo(e.target.value);setCancelErr("");}}/>
            </div>
            {cancelErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:14,display:"flex",alignItems:"center",gap:6,textAlign:"left"}}><AlertCircle size={13}/>{cancelErr}</div>}
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:13,color:D.text,fontWeight:500}} onClick={fecharCancelar}>Voltar</button>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600}} onClick={confirmarCancelar} disabled={cancelSalvando}>{cancelSalvando?"Cancelando...":"Cancelar abatimento"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: solicitar cancelamento (Financeiro — só a Barbára efetiva) */}
      {solicitando&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:16,padding:"1.6rem",maxWidth:460,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:44,height:44,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Send size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:15,color:D.text,marginBottom:6,textAlign:"center"}}>Solicitar cancelamento</div>
            <div style={{fontSize:13,color:D.muted,marginBottom:14,textAlign:"center"}}>O abatimento continua ativo até a aprovação da Barbára. Você acompanha o status aqui na lista.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 14px",background:D.bg,borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:13}}>
              <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:D.muted}}>Fornecedor (laboratório)</div><div style={{fontWeight:600,color:D.text}}>{solicitando.laboratorio}</div></div>
              <div><div style={{fontSize:11,color:D.muted}}>Nº do Boleto</div><div style={{fontWeight:600,color:D.text}}>{solicitando.nf}</div></div>
              <div><div style={{fontSize:11,color:D.muted}}>Filial</div><div style={{fontWeight:600,color:D.text}}>{solicitando.filial}</div></div>
              <div><div style={{fontSize:11,color:D.muted}}>Valor do abatimento</div><div style={{fontWeight:600,color:D.text}}>{fBRL(solicitando.valorAbatimento)}</div></div>
              <div><div style={{fontSize:11,color:D.muted}}>Valor pago</div><div style={{fontWeight:600,color:D.text}}>{fBRL(solicitando.valorPago)}</div></div>
              <div><div style={{fontSize:11,color:D.muted}}>Data</div><div style={{fontWeight:600,color:D.text}}>{solicitando.data?fData(solicitando.data):"—"}</div></div>
            </div>
            <label style={st.lbl}>Motivo do cancelamento *</label>
            <textarea autoFocus style={{...st.inp,minHeight:84,resize:"vertical",fontFamily:"inherit"}} placeholder="Explique por que este abatimento deve ser cancelado" value={solMotivo} onChange={e=>{setSolMotivo(e.target.value);setSolErr("");}}/>
            {solErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{solErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:13,color:D.text,fontWeight:500}} onClick={fecharSolicitar}>Voltar</button>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600}} onClick={confirmarSolicitar} disabled={solSalvando}>{solSalvando?"Enviando...":"Enviar solicitação"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
