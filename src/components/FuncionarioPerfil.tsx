import { useEffect, useState } from "react";
import { ArrowLeft, User, DollarSign, CalendarClock, Stethoscope, FileText, History, StickyNote, Pencil, Plus, Save, AlertCircle, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fData, fBRL, fTempoDeEmpresa, parseMoedaInput, fMoedaInput, sanitizarMoedaInput, mapSalarioRow, mapExameRow, mapDocumentoRow, mapOcorrenciaRow, mapFeriasRow, situacaoExame } from "../lib/helpers";
import { hoje } from "../constants";
import Av from "./Av";
import Ferias from "./Ferias";

const DOC_TIPOS = ["Exame periódico","Atestado","Documento","Comprovante","Advertência","Outro"];
const OCO_TIPOS = ["Observação","Exame","Férias","Salário","Documento","Advertência","Elogio","Outro"];

const EXAME_FORM_VAZIO = {ano:String(new Date().getFullYear()),dataExame:"",dataProximoExame:"",status:"Pendente",observacoes:""};
const DOC_FORM_VAZIO = {tipo:"Documento",data:hoje,descricao:"",observacoes:""};
const OCO_FORM_VAZIO = {data:hoje,tipo:"Observação",descricao:"",observacoes:""};

function corSituacaoExame(s,D){
  return ({
    "Realizado": {bg:D.greenSoft,c:D.greenText},
    "Pendente": {bg:D.bg,c:D.muted},
    "Atrasado": {bg:D.redSoft,c:D.redText},
    "Próximo do vencimento": {bg:D.orangeSoft,c:D.orangeText},
  })[s] || {bg:D.bg,c:D.muted};
}

const TABS = [
  {id:"resumo",label:"Resumo",Icon:User},
  {id:"dados",label:"Dados",Icon:User},
  {id:"salario",label:"Salário",Icon:DollarSign},
  {id:"ferias",label:"Férias",Icon:CalendarClock},
  {id:"exames",label:"Exames",Icon:Stethoscope},
  {id:"documentos",label:"Documentos",Icon:FileText},
  {id:"historico",label:"Histórico",Icon:History},
  {id:"observacoes",label:"Observações",Icon:StickyNote},
];

