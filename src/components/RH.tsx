import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Eye, Save, AlertCircle, Briefcase, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fData, mapFuncionarioRow, mapFeriasRow, mapExameRow, nomeVisivel } from "../lib/helpers";
import { hoje, ESTADOS_FILIAL } from "../constants";
import { useDraggable } from "../lib/useDraggable";
import Av from "./Av";
import Ferias from "./Ferias";
import FuncionarioPerfil from "./FuncionarioPerfil";
import RHAlertas from "./RHAlertas";

const FORM_VAZIO = {id:null,nome:"",cargo:"",cpf:"",dataNascimento:"",email:"",setor:"",estadoFilial:"",telefone:"",dataEntrada:hoje,tipoVinculo:"Efetivo",valeTransporte:false,valeRefeicao:false,observacoes:"",status:"Ativo",dataSaida:""};

// Traduz o erro do Supabase pra uma mensagem útil sem despejar jargão de
// banco pra quem não é dev (a tela é usada pelo RH, não por devs) — mas
// também sem esconder o problema atrás da mesma mensagem genérica sempre.
// O erro completo (code/message/details/hint) sempre vai pro console,
// pra quem for investigar ter o dado real na mão.
function mensagemErroSalvarFuncionario(error){
  console.error("Erro ao salvar funcionário (funcionarios):", error);
  if(!error) return "Não foi possível salvar. Verifique os dados e tente novamente.";
  if(error.code==="42501") return "Você não tem permissão para cadastrar ou editar funcionários. Fale com a administração do sistema.";
  if(error.code==="23502") return "Preencha todos os campos obrigatórios antes de salvar.";
  if(error.code==="23514") return "Um dos valores informados não é válido — confira os campos Estado/Filial, Tipo de vínculo e Status.";
  if(error.code==="23505") return "Já existe um registro com esses dados.";
  return "Não foi possível salvar"+(error.code?" (código "+error.code+")":"")+". Se o problema continuar, informe esse código ao suporte.";
}

