import { useEffect, useState } from "react";
import { Plus, Search, Printer, AlertCircle, AlertTriangle, Save, ShieldAlert, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fBRL, fData, parseMoedaInput, fMoedaInput, mapAvariaRow, mapAvariaSolicitacaoRow, mapAvariaConcessaoRow, mapAvariaAplicacaoRow, nomeVisivel } from "../lib/helpers";
import { hoje, ESTADOS_FILIAL } from "../constants";
import { useDraggable } from "../lib/useDraggable";
import MCard from "./MCard";
import Donut from "./Donut";
import CampoValor from "./CampoValor";
import AvariaDetalhe from "./AvariaDetalhe";

const FORM_VAZIO = {id:null,filial:"",numeroNf:"",dataNf:"",produtoNome:"",produtoCodigo:"",quantidade:"",tipoAvaria:"",descricao:"",valorProduto:"",valorAvaria:"",dataIdentificacao:hoje,identificadoPor:"",observacoes:""};

const STATUS_LIST = ["ABERTA","SOLICITADO","EM_ANALISE","CONCEDIDO","NEGADO","APLICADO","CANCELADO"];
function statusInfo(s, D){
  return ({
    ABERTA: {label:"Aberta", bg:D.bg, c:D.muted, dot:D.muted},
    SOLICITADO: {label:"Solicitado", bg:D.blueSoft, c:D.blueText, dot:D.blue},
    EM_ANALISE: {label:"Em análise", bg:D.orangeSoft, c:D.orangeText, dot:D.orange},
    CONCEDIDO: {label:"Concedido", bg:D.greenSoft, c:D.greenText, dot:D.green},
    NEGADO: {label:"Negado", bg:D.redSoft, c:D.redText, dot:D.red},
    APLICADO: {label:"Aplicado", bg:D.purpleSoft, c:D.purpleText, dot:D.purple},
    CANCELADO: {label:"Cancelado", bg:D.bg, c:D.muted, dot:D.muted},
  })[s] || {label:s, bg:D.bg, c:D.muted, dot:D.muted};
}

function mensagemErroSalvarAvaria(error){
  console.error("Erro ao salvar avaria (avarias):", error);
  if(!error) return "Não foi possível salvar. Verifique os dados e tente novamente.";
  if(error.code==="42501") return "Você não tem permissão para registrar avarias. Fale com a administração do sistema.";
  if(error.code==="23502") return "Preencha todos os campos obrigatórios antes de salvar.";
  if(error.code==="23514") return "Um dos valores informados não é válido — confira filial, quantidade e valores.";
  return "Não foi possível salvar"+(error.code?" (código "+error.code+")":"")+". Se o problema continuar, informe esse código ao suporte.";
}

