import { useEffect, useState } from "react";
import { Search, X, LogIn, Monitor, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fmtData } from "../lib/helpers";
import Av from "./Av";
import MCard from "./MCard";

function roleLabel(r){ return r==="admin"?"Supervisora":r==="demo"?"Demonstração":"Funcionária"; }
function dentroDoPeriodo(iso, periodo){
  if(!iso||periodo==="todos") return true;
  const dias = periodo==="hoje"?0:periodo==="7d"?7:30;
  const limite = new Date(); limite.setDate(limite.getDate()-dias); limite.setHours(0,0,0,0);
  return new Date(iso) >= limite;
}

// Configurações > Acessos ao sistema — admin-only (o pai só monta este
// componente quando isAdmin; a proteção de verdade é o RLS/RPCs, gated por
// is_admin() no banco, não esta tela). Busca os próprios dados (não passa
// pelo useEffect gigante do App.tsx), igual Mensagens.
export default function Acessos(p) {
  const D = p.D, st = p.st;
  const [resumo, setResumo] = useState([]);
  const [geral, setGeral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [detalheDe, setDetalheDe] = useState(null);
  const [detalhe, setDetalhe] = useState([]);
  const [detalheLoading, setDetalheLoading] = useState(false);

  async function carregar(){
    setLoading(true); setErro("");
    const [{ data: r, error: eR }, { data: g, error: eG }] = await Promise.all([
      supabase.rpc("login_history_resumo"),
      supabase.rpc("login_history_geral"),
    ]);
    if(eR||eG){ setErro("Não foi possível carregar os acessos."); setLoading(false); return; }
    setResumo(r||[]);
    setGeral((g&&g[0])||null);
    setLoading(false);
  }

  useEffect(()=>{ carregar(); },[]);

  async function abrirDetalhe(u){
    setDetalheDe(u);
    setDetalheLoading(true);
    const { data, error } = await supabase.rpc("login_history_detalhe", { p_user_id: u.user_id });
    setDetalhe(error?[]:(data||[]));
    setDetalheLoading(false);
  }

  const visiveis = resumo.filter(u=>
    (filtroPerfil==="todos"||u.role===filtroPerfil) &&
    (filtroUsuario==="todos"||u.user_id===filtroUsuario) &&
    (!busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || (u.email||"").toLowerCase().includes(busca.toLowerCase())) &&
    dentroDoPeriodo(u.ultimo_login, filtroPeriodo)
  );

  const detalheVisivel = detalhe.filter(h=>dentroDoPeriodo(h.created_at, filtroPeriodo));

  if(loading) return <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando acessos...</div>;
  if(erro) return <div style={{textAlign:"center",padding:"2rem",color:D.redText,fontSize:13}}>{erro}</div>;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16}}>
        <MCard D={D} label="Usuários ativos" value={geral?Number(geral.usuarios_ativos):0} Icon={LogIn} bg={D.blueSoft} color={D.blue}/>
        <MCard D={D} label="Logins hoje" value={geral?Number(geral.logins_hoje):0} Icon={LogIn} bg={D.greenSoft} color={D.green}/>
        <MCard D={D} label="Logins (7 dias)" value={geral?Number(geral.logins_7dias):0} Icon={LogIn} bg={D.orangeSoft} color={D.orange}/>
        <MCard D={D} label="Último acesso" value={geral&&geral.ultimo_acesso?fmtData(geral.ultimo_acesso):"—"} Icon={LogIn} bg={D.gray} color={D.muted}/>
      </div>

      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <div style={{flex:"1 1 200px",position:"relative"}}>
          <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
          <input style={{...st.inp,paddingLeft:32}} placeholder="Buscar por nome ou e-mail" value={busca} onChange={e=>setBusca(e.target.value)}/>
        </div>
        <select style={{...st.inp,width:"auto"}} value={filtroPerfil} onChange={e=>setFiltroPerfil(e.target.value)}>
          <option value="todos">Todos os perfis</option>
          <option value="admin">Supervisora</option>
          <option value="func">Funcionária</option>
          <option value="demo">Demonstração</option>
        </select>
        <select style={{...st.inp,width:"auto"}} value={filtroUsuario} onChange={e=>setFiltroUsuario(e.target.value)}>
          <option value="todos">Todos os usuários</option>
          {resumo.map(u=><option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
        </select>
        <select style={{...st.inp,width:"auto"}} value={filtroPeriodo} onChange={e=>setFiltroPeriodo(e.target.value)}>
          <option value="todos">Qualquer período</option>
          <option value="hoje">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
      </div>

      {visiveis.length===0?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Nenhum acesso encontrado com esses filtros.</div>
      ):(
        <div style={{overflowX:"auto"}}>
        <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Usuário","E-mail","Perfil","Total de acessos","Último acesso"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
          <tbody>{visiveis.map(u=>(
            <tr key={u.user_id} onClick={()=>abrirDetalhe(u)} style={{borderBottom:"1px solid "+D.border,cursor:"pointer"}}>
              <td style={{padding:"10px 8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Av name={u.nome} color={D.blue} size={28}/>
                  <span style={{fontWeight:500,color:D.text}}>{u.nome}</span>
                </div>
              </td>
              <td style={{padding:"10px 8px",color:D.muted}}>{u.email||"—"}</td>
              <td style={{padding:"10px 8px",color:D.muted}}>{roleLabel(u.role)}</td>
              <td style={{padding:"10px 8px",color:D.text,fontWeight:600}}>{Number(u.total_logins)}</td>
              <td style={{padding:"10px 8px",color:D.muted}}>{u.ultimo_login?fmtData(u.ultimo_login):"Nunca acessou"}</td>
            </tr>
          ))}</tbody>
        </table>
        </div>
      )}

      {detalheDe&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>setDetalheDe(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"1.6rem",maxWidth:460,width:"100%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Av name={detalheDe.nome} color={D.blue} size={36}/>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:D.text}}>{detalheDe.nome}</div>
                  <div style={{fontSize:12,color:D.muted}}>{detalheDe.email} · {roleLabel(detalheDe.role)}</div>
                </div>
              </div>
              <button onClick={()=>setDetalheDe(null)} style={{...st.btn,padding:"6px 8px",border:"none"}}><X size={15}/></button>
            </div>
            {detalheLoading?(
              <div style={{textAlign:"center",padding:"1.5rem 0",color:D.muted,fontSize:13}}>Carregando histórico...</div>
            ):detalheVisivel.length===0?(
              <div style={{textAlign:"center",padding:"1.5rem 0",color:D.muted,fontSize:13}}>Nenhum acesso registrado nesse período.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {detalheVisivel.map(h=>(
                  <div key={h.id} style={{padding:"10px 12px",background:D.bg,borderRadius:10}}>
                    <div style={{fontSize:13,color:D.text,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><LogIn size={13} color={D.green}/>{fmtData(h.created_at)} — Login realizado</div>
                    {(h.ip_address||h.user_agent)&&(
                      <div style={{fontSize:11,color:D.muted,marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
                        {h.ip_address&&<span style={{display:"flex",alignItems:"center",gap:4}}><MapPin size={11}/>{h.ip_address}</span>}
                        {h.user_agent&&<span style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:260}} title={h.user_agent}><Monitor size={11}/>{h.user_agent}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}