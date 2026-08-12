import { useEffect, useState } from "react";
import { Search, X, ChevronRight, LogIn } from "lucide-react";
import { supabase } from "../lib/supabase";
import Av from "./Av";

function roleLabel(r){ return r==="admin"?"Supervisora":r==="demo"?"Demonstração":"Funcionária"; }
function rolePill(r,D){
  return r==="admin" ? {bg:D.blueSoft,c:D.blueText} : r==="demo" ? {bg:D.purpleSoft,c:D.purpleText} : {bg:D.bg,c:D.muted};
}
function dentroDoPeriodo(iso, periodo){
  if(!iso||periodo==="todos") return true;
  const dias = periodo==="hoje"?0:periodo==="7d"?7:30;
  const limite = new Date(); limite.setDate(limite.getDate()-dias); limite.setHours(0,0,0,0);
  return new Date(iso) >= limite;
}
function fData(iso){ return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—"; }
function fHora(iso){ return iso ? new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "—"; }
function fDataHora(iso){ return iso ? fData(iso)+" "+fHora(iso) : "—"; }
// Só formatação de exibição pro user_agent já capturado (sem nova fonte de
// dado): navegador + sistema, do jeito que alguém lê rápido numa tabela.
function dispositivo(ua){
  if(!ua) return "—";
  const nav = /Edg\//.test(ua)?"Edge":/OPR\//.test(ua)?"Opera":/Firefox\//.test(ua)?"Firefox":/Chrome\//.test(ua)?"Chrome":/Safari\//.test(ua)?"Safari":"Navegador";
  const os = /Windows/.test(ua)?"Windows":/Mac OS X/.test(ua)?"macOS":/Android/.test(ua)?"Android":/iPhone|iPad|iOS/.test(ua)?"iOS":/Linux/.test(ua)?"Linux":"";
  return os ? nav+" / "+os : nav;
}

// Configurações > Acessos ao sistema — admin-only (o pai só monta este
// componente quando isAdmin; a proteção de verdade é o RLS/RPCs, gated por
// is_admin() no banco, não esta tela). Busca os próprios dados (não passa
// pelo useEffect gigante do App.tsx), igual Mensagens.
export default function Acessos(p) {
  const D = p.D, st = p.st;
  const [resumo, setResumo] = useState([]);
  const [geral, setGeral] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
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
    setAtualizadoEm(new Date());
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
  const primeiroAcesso = detalhe.length ? detalhe[detalhe.length-1].created_at : null;

  const inpCompacto = {...st.inp, padding:"7px 10px", fontSize:12.5};

  if(loading) return <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando acessos...</div>;
  if(erro) return <div style={{textAlign:"center",padding:"2rem",color:D.redText,fontSize:13}}>{erro}</div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:D.text}}>Acessos ao sistema</div>
          <div style={{fontSize:12.5,color:D.muted,marginTop:3}}>Visualize o histórico de acesso da equipe e acompanhe a utilização do sistema.</div>
        </div>
        {atualizadoEm&&<div style={{fontSize:11.5,color:D.muted,whiteSpace:"nowrap",paddingTop:2}}>Última atualização: {atualizadoEm.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>}
      </div>

      <div className="bv-acessos-resumo" style={{marginBottom:14}}>
        {[
          {label:"Usuários ativos", value:geral?Number(geral.usuarios_ativos):0},
          {label:"Logins hoje", value:geral?Number(geral.logins_hoje):0},
          {label:"Logins (7 dias)", value:geral?Number(geral.logins_7dias):0},
          {label:"Último acesso", value:geral&&geral.ultimo_acesso?fDataHora(geral.ultimo_acesso):"—"},
        ].map(m=>(
          <div key={m.label} style={{background:D.white,border:"1px solid "+D.border,borderRadius:12,padding:"10px 14px"}}>
            <div style={{fontSize:18,fontWeight:700,color:D.text,lineHeight:1.15}}>{m.value}</div>
            <div style={{fontSize:11,color:D.muted,marginTop:2}}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <div style={{flex:"1 1 180px",position:"relative"}}>
          <Search size={13} color={D.muted} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}/>
          <input style={{...inpCompacto,paddingLeft:28,width:"100%"}} placeholder="Buscar usuário ou e-mail" value={busca} onChange={e=>setBusca(e.target.value)}/>
        </div>
        <select style={{...inpCompacto,width:"auto"}} value={filtroPerfil} onChange={e=>setFiltroPerfil(e.target.value)}>
          <option value="todos">Todos os perfis</option>
          <option value="admin">Supervisora</option>
          <option value="func">Funcionária</option>
          <option value="demo">Demonstração</option>
        </select>
        <select style={{...inpCompacto,width:"auto"}} value={filtroUsuario} onChange={e=>setFiltroUsuario(e.target.value)}>
          <option value="todos">Todos os usuários</option>
          {resumo.map(u=><option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
        </select>
        <select style={{...inpCompacto,width:"auto"}} value={filtroPeriodo} onChange={e=>setFiltroPeriodo(e.target.value)}>
          <option value="todos">Qualquer período</option>
          <option value="hoje">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
      </div>

      <div className="bv-card" style={{...st.card,marginBottom:0}}>
        <div style={{fontWeight:600,fontSize:13.5,color:D.text,marginBottom:12}}>Usuários e acessos</div>
        {visiveis.length===0?(
          <div style={{textAlign:"center",padding:"2rem 0",color:D.muted,fontSize:13}}>Nenhum acesso encontrado com esses filtros.</div>
        ):(
          <div style={{overflowX:"auto"}}>
          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Nome","E-mail","Perfil","Total de acessos","Último acesso",""].map(h=><th key={h} style={{textAlign:"left",padding:"7px 8px",color:D.muted,fontWeight:500,fontSize:11.5}}>{h}</th>)}</tr></thead>
            <tbody>{visiveis.map(u=>{
              const rp = rolePill(u.role,D);
              return (
                <tr key={u.user_id} className="bv-row-click" onClick={()=>abrirDetalhe(u)} style={{borderBottom:"1px solid "+D.border,cursor:"pointer"}}>
                  <td data-label="Nome" style={{padding:"9px 8px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Av name={u.nome} color={D.blue} size={26}/>
                      <span style={{fontWeight:500,color:D.text}}>{u.nome}</span>
                    </div>
                  </td>
                  <td data-label="E-mail" style={{padding:"9px 8px",color:D.muted}}>{u.email||"—"}</td>
                  <td data-label="Perfil" style={{padding:"9px 8px"}}><span style={{fontSize:11,fontWeight:600,background:rp.bg,color:rp.c,borderRadius:20,padding:"2px 9px"}}>{roleLabel(u.role)}</span></td>
                  <td data-label="Total de acessos" style={{padding:"9px 8px",color:D.text,fontWeight:600}}>{Number(u.total_logins)}</td>
                  <td data-label="Último acesso" style={{padding:"9px 8px",color:D.muted}}>{u.ultimo_login?fDataHora(u.ultimo_login):"Nunca acessou"}</td>
                  <td style={{padding:"9px 8px",textAlign:"right"}}>
                    <button onClick={e=>{e.stopPropagation();abrirDetalhe(u);}} style={{...st.btn,padding:"4px 8px",fontSize:11,border:"none",background:"transparent",color:D.muted}}>Detalhes<ChevronRight size={12}/></button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          </div>
        )}
      </div>

      {detalheDe&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>setDetalheDe(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:16,padding:"1.5rem",maxWidth:440,width:"100%",maxHeight:"82vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Av name={detalheDe.nome} color={D.blue} size={38}/>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:D.text}}>{detalheDe.nome}</div>
                  <div style={{fontSize:12,color:D.muted,marginTop:1}}>{roleLabel(detalheDe.role)}{detalheDe.setor?" · "+detalheDe.setor:""}</div>
                </div>
              </div>
              <button onClick={()=>setDetalheDe(null)} style={{...st.btn,padding:"6px 8px",border:"none",background:"transparent"}}><X size={15}/></button>
            </div>

            <div style={{background:D.bg,borderRadius:10,padding:"4px 14px",marginBottom:18}}>
              {[
                {label:"Total de acessos", value:Number(detalheDe.total_logins)},
                {label:"Último acesso", value:detalheDe.ultimo_login?fDataHora(detalheDe.ultimo_login):"Nunca acessou"},
                {label:"Primeiro acesso", value:primeiroAcesso?fDataHora(primeiroAcesso):"—"},
              ].map((r,i)=>(
                <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderTop:i>0?"1px solid "+D.border:"none"}}>
                  <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
                  <span style={{fontSize:13,color:D.text,fontWeight:600}}>{r.value}</span>
                </div>
              ))}
            </div>

            <div style={{fontWeight:600,fontSize:13,color:D.text,marginBottom:8}}>Histórico de acessos</div>
            {detalheLoading?(
              <div style={{textAlign:"center",padding:"1.5rem 0",color:D.muted,fontSize:13}}>Carregando histórico...</div>
            ):detalheVisivel.length===0?(
              <div style={{textAlign:"center",padding:"1.5rem 0",color:D.muted,fontSize:13}}>Nenhum acesso registrado nesse período.</div>
            ):(
              <div style={{overflowX:"auto"}}>
              <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
                <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Data","Horário","Dispositivo"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 6px",color:D.muted,fontWeight:500,fontSize:11}}>{h}</th>)}</tr></thead>
                <tbody>{detalheVisivel.map(h=>(
                  <tr key={h.id} style={{borderBottom:"1px solid "+D.border}}>
                    <td data-label="Data" style={{padding:"8px 6px",color:D.text,display:"flex",alignItems:"center",gap:6}}><LogIn size={11} color={D.green}/>{fData(h.created_at)}</td>
                    <td data-label="Horário" style={{padding:"8px 6px",color:D.muted}}>{fHora(h.created_at)}</td>
                    <td data-label="Dispositivo" style={{padding:"8px 6px",color:D.muted}}>
                      {dispositivo(h.user_agent)}
                      {h.ip_address&&<div style={{fontSize:10,color:D.muted,opacity:0.75,marginTop:1}}>{h.ip_address}</div>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