// Perfil completo do funcionário — substitui o antigo modal de "detalhes"
// de RH.tsx por um painel próprio com abas. Dados cadastrais (nome/cargo/
// CPF/etc.) continuam editados pelo mesmo formulário de sempre (ver
// onEditar, que abre o modal já existente em RH.tsx) — este componente só
// adiciona as informações que RH.tsx não tinha: salário (com histórico),
// exames periódicos, documentos/evidências e uma linha do tempo de
// ocorrências (tabelas novas, ver 20260915000000_rh_perfil_completo.sql).
// A aba Férias reaproveita o componente Ferias.tsx de sempre, só travado
// neste funcionário (prop funcionarioFixo) — zero lógica de férias
// duplicada aqui.
export default function FuncionarioPerfil(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN, funcionario = p.funcionario;
  const onVoltar = p.onVoltar, onEditar = p.onEditar, usuarioNome = p.usuarioNome;
  const [aba, setAba] = useState("resumo");
  const [loading, setLoading] = useState(true);
  const [salarios, setSalarios] = useState([]);
  const [exames, setExames] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [ultimaFerias, setUltimaFerias] = useState(null);

  useEffect(()=>{
    let ativo = true;
    async function carregarTudo(){
      setLoading(true);
      const [sal, ex, doc, oco, fer] = await Promise.all([
        supabase.from("funcionario_salarios").select("*").eq("funcionario_id",funcionario.id).order("data_alteracao",{ascending:false}),
        supabase.from("funcionario_exames").select("*").eq("funcionario_id",funcionario.id).order("ano",{ascending:false}),
        supabase.from("funcionario_documentos").select("*").eq("funcionario_id",funcionario.id).order("data",{ascending:false}),
        supabase.from("funcionario_ocorrencias").select("*").eq("funcionario_id",funcionario.id).order("data",{ascending:false}).order("created_at",{ascending:false}),
        supabase.from("ferias").select("*").eq("funcionario_id",funcionario.id).order("periodo_aquisitivo_inicio",{ascending:false}).limit(1),
      ]);
      if(!ativo) return;
      if(sal.data) setSalarios(sal.data.map(mapSalarioRow));
      if(ex.data) setExames(ex.data.map(mapExameRow));
      if(doc.data) setDocumentos(doc.data.map(mapDocumentoRow));
      if(oco.data) setOcorrencias(oco.data.map(mapOcorrenciaRow));
      if(fer.data) setUltimaFerias(fer.data.length?mapFeriasRow(fer.data[0]):null);
      setLoading(false);
    }
    carregarTudo();
    return ()=>{ ativo = false; };
  },[funcionario.id]);

  // Insere uma linha na linha do tempo do funcionário — chamada tanto
  // automaticamente (depois de salvar salário/exame/documento/férias)
  // quanto manualmente (formulário da própria aba Histórico).
  async function registrarOcorrencia(tipo, descricao, opts?: {data?:string, observacoes?:string}){
    const extra = opts||{};
    const payload = { funcionario_id:funcionario.id, tipo, descricao, data: extra.data||hoje, observacoes: extra.observacoes||null, criado_por_nome: usuarioNome||null };
    const { data, error } = await supabase.from("funcionario_ocorrencias").insert(payload).select().single();
    if(!error&&data){
      const linha = mapOcorrenciaRow(data);
      setOcorrencias(prev=>[linha,...prev].sort((a,b)=>(b.data||"").localeCompare(a.data||"")||(b.createdAt||"").localeCompare(a.createdAt||"")));
    }
  }

  const salarioAtual = salarios.length ? salarios[0] : null;
  const ultimoExame = exames.length ? exames.slice().sort((a,b)=>b.ano-a.ano)[0] : null;
  const situacaoExameAtual = ultimoExame ? situacaoExame(ultimoExame) : "Sem registro";

  const alertas = [];
  if(situacaoExameAtual==="Atrasado") alertas.push("Exame periódico atrasado");
  if(situacaoExameAtual==="Próximo do vencimento") alertas.push("Exame periódico próximo do vencimento");
  if(ultimaFerias&&ultimaFerias.status==="Pendente") alertas.push("Férias pendentes de agendamento");
  if(funcionario.status==="Inativo") alertas.push("Funcionário inativo");

  // --- Salário ---------------------------------------------------------
  const [salForm, setSalForm] = useState({dataAlteracao:hoje,valor:"",motivo:""});
  const [salErr, setSalErr] = useState("");
  const [salSalvando, setSalSalvando] = useState(false);

  async function salvarSalario(){
    const valorNum = parseMoedaInput(salForm.valor);
    if(valorNum==null||valorNum<0){ setSalErr("Informe um valor válido."); return; }
    setSalSalvando(true); setSalErr("");
    const payload = { funcionario_id:funcionario.id, data_alteracao: salForm.dataAlteracao||hoje, valor:valorNum, motivo: salForm.motivo.trim()||null };
    const { data, error } = await supabase.from("funcionario_salarios").insert(payload).select().single();
    setSalSalvando(false);
    if(error||!data){ setSalErr("Não foi possível salvar. Verifique os dados e tente novamente."); return; }
    const linha = mapSalarioRow(data);
    setSalarios(prev=>[linha,...prev].sort((a,b)=>(b.dataAlteracao||"").localeCompare(a.dataAlteracao||"")||(b.createdAt||"").localeCompare(a.createdAt||"")));
    addA("Alteração salarial", funcionario.nome, "Novo valor: "+fBRL(valorNum)+(linha.motivo?" — "+linha.motivo:""));
    addN("Salário atualizado: "+funcionario.nome);
    registrarOcorrencia("Salário", "Alteração salarial registrada — novo valor "+fBRL(valorNum)+(linha.motivo?" ("+linha.motivo+")":"")+".", {data:linha.dataAlteracao});
    setSalForm({dataAlteracao:hoje,valor:"",motivo:""});
  }

  // --- Exames ------------------------------------------------------------
  const [showExameForm, setShowExameForm] = useState(false);
  const [exForm, setExForm] = useState(EXAME_FORM_VAZIO);
  const [exEditandoId, setExEditandoId] = useState(null);
  const [exErr, setExErr] = useState("");
  const [exSalvando, setExSalvando] = useState(false);

  function abrirNovoExame(){ setExForm(EXAME_FORM_VAZIO); setExEditandoId(null); setExErr(""); setShowExameForm(true); }
  function abrirEditarExame(e){ setExForm({ano:String(e.ano),dataExame:e.dataExame,dataProximoExame:e.dataProximoExame,status:e.status,observacoes:e.observacoes}); setExEditandoId(e.id); setExErr(""); setShowExameForm(true); }

  async function salvarExame(){
    const ano = Number(exForm.ano);
    if(!ano){ setExErr("Informe o ano do exame."); return; }
    setExSalvando(true); setExErr("");
    const payload = { funcionario_id:funcionario.id, ano, data_exame:exForm.dataExame||null, data_proximo_exame:exForm.dataProximoExame||null, status:exForm.status, observacoes:exForm.observacoes.trim()||null };
    const query = exEditandoId
      ? supabase.from("funcionario_exames").update(payload).eq("id",exEditandoId).select().single()
      : supabase.from("funcionario_exames").insert(payload).select().single();
    const { data, error } = await query;
    setExSalvando(false);
    if(error||!data){ setExErr(error&&error.code==="23505"?"Já existe um registro de exame para esse ano.":"Não foi possível salvar."); return; }
    const linha = mapExameRow(data);
    setExames(prev=>{ const semEle=prev.filter(x=>x.id!==linha.id); return [...semEle,linha].sort((a,b)=>b.ano-a.ano); });
    addA("Exame periódico", funcionario.nome, "Ano "+linha.ano+" — "+linha.status);
    addN("Exame periódico registrado: "+funcionario.nome);
    registrarOcorrencia("Exame periódico", "Exame periódico de "+linha.ano+" registrado como "+linha.status+".");
    setShowExameForm(false);
  }

  // --- Documentos ----------------------------------------------------
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState(DOC_FORM_VAZIO);
  const [docErr, setDocErr] = useState("");
  const [docSalvando, setDocSalvando] = useState(false);

  function abrirNovoDocumento(){ setDocForm(DOC_FORM_VAZIO); setDocErr(""); setShowDocForm(true); }

  async function salvarDocumento(){
    if(!docForm.data){ setDocErr("Informe a data."); return; }
    setDocSalvando(true); setDocErr("");
    const payload = { funcionario_id:funcionario.id, tipo:docForm.tipo, data:docForm.data, descricao:docForm.descricao.trim()||null, observacoes:docForm.observacoes.trim()||null };
    const { data, error } = await supabase.from("funcionario_documentos").insert(payload).select().single();
    setDocSalvando(false);
    if(error||!data){ setDocErr("Não foi possível salvar. Tente novamente."); return; }
    const linha = mapDocumentoRow(data);
    setDocumentos(prev=>[linha,...prev].sort((a,b)=>(b.data||"").localeCompare(a.data||"")));
    addA("Documento registrado", funcionario.nome, linha.tipo+(linha.descricao?" — "+linha.descricao:""));
    addN("Documento registrado: "+funcionario.nome);
    registrarOcorrencia("Documento", "Documento registrado: "+linha.tipo+(linha.descricao?" — "+linha.descricao:"")+".", {data:linha.data});
    setShowDocForm(false);
  }

  // --- Histórico (ocorrências manuais) ---------------------------------
  const [showOcoForm, setShowOcoForm] = useState(false);
  const [ocoForm, setOcoForm] = useState(OCO_FORM_VAZIO);
  const [ocoErr, setOcoErr] = useState("");
  const [ocoSalvando, setOcoSalvando] = useState(false);

  async function salvarOcorrenciaManual(){
    if(!ocoForm.descricao.trim()){ setOcoErr("Descreva o que aconteceu."); return; }
    setOcoSalvando(true); setOcoErr("");
    await registrarOcorrencia(ocoForm.tipo, ocoForm.descricao.trim(), {data:ocoForm.data||hoje, observacoes:ocoForm.observacoes.trim()||null});
    setOcoSalvando(false);
    addA("Ocorrência registrada", funcionario.nome, ocoForm.tipo);
    setOcoForm(OCO_FORM_VAZIO);
    setShowOcoForm(false);
  }

  const rInp = st.inp, rLbl = st.lbl;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onVoltar} style={{...st.btn,padding:"8px 10px"}} title="Voltar"><ArrowLeft size={16}/></button>
          <Av name={funcionario.nome} color={D.blue} size={46}/>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:D.text}}>{funcionario.nome}</div>
            <div style={{fontSize:12.5,color:D.muted}}>{funcionario.cargo||"Cargo não informado"}{funcionario.setor?" — "+funcionario.setor:""}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:600,background:funcionario.status==="Ativo"?D.greenSoft:D.redSoft,color:funcionario.status==="Ativo"?D.greenText:D.redText,borderRadius:20,padding:"4px 12px"}}>{funcionario.status}</span>
          <button style={st.btn} onClick={onEditar}><Pencil size={13}/>Editar dados</button>
        </div>
      </div>

      <div style={{display:"flex",gap:4,marginBottom:20,background:D.bg,borderRadius:10,padding:4,width:"fit-content",flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setAba(t.id)} style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:aba===t.id?600:400,background:aba===t.id?D.white:"transparent",color:aba===t.id?D.text:D.muted,display:"flex",alignItems:"center",gap:6}}><t.Icon size={14}/>{t.label}</button>
        ))}
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando perfil...</div>
      ):(<>

      {/* RESUMO */}
      {aba==="resumo"&&(
        <div>
          {alertas.length>0&&(
            <div className="bv-card" style={{...st.card,borderColor:D.orange+"55"}}>
              <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={13} color={D.orange}/>Alertas</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {alertas.map((a,i)=>(
                  <div key={i} style={{fontSize:13,color:D.orangeText,background:D.orangeSoft,borderRadius:8,padding:"7px 10px"}}>{a}</div>
                ))}
              </div>
            </div>
          )}

          <div className="bv-card" style={st.card}>
            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Resumo</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
              {[
                {label:"Cargo", value:funcionario.cargo||"—"},
                {label:"Setor", value:funcionario.setor||"—"},
                {label:"Status", value:funcionario.status},
                {label:"Admissão", value:funcionario.dataEntrada?fData(funcionario.dataEntrada):"—"},
                {label:"Tempo de empresa", value:fTempoDeEmpresa(funcionario.dataEntrada)},
                {label:"Salário atual", value:salarioAtual?fBRL(salarioAtual.valor):"Não informado"},
                {label:"Próximo exame periódico", value:ultimoExame&&ultimoExame.dataProximoExame?fData(ultimoExame.dataProximoExame):"—"},
                {label:"Situação das férias", value:ultimaFerias?ultimaFerias.status:"Sem registro"},
              ].map(r=>(
                <div key={r.label}>
                  <div style={{fontSize:11,color:D.muted,marginBottom:2}}>{r.label}</div>
                  <div style={{fontSize:14,color:D.text,fontWeight:600}}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
            <div className="bv-card" style={st.card}>
              <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Últimas ocorrências</div>
              {ocorrencias.length===0?<div style={{fontSize:13,color:D.muted}}>Nenhuma ocorrência registrada.</div>:(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {ocorrencias.slice(0,4).map(o=>(
                    <div key={o.id}>
                      <div style={{fontSize:12.5,color:D.text,fontWeight:600}}>{o.tipo} — {fData(o.data)}</div>
                      <div style={{fontSize:12,color:D.muted}}>{o.descricao}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bv-card" style={st.card}>
              <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Últimos registros</div>
              {documentos.length===0?<div style={{fontSize:13,color:D.muted}}>Nenhum documento registrado.</div>:(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {documentos.slice(0,4).map(d=>(
                    <div key={d.id}>
                      <div style={{fontSize:12.5,color:D.text,fontWeight:600}}>{d.tipo} — {fData(d.data)}</div>
                      {d.descricao&&<div style={{fontSize:12,color:D.muted}}>{d.descricao}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DADOS */}
      {aba==="dados"&&(
        <div className="bv-card" style={st.card}>
          <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Dados cadastrais</div>
          <div style={{background:D.bg,borderRadius:10,padding:"4px 14px"}}>
            {[
              {label:"Nome completo", value:funcionario.nome},
              {label:"CPF", value:funcionario.cpf||"—"},
              {label:"Data de nascimento", value:funcionario.dataNascimento?fData(funcionario.dataNascimento):"—"},
              {label:"Telefone", value:funcionario.telefone||"—"},
              {label:"E-mail", value:funcionario.email||"—"},
              {label:"Cargo", value:funcionario.cargo||"—"},
              {label:"Setor", value:funcionario.setor||"—"},
              {label:"Estado/Filial", value:funcionario.estadoFilial||"—"},
              {label:"Data de admissão", value:funcionario.dataEntrada?fData(funcionario.dataEntrada):"—"},
              {label:"Tipo de vínculo", value:funcionario.tipoVinculo},
              {label:"Vale-Transporte", value:funcionario.valeTransporte?"Sim":"Não"},
              {label:"Vale-Refeição", value:funcionario.valeRefeicao?"Sim":"Não"},
              {label:"Status", value:funcionario.status},
              {label:"Data de saída", value:funcionario.dataSaida?fData(funcionario.dataSaida):"—"},
            ].map((r,i)=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderTop:i>0?"1px solid "+D.border:"none",gap:10}}>
                <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
                <span style={{fontSize:13,color:D.text,fontWeight:600,textAlign:"right"}}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SALÁRIO */}
      {aba==="salario"&&(
        <div>
          <div className="bv-card" style={st.card}>
            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Registrar novo valor</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              <div><label style={rLbl}>Data da alteração</label><input type="date" style={rInp} value={salForm.dataAlteracao} onChange={e=>setSalForm(f=>({...f,dataAlteracao:e.target.value}))}/></div>
              <div><label style={rLbl}>Valor (R$)</label><input inputMode="decimal" placeholder="0,00" style={rInp} value={salForm.valor} onChange={e=>{setSalForm(f=>({...f,valor:sanitizarMoedaInput(e.target.value)}));setSalErr("");}} onBlur={()=>setSalForm(f=>({...f,valor:fMoedaInput(f.valor)}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Motivo/observação (opcional)</label><input style={rInp} placeholder="Ex.: reajuste anual, promoção..." value={salForm.motivo} onChange={e=>setSalForm(f=>({...f,motivo:e.target.value}))}/></div>
            </div>
            {salErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{salErr}</div>}
            <button style={{...st.btnBlue,marginTop:12}} onClick={salvarSalario} disabled={salSalvando}>{salSalvando?"Salvando...":<><Save size={14}/>Registrar salário</>}</button>
          </div>

          <div className="bv-card" style={st.card}>
            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Histórico salarial</div>
            {salarios.length===0?<div style={{fontSize:13,color:D.muted}}>Nenhum lançamento registrado ainda.</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {salarios.map((s,i)=>(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:i>0?"1px solid "+D.border:"none",gap:10}}>
                    <div>
                      <div style={{fontSize:13,color:D.text,fontWeight:600}}>{fData(s.dataAlteracao)}{i===0&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,background:D.blueSoft,color:D.blueText,borderRadius:20,padding:"2px 8px"}}>ATUAL</span>}</div>
                      {s.motivo&&<div style={{fontSize:12,color:D.muted,marginTop:2}}>{s.motivo}</div>}
                    </div>
                    <div style={{fontSize:14,color:D.text,fontWeight:700}}>{fBRL(s.valor)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FÉRIAS — reaproveita o componente já existente, travado neste funcionário */}
      {aba==="ferias"&&(
        <Ferias D={D} st={st} addA={addA} addN={addN} funcionarios={[funcionario]} funcionarioFixo={funcionario} onRegistrarOcorrencia={registrarOcorrencia}/>
      )}

      {/* EXAMES */}
      {aba==="exames"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:600,color:D.text}}>Exames periódicos</div>
            <button style={st.btnBlue} onClick={abrirNovoExame}><Plus size={15}/>Novo registro</button>
          </div>
          <div className="bv-card" style={st.card}>
            {exames.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:D.muted}}>Nenhum exame registrado.</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {exames.map((e,i)=>{
                  const sit = situacaoExame(e);
                  const sc = corSituacaoExame(sit,D);
                  return (
                    <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:i>0?"1px solid "+D.border:"none",gap:10,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:13,color:D.text,fontWeight:600}}>{e.ano}{e.dataExame?" — "+fData(e.dataExame):""}</div>
                        {e.dataProximoExame&&<div style={{fontSize:12,color:D.muted,marginTop:2}}>Próximo exame: {fData(e.dataProximoExame)}</div>}
                        {e.observacoes&&<div style={{fontSize:12,color:D.muted,marginTop:2,fontStyle:"italic"}}>{e.observacoes}</div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:11,fontWeight:600,background:sc.bg,color:sc.c,borderRadius:20,padding:"3px 10px"}}>{sit}</span>
                        <button style={{...st.btn,padding:"4px 8px",fontSize:11}} onClick={()=>abrirEditarExame(e)}><Pencil size={12}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCUMENTOS */}
      {aba==="documentos"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:600,color:D.text}}>Documentos / Evidências</div>
            <button style={st.btnBlue} onClick={abrirNovoDocumento}><Plus size={15}/>Novo registro</button>
          </div>
          <div className="bv-card" style={st.card}>
            {documentos.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:D.muted}}>Nenhum documento registrado.</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {documentos.map((d,i)=>(
                  <div key={d.id} style={{padding:"10px 0",borderTop:i>0?"1px solid "+D.border:"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                      <span style={{fontSize:13,color:D.text,fontWeight:600}}>{d.tipo}</span>
                      <span style={{fontSize:12,color:D.muted}}>{fData(d.data)}</span>
                    </div>
                    {d.descricao&&<div style={{fontSize:12.5,color:D.muted,marginTop:3}}>{d.descricao}</div>}
                    {d.observacoes&&<div style={{fontSize:12,color:D.muted,marginTop:2,fontStyle:"italic"}}>{d.observacoes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {aba==="historico"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:600,color:D.text}}>Linha do tempo</div>
            <button style={st.btnBlue} onClick={()=>{setOcoForm(OCO_FORM_VAZIO);setOcoErr("");setShowOcoForm(true);}}><Plus size={15}/>Novo registro</button>
          </div>
          <div className="bv-card" style={st.card}>
            {ocorrencias.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:D.muted}}>Nenhuma ocorrência registrada.</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {ocorrencias.map(o=>(
                  <div key={o.id} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:D.blue,marginTop:6,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                        <span style={{fontSize:13,fontWeight:600,color:D.text}}>{o.tipo}</span>
                        <span style={{fontSize:11,color:D.muted}}>{fData(o.data)}</span>
                      </div>
                      <div style={{fontSize:13,color:D.text,marginTop:2}}>{o.descricao}</div>
                      {o.observacoes&&<div style={{fontSize:12,color:D.muted,marginTop:2,fontStyle:"italic"}}>{o.observacoes}</div>}
                      {o.criadoPorNome&&<div style={{fontSize:11,color:D.muted,marginTop:3}}>Registrado por {o.criadoPorNome}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OBSERVAÇÕES */}
      {aba==="observacoes"&&(
        <div className="bv-card" style={st.card}>
          <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Observações gerais</div>
          {funcionario.observacoes?(
            <div style={{fontSize:13.5,color:D.text,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{funcionario.observacoes}</div>
          ):(
            <div style={{fontSize:13,color:D.muted}}>Nenhuma observação registrada.</div>
          )}
          <button style={{...st.btn,marginTop:16}} onClick={onEditar}><Pencil size={13}/>Editar observações</button>
        </div>
      )}

      </>)}

      {/* MODAL: novo/editar exame */}
      {showExameForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:480,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Stethoscope size={22} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{exEditandoId?"Editar exame":"Novo exame periódico"}</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>Um registro por ano — se já existir, edite o registro do ano.</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              <div><label style={rLbl}>Ano</label><input type="number" style={rInp} value={exForm.ano} onChange={e=>{setExForm(f=>({...f,ano:e.target.value}));setExErr("");}} disabled={!!exEditandoId}/></div>
              <div><label style={rLbl}>Status</label>
                <select style={rInp} value={exForm.status} onChange={e=>setExForm(f=>({...f,status:e.target.value}))}>
                  <option value="Pendente">Pendente</option>
                  <option value="Realizado">Realizado</option>
                </select>
              </div>
              <div><label style={rLbl}>Data do exame</label><input type="date" style={rInp} value={exForm.dataExame} onChange={e=>setExForm(f=>({...f,dataExame:e.target.value}))}/></div>
              <div><label style={rLbl}>Data do próximo exame</label><input type="date" style={rInp} value={exForm.dataProximoExame} onChange={e=>setExForm(f=>({...f,dataProximoExame:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Observações</label><textarea rows={3} style={{...rInp,resize:"vertical"}} value={exForm.observacoes} onChange={e=>setExForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>
            {exErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{exErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowExameForm(false)}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvarExame} disabled={exSalvando}>{exSalvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: novo documento */}
      {showDocForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:480,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><FileText size={22} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:20}}>Novo documento</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              <div><label style={rLbl}>Tipo</label>
                <select style={rInp} value={docForm.tipo} onChange={e=>setDocForm(f=>({...f,tipo:e.target.value}))}>
                  {DOC_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={rLbl}>Data</label><input type="date" style={rInp} value={docForm.data} onChange={e=>{setDocForm(f=>({...f,data:e.target.value}));setDocErr("");}}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Descrição</label><input style={rInp} value={docForm.descricao} onChange={e=>setDocForm(f=>({...f,descricao:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Observações</label><textarea rows={3} style={{...rInp,resize:"vertical"}} value={docForm.observacoes} onChange={e=>setDocForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>
            {docErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{docErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowDocForm(false)}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvarDocumento} disabled={docSalvando}>{docSalvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: nova ocorrência manual */}
      {showOcoForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:480,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><History size={22} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:20}}>Novo registro na linha do tempo</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              <div><label style={rLbl}>Data</label><input type="date" style={rInp} value={ocoForm.data} onChange={e=>setOcoForm(f=>({...f,data:e.target.value}))}/></div>
              <div><label style={rLbl}>Tipo</label>
                <select style={rInp} value={ocoForm.tipo} onChange={e=>setOcoForm(f=>({...f,tipo:e.target.value}))}>
                  {OCO_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Descrição</label><textarea rows={2} style={{...rInp,resize:"vertical"}} value={ocoForm.descricao} onChange={e=>{setOcoForm(f=>({...f,descricao:e.target.value}));setOcoErr("");}}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Observações (opcional)</label><textarea rows={2} style={{...rInp,resize:"vertical"}} value={ocoForm.observacoes} onChange={e=>setOcoForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>
            {ocoErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{ocoErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowOcoForm(false)}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvarOcorrenciaManual} disabled={ocoSalvando}>{ocoSalvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