// Controle de Avarias — centraliza avaria de produto -> solicitação de
// desconto ao laboratório -> concessão -> aplicação na NF, com histórico e
// um alerta (não bloqueante) de possível duplicidade. Ver
// 20260924000000_create_avarias.sql e seguintes. Auto-contida (busca os
// próprios dados via useEffect), mesmo padrão de RH.tsx/Acessos.tsx — não
// entra no mega-fetch central de App.tsx. Clicar numa avaria abre o
// detalhe completo (AvariaDetalhe.tsx), igual RH.tsx abre
// FuncionarioPerfil.tsx.
export default function Avarias(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN, user = p.user;
  const isDemo = !!p.isDemo;
  const podeEditar = !isDemo;
  const usuarioNome = nomeVisivel(user);

  const [aba, setAba] = useState("historico");
  const [lista, setLista] = useState([]);
  const [solicitacoesAtuais, setSolicitacoesAtuais] = useState([]);
  const [concessoes, setConcessoes] = useState([]);
  const [aplicacoes, setAplicacoes] = useState([]);
  const [duplicidadesIds, setDuplicidadesIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avariaAbertaId, setAvariaAbertaId] = useState(null);

  const [busca, setBusca] = useState("");
  const [fFilial, setFFilial] = useState("todas");
  const [fNf, setFNf] = useState("");
  const [fProduto, setFProduto] = useState("");
  const [fCodigo, setFCodigo] = useState("");
  const [fLaboratorio, setFLaboratorio] = useState("");
  const [fResponsavel, setFResponsavel] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [fTipo, setFTipo] = useState("");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [dupMatches, setDupMatches] = useState([]);
  const { dragStyle, dragHandleProps, resetDrag } = useDraggable();

  const [dashFilial, setDashFilial] = useState("todas");

  async function carregar(){
    setLoading(true);
    const [av, sol, con, apl, dup] = await Promise.all([
      supabase.from("avarias").select("*").order("data_identificacao",{ascending:false}),
      supabase.from("avaria_solicitacoes_atual").select("*"),
      supabase.from("avaria_concessoes").select("*"),
      supabase.from("avaria_aplicacoes").select("*"),
      supabase.from("avaria_historico").select("avaria_id").eq("tipo","TENTATIVA_DUPLICIDADE"),
    ]);
    if(!av.error&&av.data) setLista(av.data.map(mapAvariaRow));
    if(!sol.error&&sol.data) setSolicitacoesAtuais(sol.data.map(mapAvariaSolicitacaoRow));
    if(!con.error&&con.data) setConcessoes(con.data.map(mapAvariaConcessaoRow));
    if(!apl.error&&apl.data) setAplicacoes(apl.data.map(mapAvariaAplicacaoRow));
    if(!dup.error&&dup.data) setDuplicidadesIds(Array.from(new Set(dup.data.map(d=>d.avaria_id))));
    setLoading(false);
  }

  useEffect(()=>{ carregar(); },[]);

  // Resumo derivado (laboratório/valor concedido/status da solicitação
  // atual), usado tanto na tabela quanto nos filtros — nunca uma consulta
  // extra, sempre montado a partir do que já foi carregado (mesmo
  // raciocínio de resumoDoFuncionario em RH.tsx).
  function resumoDaAvaria(avariaId){
    const sol = solicitacoesAtuais.find(s=>s.avariaId===avariaId) || null;
    const con = sol ? (concessoes.find(c=>c.solicitacaoId===sol.id) || null) : null;
    return { sol, con };
  }

  // Checagem de duplicidade — roda com um pequeno atraso a cada mudança
  // dos 4 campos que identificam a avaria (filial/NF/produto/tipo),
  // só enquanto o formulário de cadastro está aberto e só pra uma avaria
  // nova (edição não precisa checar duplicidade contra si mesma).
  useEffect(()=>{
    if(!showForm||form.id){ return; }
    let ativo = true;
    const temCampos = !!(form.filial&&form.numeroNf.trim()&&form.tipoAvaria.trim()&&(form.produtoCodigo.trim()||form.produtoNome.trim()));
    const t = setTimeout(async ()=>{
      if(!temCampos){ if(ativo) setDupMatches([]); return; }
      const { data, error } = await supabase.rpc("avarias_verificar_duplicidade", {
        p_filial: form.filial,
        p_numero_nf: form.numeroNf.trim(),
        p_produto_codigo: form.produtoCodigo.trim()||null,
        p_produto_nome: form.produtoNome.trim() ? "%"+form.produtoNome.trim()+"%" : null,
        p_tipo_avaria: form.tipoAvaria.trim(),
      });
      if(ativo) setDupMatches(!error&&data ? data : []);
    },temCampos?500:0);
    return ()=>{ ativo=false; clearTimeout(t); };
  },[showForm,form.id,form.filial,form.numeroNf,form.produtoCodigo,form.produtoNome,form.tipoAvaria]);

  // "Identificado por" já entra preenchido com quem está logado (o caso
  // mais comum é o próprio usuário do Financeiro/filial identificando a
  // avaria) — ainda editável, pra quando outra pessoa identificou e o
  // Financeiro só está lançando no sistema.
  function abrirNovo(){ setForm({...FORM_VAZIO, identificadoPor:usuarioNome||""}); setFormErr(""); setDupMatches([]); setShowForm(true); resetDrag(); }

  function abrirEditar(a){
    setForm({id:a.id,filial:a.filial,numeroNf:a.numeroNf,dataNf:a.dataNf,produtoNome:a.produtoNome,produtoCodigo:a.produtoCodigo,quantidade:String(a.quantidade),tipoAvaria:a.tipoAvaria,descricao:a.descricao,valorProduto:a.valorProduto!=null?fMoedaInput(a.valorProduto):"",valorAvaria:a.valorAvaria!=null?fMoedaInput(a.valorAvaria):"",dataIdentificacao:a.dataIdentificacao,identificadoPor:a.identificadoPor,observacoes:a.observacoes});
    setFormErr(""); setDupMatches([]); setShowForm(true); resetDrag();
  }

  function fecharForm(){ setShowForm(false); setFormErr(""); }

  // Reaproveita dado já digitado antes: ao sair do campo "Código do
  // produto", se já existe alguma avaria anterior com esse código e o
  // campo "Produto" ainda está vazio, preenche o nome sozinho — evita
  // digitar de novo um produto que já foi cadastrado antes. Nunca
  // sobrescreve o que a pessoa já digitou.
  function preencherProdutoPorCodigo(){
    const codigo = form.produtoCodigo.trim();
    if(!codigo||form.produtoNome.trim()) return;
    const anterior = lista.find(a=>(a.produtoCodigo||"").toLowerCase()===codigo.toLowerCase());
    if(anterior) setForm(f=>({...f, produtoNome:f.produtoNome.trim()?f.produtoNome:anterior.produtoNome}));
  }

  // Listas de sugestão (datalist) construídas a partir do que já foi
  // digitado antes neste módulo — não é uma lista fechada, só reduz
  // redigitação (pedido #12/#18: reaproveitar produto/NF já existentes).
  const produtosNomesConhecidos = Array.from(new Set(lista.map(a=>a.produtoNome).filter(Boolean)));
  const produtosCodigosConhecidos = Array.from(new Set(lista.map(a=>a.produtoCodigo).filter(Boolean)));
  const tiposAvariaConhecidos = Array.from(new Set(lista.map(a=>a.tipoAvaria).filter(Boolean)));

  async function registrarHistorico(avariaId, tipo, descricao, referenciaAvariaId=null){
    await supabase.from("avaria_historico").insert({
      avaria_id: avariaId, tipo, descricao, referencia_avaria_id: referenciaAvariaId,
      created_by: user?user.id:null, criado_por_nome: usuarioNome||null,
    });
  }

  async function salvar(){
    if(!form.filial){ setFormErr("Selecione a filial."); return; }
    if(!form.numeroNf.trim()){ setFormErr("Informe o número da NF."); return; }
    if(!form.produtoNome.trim()){ setFormErr("Informe o produto."); return; }
    const qtd = Number(String(form.quantidade).replace(",","."));
    if(!qtd||qtd<=0){ setFormErr("Informe uma quantidade válida."); return; }
    if(!form.tipoAvaria.trim()){ setFormErr("Informe o tipo de avaria."); return; }
    if(!form.identificadoPor.trim()){ setFormErr("Informe quem identificou a avaria."); return; }
    setSalvando(true); setFormErr("");
    const payload = {
      filial: form.filial,
      numero_nf: form.numeroNf.trim(),
      data_nf: form.dataNf||null,
      produto_nome: form.produtoNome.trim(),
      produto_codigo: form.produtoCodigo.trim()||null,
      quantidade: qtd,
      tipo_avaria: form.tipoAvaria.trim(),
      descricao: form.descricao.trim()||null,
      valor_produto: parseMoedaInput(form.valorProduto),
      valor_avaria: parseMoedaInput(form.valorAvaria),
      data_identificacao: form.dataIdentificacao||hoje,
      identificado_por: form.identificadoPor.trim(),
      observacoes: form.observacoes.trim()||null,
    };
    const query = form.id
      ? supabase.from("avarias").update(payload).eq("id",form.id).select().single()
      : supabase.from("avarias").insert({...payload, created_by:user?user.id:null, created_by_nome:usuarioNome||null}).select().single();
    const { data, error } = await query;
    setSalvando(false);
    if(error||!data){ setFormErr(mensagemErroSalvarAvaria(error)); return; }
    const linha = mapAvariaRow(data);
    setLista(prev=>{
      const semEla = prev.filter(a=>a.id!==linha.id);
      return [linha,...semEla].sort((a,b)=>(b.dataIdentificacao||"").localeCompare(a.dataIdentificacao||""));
    });
    const referencia = linha.numeroNf+" — "+linha.produtoNome;
    if(form.id){
      await registrarHistorico(linha.id, "AVARIA_EDITADA", "Dados da avaria atualizados.");
      addA("Avaria editada", referencia, "Dados atualizados");
    } else {
      await registrarHistorico(linha.id, "AVARIA_CRIADA", "Avaria cadastrada — NF "+linha.numeroNf+", "+linha.produtoNome+".");
      addA("Avaria cadastrada", referencia, "Filial "+linha.filial+(linha.valorAvaria!=null?", valor "+fBRL(linha.valorAvaria):""));
      addN("Nova avaria registrada: NF "+linha.numeroNf);
      if(dupMatches.length>0){
        const m = dupMatches[0];
        await registrarHistorico(linha.id, "TENTATIVA_DUPLICIDADE", "Possível duplicidade: avaria anterior já concedida para NF "+m.numero_nf+", produto "+m.produto_nome+".", m.avaria_id);
        setDuplicidadesIds(prev=>Array.from(new Set([...prev, linha.id])));
      }
    }
    fecharForm();
    if(!form.id) setAvariaAbertaId(linha.id);
  }

  function verHistoricoMatch(avariaId){
    setShowForm(false);
    setAvariaAbertaId(avariaId);
  }

  function matchesBusca(a, r, q){
    const s = q.toLowerCase();
    return a.numeroNf.toLowerCase().includes(s)
      || a.produtoNome.toLowerCase().includes(s)
      || (a.produtoCodigo||"").toLowerCase().includes(s)
      || (r.sol&&r.sol.protocolo||"").toLowerCase().includes(s);
  }

  const visiveis = lista.filter(a=>{
    const r = resumoDaAvaria(a.id);
    return (fFilial==="todas"||a.filial===fFilial)
      && (!fNf||a.numeroNf.toLowerCase().includes(fNf.toLowerCase()))
      && (!fProduto||a.produtoNome.toLowerCase().includes(fProduto.toLowerCase()))
      && (!fCodigo||(a.produtoCodigo||"").toLowerCase().includes(fCodigo.toLowerCase()))
      && (!fLaboratorio||(r.sol&&r.sol.laboratorio||"").toLowerCase().includes(fLaboratorio.toLowerCase()))
      && (!fResponsavel||(a.createdByNome||"").toLowerCase().includes(fResponsavel.toLowerCase())||(a.identificadoPor||"").toLowerCase().includes(fResponsavel.toLowerCase())||(r.sol&&r.sol.solicitanteNome||"").toLowerCase().includes(fResponsavel.toLowerCase()))
      && (fStatus==="todos"||a.status===fStatus)
      && (!fTipo||a.tipoAvaria.toLowerCase().includes(fTipo.toLowerCase()))
      && (!fDe||a.dataIdentificacao>=fDe)
      && (!fAte||a.dataIdentificacao<=fAte)
      && (!busca||matchesBusca(a,r,busca));
  });

  const avariaAberta = avariaAbertaId ? lista.find(a=>a.id===avariaAbertaId) : null;

  function voltarDoDetalhe(){
    setAvariaAbertaId(null);
    carregar();
  }

  // --- Impressão/exportação — mesmo padrão de imprimirProrrogacoes em
  // App.tsx (window.open + tabela HTML montada na mão + print), único
  // mecanismo de "exportação" já existente no projeto.
  function imprimirAvarias(){
    const w = window.open("","_blank");
    if(!w) return;
    w.opener = null;
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'/><style>@page{size:landscape;margin:1.2cm}body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#111}h1{font-size:14pt;margin:0 0 4px}.sub{font-size:9pt;color:#555;margin:2px 0}.meta{margin-bottom:14px}table{width:100%;table-layout:fixed;border-collapse:collapse}th,td{padding:5px 6px;text-align:left;border-bottom:1px solid #ddd;font-size:8.5pt;word-break:break-word;overflow-wrap:break-word}th{background:#f2f2f2;font-weight:600}thead{display:table-header-group}tr{page-break-inside:avoid}.r{margin-top:22px;font-size:8.5pt;color:#555;text-align:center;border-top:1px solid #ccc;padding-top:8px}@media print{button{display:none}}</style></head><body></body></html>");
    w.document.close();
    w.document.title = "Relatório de Avarias";
    const h1 = w.document.createElement("h1");
    h1.textContent = "BP-Visionn — Controle de Avarias";
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
      {h:"NF", get:a=>a.numeroNf},
      {h:"Filial", get:a=>a.filial},
      {h:"Produto", get:a=>a.produtoNome},
      {h:"Avaria", get:a=>a.tipoAvaria},
      {h:"Valor", get:a=>a.valorAvaria!=null?fBRL(a.valorAvaria):"—"},
      {h:"Desconto", get:(a,r)=>r.con&&r.con.status==="ATIVA"?fBRL(r.con.valorConcedido):"—"},
      {h:"Data", get:a=>a.dataIdentificacao?fData(a.dataIdentificacao):"—"},
      {h:"Laboratório", get:(a,r)=>r.sol?r.sol.laboratorio:"—"},
      {h:"Status", get:a=>statusInfo(a.status,D).label},
    ];
    const table = w.document.createElement("table");
    const thead = w.document.createElement("thead");
    const trh = w.document.createElement("tr");
    colunas.forEach(c=>{ const th=w.document.createElement("th"); th.textContent=c.h; trh.appendChild(th); });
    thead.appendChild(trh);
    const tbody = w.document.createElement("tbody");
    visiveis.forEach(a=>{
      const r = resumoDaAvaria(a.id);
      const tr = w.document.createElement("tr");
      colunas.forEach(c=>{ const td=w.document.createElement("td"); td.textContent=c.get(a,r)||"—"; tr.appendChild(td); });
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

  // --- Dashboard ---
  const dashLista = lista.filter(a=>dashFilial==="todas"||a.filial===dashFilial);
  const dashIds = new Set(dashLista.map(a=>a.id));
  // Só avarias não canceladas contam pra "Valor solicitado" — os outros
  // dois indicadores (concedido/aplicado) já filtravam por status ATIVA
  // nas próprias tabelas filhas; aqui o filtro é pela avaria-mãe, porque
  // avaria_solicitacoes não tem "cancelado" como reflexo direto do
  // cancelamento da avaria (uma solicitação pode continuar SOLICITADO
  // mesmo depois da avaria virar CANCELADO por outro caminho).
  const dashIdsAtivas = new Set(dashLista.filter(a=>a.status!=="CANCELADO").map(a=>a.id));
  // Concessões/aplicações canceladas não contam nos indicadores nem nos
  // totais — o registro continua existindo (rastreabilidade), mas não
  // representa mais um desconto vigente.
  const kpis = {
    abertas: dashLista.filter(a=>a.status==="ABERTA").length,
    emAnalise: dashLista.filter(a=>a.status==="EM_ANALISE").length,
    concedidos: dashLista.filter(a=>concessoes.some(c=>c.avariaId===a.id&&c.status==="ATIVA")).length,
    negados: dashLista.filter(a=>a.status==="NEGADO").length,
    aplicados: dashLista.filter(a=>a.status==="APLICADO").length,
    duplicidades: dashLista.filter(a=>duplicidadesIds.includes(a.id)).length,
  };
  const valorSolicitado = solicitacoesAtuais.filter(s=>dashIdsAtivas.has(s.avariaId)).reduce((sum,s)=>sum+(s.valorSolicitado||0),0);
  const valorConcedido = concessoes.filter(c=>dashIds.has(c.avariaId)&&c.status==="ATIVA").reduce((sum,c)=>sum+(c.valorConcedido||0),0);
  const valorAplicado = aplicacoes.filter(a=>dashIds.has(a.avariaId)&&a.status==="ATIVA").reduce((sum,a)=>sum+(a.valorAplicado||0),0);
  const statusData = STATUS_LIST.map(s=>({label:statusInfo(s,D).label, value:dashLista.filter(a=>a.status===s).length, color:statusInfo(s,D).dot}));

  return (
    <div>
      {avariaAberta ? (
        <AvariaDetalhe
          avaria={avariaAberta}
          D={D} st={st} addA={addA} addN={addN} user={user} isDemo={isDemo}
          onVoltar={voltarDoDetalhe}
          onEditar={podeEditar?()=>abrirEditar(avariaAberta):undefined}
        />
      ) : (
      <>
      <div style={{display:"flex",gap:4,marginBottom:20,background:D.bg,borderRadius:10,padding:4,width:"fit-content",flexWrap:"wrap"}}>
        {[{id:"historico",label:"📋 Histórico de Avarias"},{id:"dashboard",label:"📊 Dashboard"}].map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:aba===a.id?600:400,background:aba===a.id?D.white:"transparent",color:aba===a.id?D.text:D.muted}}>{a.label}</button>
        ))}
      </div>

      {aba==="dashboard"?(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={{fontSize:20,fontWeight:700,color:D.text}}>Dashboard de Avarias</div>
            <select style={{...st.inp,width:"auto"}} value={dashFilial} onChange={e=>setDashFilial(e.target.value)}>
              <option value="todas">Todas as filiais</option>
              {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:14}}>
            <MCard D={D} Icon={AlertTriangle} bg={D.bg} color={D.muted} value={kpis.abertas} label="Avarias abertas"/>
            <MCard D={D} Icon={AlertTriangle} bg={D.orangeSoft} color={D.orange} value={kpis.emAnalise} label="Em análise"/>
            <MCard D={D} Icon={ShieldAlert} bg={D.greenSoft} color={D.green} value={kpis.concedidos} label="Descontos concedidos"/>
            <MCard D={D} Icon={ShieldAlert} bg={D.redSoft} color={D.red} value={kpis.negados} label="Descontos negados"/>
            <MCard D={D} Icon={ShieldAlert} bg={D.purpleSoft} color={D.purple} value={kpis.aplicados} label="Descontos aplicados"/>
            <MCard D={D} Icon={AlertTriangle} bg={D.orangeSoft} color={D.orange} value={kpis.duplicidades} label="Possíveis duplicidades"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:14}}>
            <MCard D={D} Icon={ShieldAlert} bg={D.blueSoft} color={D.blue} value={fBRL(valorSolicitado)} label="Valor solicitado"/>
            <MCard D={D} Icon={ShieldAlert} bg={D.greenSoft} color={D.green} value={fBRL(valorConcedido)} label="Valor concedido"/>
            <MCard D={D} Icon={ShieldAlert} bg={D.purpleSoft} color={D.purple} value={fBRL(valorAplicado)} label="Valor aplicado"/>
          </div>
          <div className="bv-card" style={{...st.card,display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
            <Donut D={D} size={140} data={statusData}/>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {statusData.filter(s=>s.value>0).map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:s.color}}/>
                  <span style={{color:D.text}}>{s.label}</span>
                  <span style={{color:D.muted}}>— {s.value}</span>
                </div>
              ))}
              {statusData.every(s=>s.value===0)&&<div style={{fontSize:13,color:D.muted}}>Nenhuma avaria registrada nesta filial ainda.</div>}
            </div>
          </div>
        </div>
      ):loading?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando avarias...</div>
      ):(
      <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Controle de Avarias</div><div style={{fontSize:13,color:D.muted}}>{visiveis.length} avaria(s)</div></div>
        <div style={{display:"flex",gap:8}}>
          <button style={st.btn} onClick={imprimirAvarias}><Printer size={14}/>Exportar</button>
          {podeEditar&&<button style={st.btnBlue} onClick={abrirNovo}><Plus size={15}/>Nova Avaria</button>}
        </div>
      </div>

      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 240px"}}>
          <label style={st.lbl}>Busca rápida</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="NF, produto, código ou protocolo" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
        </div>
        <div style={{flex:"1 1 160px"}}>
          <label style={st.lbl}>Filial</label>
          <select style={st.inp} value={fFilial} onChange={e=>setFFilial(e.target.value)}>
            <option value="todas">Todas</option>
            {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
          </select>
        </div>
        <div style={{flex:"1 1 140px"}}>
          <label style={st.lbl}>Status</label>
          <select style={st.inp} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
            <option value="todos">Todos</option>
            {STATUS_LIST.map(s=><option key={s} value={s}>{statusInfo(s,D).label}</option>)}
          </select>
        </div>
      </div>

      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 140px"}}><label style={st.lbl}>NF</label><input style={st.inp} value={fNf} onChange={e=>setFNf(e.target.value)}/></div>
        <div style={{flex:"1 1 160px"}}><label style={st.lbl}>Produto</label><input style={st.inp} value={fProduto} onChange={e=>setFProduto(e.target.value)}/></div>
        <div style={{flex:"1 1 140px"}}><label style={st.lbl}>Código do produto</label><input style={st.inp} value={fCodigo} onChange={e=>setFCodigo(e.target.value)}/></div>
        <div style={{flex:"1 1 160px"}}><label style={st.lbl}>Laboratório</label><input style={st.inp} value={fLaboratorio} onChange={e=>setFLaboratorio(e.target.value)}/></div>
        <div style={{flex:"1 1 160px"}}><label style={st.lbl}>Responsável</label><input style={st.inp} value={fResponsavel} onChange={e=>setFResponsavel(e.target.value)}/></div>
        <div style={{flex:"1 1 140px"}}><label style={st.lbl}>Tipo de avaria</label><input style={st.inp} value={fTipo} onChange={e=>setFTipo(e.target.value)}/></div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>De</label><input type="date" style={st.inp} value={fDe} onChange={e=>setFDe(e.target.value)}/></div>
        <div style={{flex:"1 1 130px"}}><label style={st.lbl}>Até</label><input type="date" style={st.inp} value={fAte} onChange={e=>setFAte(e.target.value)}/></div>
      </div>

      <div className="bv-card" style={st.card}>
        {visiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhuma avaria encontrada.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["NF","Filial","Produto","Avaria","Valor","Desconto","Data","Laboratório","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(a=>{
              const r = resumoDaAvaria(a.id);
              const si = statusInfo(a.status,D);
              return (
              <tr key={a.id} style={{borderBottom:"1px solid "+D.border,cursor:"pointer"}} onClick={()=>setAvariaAbertaId(a.id)}>
                <td data-label="NF" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{a.numeroNf}</td>
                <td data-label="Filial" style={{padding:"10px 8px",color:D.muted}}>{a.filial}</td>
                <td data-label="Produto" style={{padding:"10px 8px",color:D.text}}>{a.produtoNome}{a.produtoCodigo?<span style={{color:D.muted}}> ({a.produtoCodigo})</span>:null}</td>
                <td data-label="Avaria" style={{padding:"10px 8px",color:D.muted}}>{a.tipoAvaria}</td>
                <td data-label="Valor" style={{padding:"10px 8px",color:D.muted}}>{a.valorAvaria!=null?fBRL(a.valorAvaria):"—"}</td>
                <td data-label="Desconto" style={{padding:"10px 8px",color:D.text,fontWeight:600}}>{r.con&&r.con.status==="ATIVA"?fBRL(r.con.valorConcedido):"—"}</td>
                <td data-label="Data" style={{padding:"10px 8px",color:D.muted}}>{a.dataIdentificacao?fData(a.dataIdentificacao):"—"}</td>
                <td data-label="Laboratório" style={{padding:"10px 8px",color:D.muted}}>{r.sol?r.sol.laboratorio:"—"}</td>
                <td data-label="Status" style={{padding:"10px 8px"}}>
                  <span style={{fontSize:11,fontWeight:600,background:si.bg,color:si.c,borderRadius:20,padding:"3px 10px"}}>{si.label}</span>
                  {duplicidadesIds.includes(a.id)&&<AlertTriangle size={12} color={D.orange} style={{marginLeft:6,verticalAlign:"middle"}}/>}
                </td>
              </tr>
              );
            })}</tbody>
          </table>
          </div>
        )}
      </div>
      </>
      )}
      </>
      )}

      {/* MODAL: nova avaria / editar avaria */}
      {showForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:680,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",...dragStyle}} onClick={e=>e.stopPropagation()}>
            <div {...dragHandleProps}>
              <div style={{width:48,height:48,borderRadius:12,background:D.orangeSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><ShieldAlert size={22} color={D.orange}/></div>
              <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{form.id?"Editar Avaria":"Nova Avaria"}</div>
              <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>{form.id?"Atualize os dados da avaria.":"Cadastre uma avaria identificada em uma NF."}</div>
            </div>

            {!form.id&&dupMatches.length>0&&(
              <div style={{background:D.orangeSoft,border:"1px solid "+D.orange+"55",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:6,fontWeight:700,fontSize:13,color:D.orangeText,marginBottom:8}}><AlertTriangle size={14}/>Possível desconto já concedido</div>
                {dupMatches.map((m,i)=>(
                  <div key={i} style={{fontSize:12.5,color:D.orangeText,marginBottom:i<dupMatches.length-1?10:0}}>
                    Esta avaria possui um registro anterior de concessão.<br/>
                    NF: {m.numero_nf} — Produto: {m.produto_nome}{m.produto_codigo?" ("+m.produto_codigo+")":""}<br/>
                    Avaria: {m.tipo_avaria} — Desconto concedido: {fBRL(m.valor_concedido)}<br/>
                    Data da concessão: {m.data_concessao?fData(m.data_concessao):"—"} — Laboratório: {m.laboratorio}<br/>
                    Solicitado por: {m.solicitante_nome||"—"}
                    <div style={{marginTop:4}}><button style={{background:"none",border:"none",cursor:"pointer",color:D.orangeText,fontSize:12,fontWeight:600,textDecoration:"underline",padding:0,display:"inline-flex",alignItems:"center",gap:4}} onClick={()=>verHistoricoMatch(m.avaria_id)}><ExternalLink size={11}/>Ver histórico</button></div>
                  </div>
                ))}
                <div style={{fontSize:11.5,color:D.orangeText,marginTop:8,fontStyle:"italic"}}>Você pode continuar a solicitação normalmente — pode haver uma situação legítima que exija um novo pedido. A tentativa será registrada no histórico desta avaria.</div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div><label style={st.lbl}>Filial</label>
                <select style={st.inp} value={form.filial} onChange={e=>{setForm(f=>({...f,filial:e.target.value}));setFormErr("");}}>
                  <option value="">Selecione...</option>
                  {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Número da NF</label><input autoFocus style={st.inp} value={form.numeroNf} onChange={e=>{setForm(f=>({...f,numeroNf:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Data da NF</label><input type="date" style={st.inp} value={form.dataNf} onChange={e=>setForm(f=>({...f,dataNf:e.target.value}))}/></div>
              <div><label style={st.lbl}>Produto</label><input style={st.inp} list="avarias-produtos-nomes" value={form.produtoNome} onChange={e=>{setForm(f=>({...f,produtoNome:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Código do produto</label><input style={st.inp} list="avarias-produtos-codigos" value={form.produtoCodigo} onChange={e=>setForm(f=>({...f,produtoCodigo:e.target.value}))} onBlur={preencherProdutoPorCodigo}/></div>
              <div><label style={st.lbl}>Quantidade</label><input type="number" min="0" step="1" style={st.inp} value={form.quantidade} onChange={e=>{setForm(f=>({...f,quantidade:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Tipo de avaria</label><input style={st.inp} list="avarias-tipos" placeholder="Ex.: Tela danificada" value={form.tipoAvaria} onChange={e=>{setForm(f=>({...f,tipoAvaria:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Data da identificação</label><input type="date" style={st.inp} value={form.dataIdentificacao} onChange={e=>setForm(f=>({...f,dataIdentificacao:e.target.value}))}/></div>
              <div><label style={st.lbl}>Identificado por</label><input style={st.inp} value={form.identificadoPor} onChange={e=>{setForm(f=>({...f,identificadoPor:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Valor do produto (R$)</label><CampoValor style={st.inp} value={form.valorProduto} onChange={v=>setForm(f=>({...f,valorProduto:v}))} onBlur={()=>setForm(f=>({...f,valorProduto:fMoedaInput(f.valorProduto)}))}/></div>
              <div><label style={st.lbl}>Valor da avaria (R$)</label><CampoValor style={st.inp} value={form.valorAvaria} onChange={v=>setForm(f=>({...f,valorAvaria:v}))} onBlur={()=>setForm(f=>({...f,valorAvaria:fMoedaInput(f.valorAvaria)}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Descrição da avaria</label><textarea rows={2} style={{...st.inp,resize:"vertical"}} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Observações</label><textarea rows={2} style={{...st.inp,resize:"vertical"}} value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>

            <datalist id="avarias-produtos-nomes">{produtosNomesConhecidos.map(v=><option key={v} value={v}/>)}</datalist>
            <datalist id="avarias-produtos-codigos">{produtosCodigosConhecidos.map(v=><option key={v} value={v}/>)}</datalist>
            <datalist id="avarias-tipos">{tiposAvariaConhecidos.map(v=><option key={v} value={v}/>)}</datalist>

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
