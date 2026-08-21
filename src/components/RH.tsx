import { useEffect, useState } from "react";
import { Plus, Search, X, Pencil, Eye, Save, AlertCircle, Briefcase } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fData, mapFuncionarioRow } from "../lib/helpers";
import { hoje } from "../constants";
import Av from "./Av";
import Ferias from "./Ferias";

const FORM_VAZIO = {id:null,nome:"",setor:"",telefone:"",dataEntrada:hoje,tipoVinculo:"Efetivo",valeTransporte:false,valeRefeicao:false,observacoes:"",status:"Ativo",dataSaida:""};

// Aba "RH" — cadastro de funcionários da empresa, mantido pelo setor de
// RH. Separado de "profiles" (contas de login), "representantes"
// (vendedores, com CPF/CNPJ e vínculo comercial) e "supervisores"
// (estrutura do CRM): aqui é o cadastro de pessoal em si (telefone,
// vínculo empregatício, VT/VR, observações) — ver
// 20260817000000_rh_perfil_e_funcionarios.sql. RLS restringe leitura e
// escrita a quem tem profiles.setor='RH' (ou admin) — a aba só é
// renderizada pra esse mesmo público (ver App.tsx), então dentro dela
// qualquer pessoa autorizada a abrir já pode cadastrar/editar/mudar
// situação, sem camada extra de permissão nominal.
export default function RH(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN;
  const [aba, setAba] = useState("funcionarios");
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroVinculo, setFiltroVinculo] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [detalheDe, setDetalheDe] = useState(null);

  async function carregar(){
    setLoading(true);
    const { data, error } = await supabase.from("funcionarios").select("*").order("nome");
    if(!error&&data) setLista(data.map(mapFuncionarioRow));
    setLoading(false);
  }

  useEffect(()=>{ carregar(); },[]);

  function abrirNovo(){
    setForm(FORM_VAZIO); setFormErr(""); setShowForm(true);
  }

  function abrirEditar(f){
    setForm({id:f.id,nome:f.nome,setor:f.setor,telefone:f.telefone,dataEntrada:f.dataEntrada,tipoVinculo:f.tipoVinculo,valeTransporte:f.valeTransporte,valeRefeicao:f.valeRefeicao,observacoes:f.observacoes,status:f.status,dataSaida:f.dataSaida});
    setFormErr(""); setShowForm(true);
  }

  function fecharForm(){ setShowForm(false); setFormErr(""); }

  async function salvar(){
    if(!form.nome.trim()){ setFormErr("Informe o nome completo."); return; }
    if(form.status==="Inativo"&&!form.dataSaida){ setFormErr("Informe a data de saída."); return; }
    setSalvando(true); setFormErr("");
    const payload = {
      nome: form.nome.trim(),
      setor: form.setor.trim()||null,
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
    if(error||!data){ setFormErr("Não foi possível salvar. Verifique os dados e tente novamente."); return; }
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

  const visiveis = lista.filter(f=>
    (filtroStatus==="todos"||f.status===filtroStatus) &&
    (filtroVinculo==="todos"||f.tipoVinculo===filtroVinculo) &&
    (!busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.telefone.includes(busca))
  );

  return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:20,background:D.bg,borderRadius:10,padding:4,width:"fit-content"}}>
        {[{id:"funcionarios",label:"👥 Funcionários"},{id:"ferias",label:"🏖️ Férias"}].map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:aba===a.id?600:400,background:aba===a.id?D.white:"transparent",color:aba===a.id?D.text:D.muted}}>{a.label}</button>
        ))}
      </div>

      {aba==="ferias"?(
        <Ferias D={D} st={st} addA={addA} addN={addN} funcionarios={lista}/>
      ):loading?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando funcionários...</div>
      ):(
      <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>RH</div><div style={{fontSize:13,color:D.muted}}>{visiveis.length} funcionário(s)</div></div>
        <button style={st.btnBlue} onClick={abrirNovo}><Plus size={15}/>Novo Funcionário</button>
      </div>

      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 220px"}}>
          <label style={st.lbl}>Pesquisar</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="Nome ou telefone" value={busca} onChange={e=>setBusca(e.target.value)}/>
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
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Funcionário","Setor","Telefone","Vínculo","VT","VR","Data de início","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(f=>(
              <tr key={f.id} style={{borderBottom:"1px solid "+D.border}}>
                <td data-label="Funcionário" style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Av name={f.nome} color={D.blue} size={30}/>
                    <div style={{fontWeight:500,color:D.text}}>{f.nome}</div>
                  </div>
                </td>
                <td data-label="Setor" style={{padding:"10px 8px",color:D.muted}}>{f.setor||"—"}</td>
                <td data-label="Telefone" style={{padding:"10px 8px",color:D.muted}}>{f.telefone||"—"}</td>
                <td data-label="Vínculo" style={{padding:"10px 8px",color:D.muted}}>{f.tipoVinculo}</td>
                <td data-label="VT" style={{padding:"10px 8px",color:D.muted}}>{f.valeTransporte?"Sim":"Não"}</td>
                <td data-label="VR" style={{padding:"10px 8px",color:D.muted}}>{f.valeRefeicao?"Sim":"Não"}</td>
                <td data-label="Data de início" style={{padding:"10px 8px",color:D.muted}}>{f.dataEntrada?fData(f.dataEntrada):"—"}</td>
                <td data-label="Status" style={{padding:"10px 8px"}}><span style={{fontSize:11,fontWeight:600,background:f.status==="Ativo"?D.greenSoft:D.redSoft,color:f.status==="Ativo"?D.greenText:D.redText,borderRadius:20,padding:"3px 10px"}}>{f.status}</span></td>
                <td style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Ver detalhes" onClick={()=>setDetalheDe(f)}><Eye size={12}/></button>
                    <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Editar" onClick={()=>abrirEditar(f)}><Pencil size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          </div>
        )}
      </div>

      {/* MODAL: cadastro / edição */}
      {showForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={fecharForm}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:560,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Briefcase size={22} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{form.id?"Editar Funcionário":"Novo Funcionário"}</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>{form.id?"Atualize os dados do funcionário.":"Cadastre um funcionário da empresa."}</div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Nome completo</label><input autoFocus style={st.inp} value={form.nome} onChange={e=>{setForm(f=>({...f,nome:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>Setor</label><input style={st.inp} placeholder="Ex.: Financeiro" value={form.setor} onChange={e=>setForm(f=>({...f,setor:e.target.value}))}/></div>
              <div><label style={st.lbl}>Número de telefone</label><input style={st.inp} value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/></div>
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

      {/* MODAL: detalhes */}
      {detalheDe&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>setDetalheDe(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:16,padding:"1.6rem",maxWidth:420,width:"100%",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Av name={detalheDe.nome} color={D.blue} size={44}/>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:D.text}}>{detalheDe.nome}</div>
                  <div style={{fontSize:12,color:D.muted}}>{detalheDe.tipoVinculo}</div>
                </div>
              </div>
              <button onClick={()=>setDetalheDe(null)} style={{...st.btn,padding:"6px 8px",border:"none",background:"transparent"}}><X size={15}/></button>
            </div>

            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Dados do vínculo</div>
            <div style={{background:D.bg,borderRadius:10,padding:"4px 14px",marginBottom:16}}>
              {[
                {label:"Setor", value:detalheDe.setor||"—"},
                {label:"Telefone", value:detalheDe.telefone||"—"},
                {label:"Data de início", value:detalheDe.dataEntrada?fData(detalheDe.dataEntrada):"—"},
                {label:"Tipo de vínculo", value:detalheDe.tipoVinculo},
                {label:"Vale-Transporte", value:detalheDe.valeTransporte?"Sim":"Não"},
                {label:"Vale-Refeição", value:detalheDe.valeRefeicao?"Sim":"Não"},
                {label:"Status", value:detalheDe.status},
                {label:"Data de saída", value:detalheDe.dataSaida?fData(detalheDe.dataSaida):"—"},
              ].map((r,i)=>(
                <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderTop:i>0?"1px solid "+D.border:"none",gap:10}}>
                  <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
                  <span style={{fontSize:13,color:D.text,fontWeight:600,textAlign:"right"}}>{r.value}</span>
                </div>
              ))}
            </div>
            {detalheDe.observacoes&&(<>
              <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Observações</div>
              <div style={{fontSize:12.5,color:D.muted,fontStyle:"italic",padding:"0 2px",marginBottom:16}}>{detalheDe.observacoes}</div>
            </>)}

            <div style={{display:"flex",gap:8}}>
              <button style={{...st.btn,flex:1,justifyContent:"center"}} onClick={()=>{setDetalheDe(null);abrirEditar(detalheDe);}}><Pencil size={13}/>Editar</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