// Aba "RH" — cadastro de funcionários da empresa, mantido pelo setor de
// RH. Separado de "profiles" (contas de login), "representantes"
// (vendedores, com CPF/CNPJ e vínculo comercial) e "supervisores"
// (estrutura do CRM): aqui é o cadastro de pessoal em si (telefone,
// vínculo empregatício, VT/VR, observações) — ver
// 20260817000000_rh_perfil_e_funcionarios.sql. RLS restringe leitura e
// escrita a quem consegue gerenciar funcionários
// (pode_gerenciar_funcionarios()) — a aba só é renderizada pra esse mesmo
// público (ver App.tsx), então dentro dela qualquer pessoa autorizada a
// abrir já pode cadastrar/editar/mudar situação, sem camada extra de
// permissão nominal.
//
// Clicar num funcionário abre o perfil completo (FuncionarioPerfil.tsx —
// salário/histórico, exames periódicos, documentos e a linha do tempo de
// ocorrências, ver 20260915000000_rh_perfil_completo.sql), em vez do antigo
// modal de detalhes. RH.tsx continua sendo o único ponto que busca
// "funcionarios" (e agora também um retrato leve de "ferias"/
// "funcionario_exames", só o suficiente pras colunas da lista e pros
// Alertas de RH) — o resto do perfil (salário, documentos, histórico) é
// carregado sob demanda dentro de FuncionarioPerfil, só quando aquele
// funcionário é aberto.
export default function RH(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN;
  const usuarioNome = nomeVisivel(p.user);
  const [aba, setAba] = useState("funcionarios");
  const [lista, setLista] = useState([]);
  const [feriasList, setFeriasList] = useState([]);
  const [examesList, setExamesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroVinculo, setFiltroVinculo] = useState("todos");
  const [filtroIds, setFiltroIds] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [funcionarioAbertoId, setFuncionarioAbertoId] = useState(null);
  const { dragStyle, dragHandleProps, resetDrag } = useDraggable();

  async function carregar(){
    setLoading(true);
    const [func, fer, ex] = await Promise.all([
      supabase.from("funcionarios").select("*").order("nome"),
      supabase.from("ferias").select("*"),
      supabase.from("funcionario_exames").select("*"),
    ]);
    if(!func.error&&func.data) setLista(func.data.map(mapFuncionarioRow));
    if(!fer.error&&fer.data) setFeriasList(fer.data.map(mapFeriasRow));
    if(!ex.error&&ex.data) setExamesList(ex.data.map(mapExameRow));
    setLoading(false);
  }

  useEffect(()=>{ carregar(); },[]);

  function abrirNovo(){
    setForm(FORM_VAZIO); setFormErr(""); setShowForm(true); resetDrag();
  }

  function abrirEditar(f){
    setForm({id:f.id,nome:f.nome,cargo:f.cargo,cpf:f.cpf,dataNascimento:f.dataNascimento,email:f.email,setor:f.setor,estadoFilial:f.estadoFilial,telefone:f.telefone,dataEntrada:f.dataEntrada,tipoVinculo:f.tipoVinculo,valeTransporte:f.valeTransporte,valeRefeicao:f.valeRefeicao,observacoes:f.observacoes,status:f.status,dataSaida:f.dataSaida});
    setFormErr(""); setShowForm(true); resetDrag();
  }

  function fecharForm(){ setShowForm(false); setFormErr(""); }

  async function salvar(){
    if(!form.nome.trim()){ setFormErr("Informe o nome completo."); return; }
    if(form.status==="Inativo"&&!form.dataSaida){ setFormErr("Informe a data de saída."); return; }
    setSalvando(true); setFormErr("");
    const payload = {
      nome: form.nome.trim(),
      cargo: form.cargo.trim()||null,
      cpf: form.cpf.trim()||null,
      data_nascimento: form.dataNascimento||null,
      email: form.email.trim()||null,
      setor: form.setor.trim()||null,
      estado_filial: form.estadoFilial||null,
      telefone: form.telefone||null,
      data_entrada: form.dataEntrada||hoje,
      tipo_vinculo: form.tipoVinculo,
      vale_transporte: form.valeTransporte,
      vale_refeicao: form.valeRefeicao,
      observacoes: form.observacoes||null,
      status: form.status,
      data_saida: form.status==="Inativo" ? (form.dataSaida||null) : null,
    };
    const query = form.id
      ? supabase.from("funcionarios").update(payload).eq("id",form.id).select().single()
      : supabase.from("funcionarios").insert(payload).select().single();
    const { data, error } = await query;
    setSalvando(false);
    if(error||!data){ setFormErr(mensagemErroSalvarFuncionario(error)); return; }
    const linha = mapFuncionarioRow(data);
    setLista(prev=>{
      const semEle = prev.filter(f=>f.id!==linha.id);
      return [...semEle, linha].sort((a,b)=>a.nome.localeCompare(b.nome));
    });
    if(form.id){
      addA("Funcionário editado", linha.nome, "Dados atualizados");
    } else {
      addN("Novo funcionário cadastrado: "+linha.nome);
      addA("Funcionário criado", linha.nome, "Vínculo: "+linha.tipoVinculo);
    }
    fecharForm();
  }

  // Resumo por funcionário (próximo exame + situação das férias), usado
  // tanto na coluna da lista quanto nos Alertas — sempre derivado de
  // feriasList/examesList (já carregados acima), nunca uma consulta extra.
  function resumoDoFuncionario(funcionarioId){
    const examesDoFunc = examesList.filter(e=>e.funcionarioId===funcionarioId).sort((a,b)=>b.ano-a.ano);
    const ultimoExame = examesDoFunc[0]||null;
    const feriasDoFunc = feriasList.filter(x=>x.funcionarioId===funcionarioId).sort((a,b)=>(b.periodoAquisitivoInicio||"").localeCompare(a.periodoAquisitivoInicio||""));
    const ultimaFerias = feriasDoFunc[0]||null;
    return {
      proximoExame: ultimoExame&&ultimoExame.dataProximoExame ? fData(ultimoExame.dataProximoExame) : "—",
      situacaoFerias: ultimaFerias ? ultimaFerias.status : "—",
    };
  }

  const visiveis = lista.filter(f=>
    (filtroStatus==="todos"||f.status===filtroStatus) &&
    (filtroVinculo==="todos"||f.tipoVinculo===filtroVinculo) &&
    (!filtroIds||filtroIds.includes(f.id)) &&
    (!busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.telefone.includes(busca) || (f.cargo||"").toLowerCase().includes(busca.toLowerCase()))
  );

  const funcionarioAberto = funcionarioAbertoId ? lista.find(f=>f.id===funcionarioAbertoId) : null;

  function verGrupoDeAlerta(ids){
    setFiltroIds(ids);
    setAba("funcionarios");
  }

  return (
    <div>
      {funcionarioAberto ? (
        <FuncionarioPerfil
          funcionario={funcionarioAberto}
          D={D} st={st} addA={addA} addN={addN}
          usuarioNome={usuarioNome}
          onVoltar={()=>setFuncionarioAbertoId(null)}
          onEditar={()=>abrirEditar(funcionarioAberto)}
        />
      ) : (
      <>
      <div style={{display:"flex",gap:4,marginBottom:20,background:D.bg,borderRadius:10,padding:4,width:"fit-content",flexWrap:"wrap"}}>
        {[{id:"funcionarios",label:"👥 Funcionários"},{id:"ferias",label:"🏖️ Férias"},{id:"alertas",label:"⚠️ Alertas de RH"}].map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:aba===a.id?600:400,background:aba===a.id?D.white:"transparent",color:aba===a.id?D.text:D.muted}}>{a.label}</button>
        ))}
      </div>

      {aba==="ferias"?(
        <Ferias D={D} st={st} addA={addA} addN={addN} funcionarios={lista}/>
      ):aba==="alertas"?(
        <RHAlertas D={D} st={st} funcionarios={lista} exames={examesList} ferias={feriasList} onVerGrupo={verGrupoDeAlerta}/>
      ):loading?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando funcionários...</div>
      ):(
      <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>RH</div><div style={{fontSize:13,color:D.muted}}>{visiveis.length} funcionário(s)</div></div>
        <button style={st.btnBlue} onClick={abrirNovo}><Plus size={15}/>Novo Funcionário</button>
      </div>

      {filtroIds&&(
        <div style={{display:"flex",alignItems:"center",gap:10,background:D.orangeSoft,color:D.orangeText,borderRadius:10,padding:"9px 14px",marginBottom:14,fontSize:13}}>
          <AlertTriangle size={14}/>
          Filtrado por alerta — {visiveis.length} funcionário(s)
          <button onClick={()=>setFiltroIds(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:D.orangeText,fontSize:12,fontWeight:600,textDecoration:"underline"}}>Limpar filtro</button>
        </div>
      )}

      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 220px"}}>
          <label style={st.lbl}>Pesquisar</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="Nome, cargo ou telefone" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
        </div>
        <div style={{flex:"1 1 140px"}}>
          <label style={st.lbl}>Vínculo</label>
          <select style={st.inp} value={filtroVinculo} onChange={e=>setFiltroVinculo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="Efetivo">Efetivo</option>
            <option value="Temporário">Temporário</option>
          </select>
        </div>
        <div style={{flex:"1 1 140px"}}>
          <label style={st.lbl}>Status</label>
          <select style={st.inp} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div className="bv-card" style={st.card}>
        {visiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhum funcionário encontrado.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Funcionário","Cargo","Setor","Status","Admissão","Próx. exame","Férias",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(f=>{
              const r = resumoDoFuncionario(f.id);
              return (
              <tr key={f.id} style={{borderBottom:"1px solid "+D.border,cursor:"pointer"}} onClick={()=>setFuncionarioAbertoId(f.id)}>
                <td data-label="Funcionário" style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Av name={f.nome} color={D.blue} size={30}/>
                    <div style={{fontWeight:500,color:D.text}}>{f.nome}</div>
                  </div>
                </td>
                <td data-label="Cargo" style={{padding:"10px 8px",color:D.muted}}>{f.cargo||"—"}</td>
                <td data-label="Setor" style={{padding:"10px 8px",color:D.muted}}>{f.setor||"—"}</td>
                <td data-label="Status" style={{padding:"10px 8px"}}><span style={{fontSize:11,fontWeight:600,background:f.status==="Ativo"?D.greenSoft:D.redSoft,color:f.status==="Ativo"?D.greenText:D.redText,borderRadius:20,padding:"3px 10px"}}>{f.status}</span></td>
                <td data-label="Admissão" style={{padding:"10px 8px",color:D.muted}}>{f.dataEntrada?fData(f.dataEntrada):"—"}</td>
                <td data-label="Próx. exame" style={{padding:"10px 8px",color:D.muted}}>{r.proximoExame}</td>
                <td data-label="Férias" style={{padding:"10px 8px",color:D.muted}}>{r.situacaoFerias}</td>
                <td style={{padding:"10px 8px"}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Ver perfil completo" onClick={()=>setFuncionarioAbertoId(f.id)}><Eye size={12}/></button>
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
      </>
      )}
      </>
      )}

      {/* MODAL: cadastro / edição — fica acessível tanto na lista quanto de
          dentro do perfil (aba Dados/Observações chama onEditar). */}
      {showForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:640,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",...dragStyle}} onClick={e=>e.stopPropagation()}>
            <div {...dragHandleProps}>
              <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Briefcase size={22} color={D.purple}/></div>
              <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{form.id?"Editar Funcionário":"Novo Funcionário"}</div>
              <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>{form.id?"Atualize os dados do funcionário.":"Cadastre um funcionário da empresa."}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Nome completo</label><input autoFocus style={st.inp} value={form.nome} onChange={e=>{setForm(f=>({...f,nome:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Cargo</label><input style={st.inp} placeholder="Ex.: Assistente" value={form.cargo} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))}/></div>
              <div><label style={st.lbl}>Setor</label><input style={st.inp} placeholder="Ex.: Financeiro" value={form.setor} onChange={e=>setForm(f=>({...f,setor:e.target.value}))}/></div>
              <div><label style={st.lbl}>CPF</label><input style={st.inp} value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))}/></div>
              <div><label style={st.lbl}>Data de nascimento</label><input type="date" style={st.inp} value={form.dataNascimento} onChange={e=>setForm(f=>({...f,dataNascimento:e.target.value}))}/></div>
              <div><label style={st.lbl}>Número de telefone</label><input style={st.inp} value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/></div>
              <div><label style={st.lbl}>E-mail</label><input type="email" style={st.inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label style={st.lbl}>Estado/Filial</label>
                <select style={st.inp} value={form.estadoFilial} onChange={e=>setForm(f=>({...f,estadoFilial:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {ESTADOS_FILIAL.map(ef=><option key={ef} value={ef}>{ef}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Data de início</label><input type="date" style={st.inp} value={form.dataEntrada} onChange={e=>setForm(f=>({...f,dataEntrada:e.target.value}))}/></div>
              <div><label style={st.lbl}>Tipo de vínculo</label>
                <select style={st.inp} value={form.tipoVinculo} onChange={e=>setForm(f=>({...f,tipoVinculo:e.target.value}))}>
                  <option value="Efetivo">Efetivo</option>
                  <option value="Temporário">Temporário</option>
                </select>
              </div>
              <div><label style={st.lbl}>Status</label>
                <select style={st.inp} value={form.status} onChange={e=>{setForm(f=>({...f,status:e.target.value}));setFormErr("");}}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div><label style={st.lbl}>Recebe Vale-Transporte (VT)</label>
                <select style={st.inp} value={form.valeTransporte?"sim":"nao"} onChange={e=>setForm(f=>({...f,valeTransporte:e.target.value==="sim"}))}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>
              <div><label style={st.lbl}>Recebe Vale-Refeição (VR)</label>
                <select style={st.inp} value={form.valeRefeicao?"sim":"nao"} onChange={e=>setForm(f=>({...f,valeRefeicao:e.target.value==="sim"}))}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>
              {form.status==="Inativo"&&(
                <div><label style={st.lbl}>Data de saída</label><input type="date" style={st.inp} value={form.dataSaida} onChange={e=>{setForm(f=>({...f,dataSaida:e.target.value}));setFormErr("");}}/></div>
              )}
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
    </div>
  );
}
