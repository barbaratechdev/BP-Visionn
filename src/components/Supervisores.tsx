import { useEffect, useState } from "react";
import { Plus, Search, X, Pencil, Eye, UserX, Save, AlertCircle, IdCard } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fData, mapSupervisorRow, validarImagem, lerComoDataURL } from "../lib/helpers";
import { hoje } from "../constants";
import Av from "./Av";

const FORM_VAZIO = {id:null,nome:"",cpf:"",email:"",telefone:"",dataNascimento:"",cargo:"",dataInicio:hoje,dataFim:"",status:"Ativo",observacoes:""};

// Aba "Supervisores" — cadastro de pessoas da estrutura do CRM, separado
// de Representantes (representante comercial) e de profiles (contas de
// login: profiles.role="admin" já é rotulado "Supervisora" na interface,
// mas é acesso ao sistema, não cadastro de pessoa — de propósito não
// misturamos os dois aqui). Busca os próprios dados via supervisores_lista()
// (RPC que já mascara campos sensíveis pra Demonstração no banco), igual
// padrão de Mensagens/Acessos: não passa pelo useEffect gigante do App.tsx.
export default function Supervisores(p) {
  const D = p.D, st = p.st, isAdmin = p.isAdmin, isDemo = p.isDemo, addA = p.addA, addN = p.addN;
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoErr, setPhotoErr] = useState("");
  const [detalheDe, setDetalheDe] = useState(null);
  const [confirmDesativar, setConfirmDesativar] = useState(null);

  async function carregar(){
    setLoading(true);
    const { data, error } = await supabase.rpc("supervisores_lista");
    if(!error&&data) setLista(data.map(mapSupervisorRow));
    setLoading(false);
  }

  useEffect(()=>{ carregar(); },[]);

  function abrirNovo(){
    setForm(FORM_VAZIO); setFormErr(""); setPhotoPreview(null); setPhotoErr(""); setShowForm(true);
  }

  function abrirEditar(s){
    setForm({id:s.id,nome:s.nome,cpf:s.cpf,email:s.email,telefone:s.telefone,dataNascimento:s.dataNascimento,cargo:s.cargo,dataInicio:s.dataInicio,dataFim:s.dataFim,status:s.status,observacoes:s.observacoes});
    setFormErr(""); setPhotoPreview(s.foto||null); setPhotoErr(""); setShowForm(true);
  }

  function fecharForm(){ setShowForm(false); setFormErr(""); setPhotoPreview(null); setPhotoErr(""); }

  async function onFotoSelecionada(file){
    if(!file) return;
    const { ok, erro } = validarImagem(file);
    if(!ok){ setPhotoErr(erro); return; }
    setPhotoErr("");
    setPhotoPreview(await lerComoDataURL(file));
  }

  async function salvar(){
    if(!isAdmin) return;
    if(!form.nome.trim()){ setFormErr("Informe o nome completo."); return; }
    setSalvando(true); setFormErr("");
    const payload = {
      nome: form.nome.trim(),
      cpf: form.cpf||null,
      email: form.email||null,
      telefone: form.telefone||null,
      data_nascimento: form.dataNascimento||null,
      cargo: form.cargo||null,
      data_inicio: form.dataInicio||hoje,
      data_fim: form.dataFim||null,
      status: form.status,
      observacoes: form.observacoes||null,
      foto_url: photoPreview||null,
    };
    const query = form.id
      ? supabase.from("supervisores").update(payload).eq("id",form.id).select().single()
      : supabase.from("supervisores").insert(payload).select().single();
    const { data, error } = await query;
    setSalvando(false);
    if(error||!data){ setFormErr("Não foi possível salvar. Verifique os dados e tente novamente."); return; }
    const linha = mapSupervisorRow(data);
    setLista(prev=>{
      const semEle = prev.filter(s=>s.id!==linha.id);
      return [...semEle, linha].sort((a,b)=>a.nome.localeCompare(b.nome));
    });
    if(form.id){
      addA("Supervisor editado", linha.nome, "Dados atualizados");
    } else {
      addN("Novo supervisor cadastrado: "+linha.nome);
      addA("Supervisor criado", linha.nome, "Cargo: "+(linha.cargo||"—"));
    }
    fecharForm();
  }

  async function desativar(id){
    if(!isAdmin) return;
    const { data, error } = await supabase.from("supervisores").update({ status:"Inativo" }).eq("id",id).select().single();
    setConfirmDesativar(null);
    if(error||!data) return;
    const linha = mapSupervisorRow(data);
    setLista(prev=>prev.map(s=>s.id===id?linha:s));
    addA("Supervisor desativado", linha.nome, "Status alterado para Inativo");
    if(detalheDe&&detalheDe.id===id) setDetalheDe(linha);
  }

  const visiveis = lista.filter(s=>
    (filtroStatus==="todos"||s.status===filtroStatus) &&
    (!busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || s.cpf.includes(busca) || s.email.toLowerCase().includes(busca.toLowerCase()))
  );

  if(loading) return <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando supervisores...</div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Supervisores</div><div style={{fontSize:13,color:D.muted}}>{visiveis.length} cadastrado(s)</div></div>
        {isAdmin&&<button style={st.btnBlue} onClick={abrirNovo}><Plus size={15}/>Novo Supervisor</button>}
      </div>

      {isDemo&&<div style={{fontSize:12,color:D.muted,background:D.bg,borderRadius:10,padding:"9px 12px",marginBottom:14}}>Modo Demonstração: CPF/CNPJ, e-mail, telefone, data de nascimento e observações não são exibidos.</div>}

      <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 220px"}}>
          <label style={st.lbl}>Pesquisar</label>
          <div style={{position:"relative"}}>
            <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
            <input style={{...st.inp,paddingLeft:30}} placeholder="Nome, CPF, CNPJ ou e-mail" value={busca} onChange={e=>setBusca(e.target.value)}/>
          </div>
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
        {visiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhum supervisor encontrado.</div>:(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Supervisor","CPF ou CNPJ","Telefone","Data de início","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(s=>(
              <tr key={s.id} style={{borderBottom:"1px solid "+D.border}}>
                <td data-label="Supervisor" style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Av name={s.nome} photo={s.foto} color={D.blue} size={30}/>
                    <div>
                      <div style={{fontWeight:500,color:D.text}}>{s.nome}</div>
                      {s.cargo&&<div style={{fontSize:11,color:D.muted}}>{s.cargo}</div>}
                    </div>
                  </div>
                </td>
                <td data-label="CPF ou CNPJ" style={{padding:"10px 8px",color:D.muted,fontFamily:"monospace"}}>{s.cpf||"—"}</td>
                <td data-label="Telefone" style={{padding:"10px 8px",color:D.muted}}>{s.telefone||"—"}</td>
                <td data-label="Data de início" style={{padding:"10px 8px",color:D.muted}}>{s.dataInicio?fData(s.dataInicio):"—"}</td>
                <td data-label="Status" style={{padding:"10px 8px"}}><span style={{fontSize:11,fontWeight:600,background:s.status==="Ativo"?D.greenSoft:D.redSoft,color:s.status==="Ativo"?D.greenText:D.redText,borderRadius:20,padding:"3px 10px"}}>{s.status}</span></td>
                <td style={{padding:"10px 8px"}}>
                  <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    <button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Ver detalhes" onClick={()=>setDetalheDe(s)}><Eye size={12}/></button>
                    {isAdmin&&<button style={{...st.btn,padding:"4px 8px",fontSize:11}} title="Editar" onClick={()=>abrirEditar(s)}><Pencil size={12}/></button>}
                    {isAdmin&&s.status==="Ativo"&&<button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} title="Desativar" onClick={()=>setConfirmDesativar(s)}><UserX size={12}/></button>}
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
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><IdCard size={22} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:4}}>{form.id?"Editar Supervisor":"Novo Supervisor"}</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>{form.id?"Atualize os dados do supervisor.":"Cadastre um supervisor da estrutura do CRM."}</div>

            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:16}}>
              <Av name={form.nome||"?"} photo={photoPreview} color={D.blue} size={72}/>
              <input id="bv-sup-foto" type="file" accept="image/png,image/jpeg" style={{display:"none"}} onChange={e=>{onFotoSelecionada(e.target.files&&e.target.files[0]); e.target.value="";}}/>
              <div style={{display:"flex",gap:8}}>
                <label htmlFor="bv-sup-foto" style={{...st.btn,cursor:"pointer",padding:"5px 10px",fontSize:12}}>Alterar foto</label>
                {photoPreview&&<button style={{...st.btn,padding:"5px 10px",fontSize:12,color:D.redText,borderColor:D.red+"44"}} onClick={()=>setPhotoPreview(null)}>Remover</button>}
              </div>
              {photoErr&&<div style={{fontSize:11,color:D.redText}}>{photoErr}</div>}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Nome completo</label><input autoFocus style={st.inp} value={form.nome} onChange={e=>{setForm(f=>({...f,nome:e.target.value}));setFormErr("");}}/></div>
              <div><label style={st.lbl}>CPF ou CNPJ</label><input style={st.inp} value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))}/></div>
              <div><label style={st.lbl}>Data de nascimento</label><input type="date" style={st.inp} value={form.dataNascimento} onChange={e=>setForm(f=>({...f,dataNascimento:e.target.value}))}/></div>
              <div><label style={st.lbl}>E-mail</label><input type="email" style={st.inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label style={st.lbl}>Telefone</label><input style={st.inp} value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}/></div>
              <div><label style={st.lbl}>Cargo</label><input style={st.inp} value={form.cargo} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))}/></div>
              <div><label style={st.lbl}>Status</label>
                <select style={st.inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div><label style={st.lbl}>Data de início</label><input type="date" style={st.inp} value={form.dataInicio} onChange={e=>setForm(f=>({...f,dataInicio:e.target.value}))}/></div>
              <div><label style={st.lbl}>Data de término (opcional)</label><input type="date" style={st.inp} value={form.dataFim} onChange={e=>setForm(f=>({...f,dataFim:e.target.value}))}/></div>
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
                <Av name={detalheDe.nome} photo={detalheDe.foto} color={D.blue} size={44}/>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:D.text}}>{detalheDe.nome}</div>
                  <div style={{fontSize:12,color:D.muted}}>{detalheDe.cargo||"—"}</div>
                </div>
              </div>
              <button onClick={()=>setDetalheDe(null)} style={{...st.btn,padding:"6px 8px",border:"none",background:"transparent"}}><X size={15}/></button>
            </div>

            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Dados pessoais</div>
            <div style={{background:D.bg,borderRadius:10,padding:"4px 14px",marginBottom:16}}>
              {[
                {label:"CPF ou CNPJ", value:detalheDe.cpf||"—"},
                {label:"Data de nascimento", value:detalheDe.dataNascimento?fData(detalheDe.dataNascimento):"—"},
                {label:"Telefone", value:detalheDe.telefone||"—"},
                {label:"E-mail", value:detalheDe.email||"—"},
              ].map((r,i)=>(
                <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderTop:i>0?"1px solid "+D.border:"none",gap:10}}>
                  <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
                  <span style={{fontSize:13,color:D.text,fontWeight:600,textAlign:"right"}}>{r.value}</span>
                </div>
              ))}
            </div>

            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Dados profissionais</div>
            <div style={{background:D.bg,borderRadius:10,padding:"4px 14px",marginBottom:detalheDe.observacoes?12:4}}>
              {[
                {label:"Cargo", value:detalheDe.cargo||"—"},
                {label:"Data de início", value:detalheDe.dataInicio?fData(detalheDe.dataInicio):"—"},
                {label:"Data de término", value:detalheDe.dataFim?fData(detalheDe.dataFim):"—"},
                {label:"Status", value:detalheDe.status},
              ].map((r,i)=>(
                <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderTop:i>0?"1px solid "+D.border:"none",gap:10}}>
                  <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
                  <span style={{fontSize:13,color:D.text,fontWeight:600,textAlign:"right"}}>{r.value}</span>
                </div>
              ))}
            </div>
            {detalheDe.observacoes&&<div style={{fontSize:12.5,color:D.muted,fontStyle:"italic",padding:"0 2px"}}>{detalheDe.observacoes}</div>}

            {isAdmin&&(
              <div style={{display:"flex",gap:8,marginTop:18}}>
                <button style={{...st.btn,flex:1,justifyContent:"center"}} onClick={()=>{setDetalheDe(null);abrirEditar(detalheDe);}}><Pencil size={13}/>Editar</button>
                {detalheDe.status==="Ativo"&&<button style={{...st.btn,flex:1,justifyContent:"center",color:D.redText,borderColor:D.red+"44"}} onClick={()=>setConfirmDesativar(detalheDe)}><UserX size={13}/>Desativar</button>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: confirmar desativação */}
      {confirmDesativar&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:"1rem"}} onClick={()=>setConfirmDesativar(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:16,padding:"1.6rem",maxWidth:360,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:44,height:44,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><UserX size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:15,color:D.text,marginBottom:6}}>Desativar supervisor?</div>
            <div style={{fontSize:13,color:D.muted,marginBottom:18}}>{confirmDesativar.nome} deixará de aparecer como supervisor ativo. Você pode reativar editando o cadastro depois.</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:13,color:D.text,fontWeight:500}} onClick={()=>setConfirmDesativar(null)}>Cancelar</button>
              <button style={{flex:1,padding:"9px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600}} onClick={()=>desativar(confirmDesativar.id)}>Desativar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
