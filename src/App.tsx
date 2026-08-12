import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { LayoutDashboard, Receipt, Clock, FileText, Bell, Search, LogOut, Plus, ChevronRight, CheckCircle, AlertCircle, Calendar, User, Settings, X, Printer, ArrowRight, Pencil, Check, Zap, Eye, EyeOff, Lock, Edit3, Save, Moon, Sun, ClipboardList, Users, Mail, Menu, Trash2, MessageCircle } from "lucide-react";
import type { User as UserType, Tarefa, Contrato, AuditEntry, AppStyles } from "./types";
import { LIGHT, DARK, hoje, TIPO_MOD, MODELOS_INIT, AUDIT_IC } from "./constants";
import { getIn, fBRL, fillTpl, nowT, nowF, mapProfileRow, mapDiretorioRow, fallbackProfile, mapTarefaRow, mapPendenciaRow, mapContratoRow, mapRepresentanteRow, mapAuditoriaRow, validarImagem, lerComoDataURL } from "./lib/helpers";
import Badge from "./components/Badge";
import Av from "./components/Av";
import MCard from "./components/MCard";
import Calendario from "./components/Calendario";
import Mensagens from "./components/Mensagens";
import MiniCalendario from "./components/MiniCalendario";
import StatusDonutCard from "./components/StatusDonutCard";
import GoogleIcon from "./components/GoogleIcon";

export default function App() {
  const [dark, setDark] = useState(false);
  const D = dark ? DARK : LIGHT;
  const st: AppStyles = {
    inp:{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10,border:"1px solid "+D.border,fontSize:14,background:dark?D.bg:D.white,color:D.text,outline:"none",boxShadow:"inset 0 1px 2px rgba(15,23,42,0.04)",transition:"border-color .15s ease, box-shadow .15s ease"},
    lbl:{fontSize:12,color:D.muted,display:"block",marginBottom:5,fontWeight:500},
    btn:{padding:"8px 16px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:13,color:D.text,display:"inline-flex",alignItems:"center",gap:6,fontWeight:500,boxShadow:"0 2px 8px rgba(15,23,42,0.04)",transition:"transform .15s ease, box-shadow .15s ease, background-color .15s ease"},
    btnBlue:{padding:"9px 18px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:13,color:"#fff",display:"inline-flex",alignItems:"center",gap:6,fontWeight:600,boxShadow:"0 10px 24px rgba(37, 99, 235, 0.24)",transition:"transform .15s ease, box-shadow .15s ease, filter .15s ease"},
    card:{background:D.white,borderRadius:20,border:"1px solid "+D.border,padding:"1.4rem 1.5rem",marginBottom:12,boxShadow:"0 1px 2px rgba(15,23,42,0.04), 0 16px 40px rgba(15,23,42,0.07)",transition:"transform .18s ease, box-shadow .18s ease"},
  };

  const [users, setUsers] = useState<UserType[]>([]);
  const [user, setUser]   = useState<UserType | null>(null);
  const [demoMsg, setDemoMsg] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [senhaVis, setSenhaVis] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email"|"sent">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotErr, setForgotErr] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [novaSenha1, setNovaSenha1] = useState("");
  const [novaSenha2, setNovaSenha2] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [tab, setTab] = useState("painel");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [representantes, setRepresentantes] = useState([]);
  const [showRepForm, setShowRepForm] = useState(false);
  const [repForm, setRepForm] = useState({id:null,nome:"",cpf:"",regiao:"Pará",supervisorId:"",status:"Ativo",dataEntrada:hoje,dataSaida:"",motivoSaida:"",numeroCore:"",tipoVinculo:"",vinculoDataInicio:"",vinculoDataTerminoPrevisto:"",statusContrato:"",contratoDataEnvio:"",contratoDataConclusao:""});
  const [repFormErr, setRepFormErr] = useState("");
  const [repSearch, setRepSearch] = useState("");
  const [repFiltroRegiao, setRepFiltroRegiao] = useState("todos");
  const [repFiltroStatus, setRepFiltroStatus] = useState("todos");
  const [repFiltroSupervisor, setRepFiltroSupervisor] = useState("todos");
  const [modelos, setModelos] = useState({...MODELOS_INIT});
  const [prorrogacoes, setProrrogacoes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [notifs, setNotifs] = useState([{id:1,msg:"Bem-vinda ao BP-Visionn!",time:"00:00",read:false}]);
  const [showNotif, setShowNotif] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [filtroAudit, setFiltroAudit] = useState("todos");
  const [showTForm, setShowTForm] = useState(false);
  const [showCForm, setShowCForm] = useState(false);
  const [showProrr, setShowProrr] = useState<string | null>(null);
  const [showProrrForm, setShowProrrForm] = useState(false);
  const [showContrato, setShowContrato] = useState<Contrato | null>(null);
  const [editDoc, setEditDoc] = useState(false);
  const [docEdit, setDocEdit] = useState("");
  const [abaC, setAbaC] = useState("lista");
  const [editMod, setEditMod] = useState<string | null>(null);
  const [modEdit, setModEdit] = useState("");
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [newT, setNewT] = useState({fornecedor:"",valor:"",vencimento:"",responsavel:"",obs:""});
  const [newC, setNewC] = useState({representanteId:"",cpfCnpj:"",porcentagem:"",email:"",telefone:"",dataInicio:hoje,tipo:"vendedor"});
  const [newPr, setNewPr] = useState({fornecedor:"",nf:"",vencimento:"",estado:"Aguardando retorno"});
  const [prorr, setProrr] = useState({novoVencimento:"",motivo:""});
  const [prorrErr, setProrrErr] = useState("");
  const [editU, setEditU] = useState<string | null>(null);
  const [editN, setEditN] = useState("");
  const [editS, setEditS] = useState("");
  const [editSetor, setEditSetor] = useState("");
  const [showNewU, setShowNewU] = useState(false);
  const [newU, setNewU] = useState({name:"",setor:"",role:"func",email:"",senha:""});
  const [newUErr, setNewUErr] = useState("");
  const [newULoading, setNewULoading] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmDelUser, setConfirmDelUser] = useState<{id:string,name:string} | null>(null);
  const [delUserLoading, setDelUserLoading] = useState(false);
  const [delUserErr, setDelUserErr] = useState("");
  const [revealedEmails, setRevealedEmails] = useState<Record<string,string>>({});
  const [emailLoadingId, setEmailLoadingId] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<Record<string,string>>({});
  const [editT, setEditT] = useState<string | null>(null);
  const [editTData, setEditTData] = useState({fornecedor:"",valor:"" as number | string,vencimento:"",responsavel:"",obs:""});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");
  const [naoLidasChat, setNaoLidasChat] = useState(0);
  const [demoResponsavelId, setDemoResponsavelId] = useState<string | null>(null);
  const [demoFuncionariosTeste, setDemoFuncionariosTeste] = useState<string[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user && user.role==="admin";
  const isFin   = user && user.setor==="Financeiro";
  const isDemo  = user && user.role==="demo";
  // Funcionária do financeiro: na aba Tarefas ela vê o grid de Prorrogação de
  // Boletos + Calendário — a lista de Tarefas entra na coluna principal desse
  // mesmo grid (logo abaixo de Prorrogação), em vez de ficar solta depois
  // dele (que deixava um vão vazio quando a coluna lateral era mais alta).
  const tarefasNoGridFin = !isAdmin && !isDemo && isFin;

  // Demonstração só enxerga a tarefa destinada a teste@bp-visionn.com — o
  // RLS (tarefa_visivel_para_demo) já garante isso na consulta em si, este
  // filtro aqui é defesa em profundidade do lado do cliente, não a proteção
  // principal.
  const tVis = (isAdmin ? tarefas : isDemo ? tarefas.filter(t=>t.responsavel===demoResponsavelId) : tarefas.filter(t=>t.responsavel===(user&&user.id)))
    .filter(t=>(fStatus==="todos"||t.status===fStatus)&&(!search||t.fornecedor.toLowerCase().includes(search.toLowerCase())));
  const pends    = tarefas.filter(t=>t.status==="pendente"||t.status==="vencido");
  const pendsVis = isAdmin ? pends : isDemo ? pends.filter(t=>t.responsavel===demoResponsavelId) : pends.filter(t=>t.responsavel===(user&&user.id));
  const unread   = notifs.filter(n=>!n.read).length;
  const responsavelPadrao = (users.find(u=>u.role==="func")||users[0]||{id:""}).id;
  const representantesAtivos = representantes.filter(r=>r.status==="Ativo");
  const representantesVisiveis = representantes.filter(r=>
    (repFiltroRegiao==="todos"||r.regiao===repFiltroRegiao) &&
    (repFiltroStatus==="todos"||r.status===repFiltroStatus) &&
    (repFiltroSupervisor==="todos"||r.supervisorId===repFiltroSupervisor) &&
    (!repSearch || r.nome.toLowerCase().includes(repSearch.toLowerCase()) || (r.cpf&&r.cpf.includes(repSearch)))
  );

  useEffect(()=>{
    function h(e){ if(notifRef.current&&!notifRef.current.contains(e.target)) setShowNotif(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);


  useEffect(()=>{
    let ativo = true;

    // Diretório público (nome/setor/avatar), visível mesmo sem login — alimenta
    // o seletor de conta e o preview da tela de login. Só preenche se "users"
    // ainda estiver vazio, pra nunca sobrescrever a lista completa já carregada.
    async function carregarDiretorioPublico(){
      const { data, error } = await supabase.rpc("profiles_publico");
      if(!ativo||error||!data) return;
      setUsers(prev=>prev.length?prev:data.map(mapDiretorioRow));
    }

    // Lista completa (todos os campos), exige usuário autenticado — é o que
    // alimenta Configurações > Equipe, os seletores de responsável etc.
    async function sincronizarUsuarios(userId){
      // Sem "email" de propósito: a coluna foi revogada para "authenticated"
      // no banco (ver migration 20260811160000) — só é lida sob demanda via
      // get_user_email(), quando a Supervisora clica em "Ver e-mail".
      const { data, error } = await supabase.from("profiles").select("id,name,role,setor,initials,color,photo_url,status,last_access").order("name");
      if(!ativo) return null;
      if(error||!data){ return null; }
      const lista = data.map(mapProfileRow);
      setUsers(lista);
      const atual = lista.find(u=>u.id===userId) || null;
      setUser(atual);
      return atual;
    }

    function marcarOnline(userId){
      return supabase.from("profiles").update({ status:"online", last_access: new Date().toISOString() }).eq("id", userId);
    }

    // Todas as tarefas (RLS já filtra: admin vê tudo, funcionária só as suas),
    // com o histórico de prorrogações trazido junto numa única consulta.
    async function carregarTarefas(){
      const { data, error } = await supabase.from("tarefas").select("*, tarefas_historico(id, novo_vencimento, motivo, created_at)").order("vencimento");
      if(!ativo||error||!data) return;
      setTarefas(data.map(mapTarefaRow));
    }

    // Pendências (NFs em negociação com fornecedores). RLS restringe a
    // admin/Financeiro — para as demais funções a consulta retorna vazio.
    async function carregarPendencias(){
      const { data, error } = await supabase.from("pendencias").select("*").order("created_at",{ascending:false});
      if(!ativo||error||!data) return;
      setProrrogacoes(data.map(mapPendenciaRow));
    }

    // Contratos, já com o nome do representante trazido via representante_id
    // (mesmo esquema de join usado em tarefas_historico).
    async function carregarContratos(){
      const { data, error } = await supabase.from("contratos").select("*, representantes(nome)").order("created_at",{ascending:false});
      if(!ativo||error||!data) return;
      setContratos(data.map(mapContratoRow));
    }

    async function carregarRepresentantes(){
      const { data, error } = await supabase.from("representantes").select("*").order("nome");
      if(!ativo||error||!data) return;
      setRepresentantes(data.map(mapRepresentanteRow));
    }

    // Auditoria: admin/demo veem tudo, Financeiro (e qualquer func) vê só o
    // que está ligado a tarefas das quais é responsável — o RLS já faz esse
    // filtro (auditoria_select_admin + auditoria_select_own_tarefa), então
    // a consulta é a mesma pra todo mundo.
    async function carregarAuditoria(){
      const { data, error } = await supabase.from("auditoria").select("*").order("created_at",{ascending:false});
      if(!ativo||error||!data) return;
      setAuditLog(data.map(mapAuditoriaRow));
    }

    // Id do profile autorizado pra Demonstração ver tarefas (o que tem
    // e-mail teste@bp-visionn.com) — nunca o e-mail em si, só o id, pro
    // filtro client-side de tVis/pendsVis. Sem efeito pra quem não é demo.
    async function carregarDemoResponsavelPermitido(perfil){
      if(!perfil||perfil.role!=="demo") return;
      const { data, error } = await supabase.rpc("demo_responsavel_permitido");
      if(!ativo||error) return;
      setDemoResponsavelId(data||null);
    }

    // Ids das contas descartáveis (teste@/teste2@) que aparecem no widget
    // "Produtividade da equipe" pra Demonstração, no lugar da equipe real —
    // só um filtro de exibição, não uma restrição de RLS (profiles continua
    // listável por qualquer autenticada, usado em outras telas).
    async function carregarDemoFuncionariosTeste(perfil){
      if(!perfil||perfil.role!=="demo") return;
      const { data, error } = await supabase.rpc("demo_funcionarios_teste");
      if(!ativo||error||!data) return;
      setDemoFuncionariosTeste(data);
    }

    carregarDiretorioPublico();

    supabase.auth.getSession().then(async ({data})=>{
      if(!ativo) return;
      if(data.session&&data.session.user){
        await marcarOnline(data.session.user.id);
        const logado = await sincronizarUsuarios(data.session.user.id) || fallbackProfile(data.session.user);
        if(!ativo) return;
        setUser(logado);
        setTab(logado.role==="admin"?"painel":"tarefas");
        carregarTarefas();
        carregarPendencias();
        carregarContratos();
        carregarRepresentantes();
        carregarAuditoria();
        carregarDemoResponsavelPermitido(logado);
        carregarDemoFuncionariosTeste(logado);
      }
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, novaSessao)=>{
      setAuthLoading(false);
      if(event==="PASSWORD_RECOVERY") setPasswordRecovery(true);
      if(event==="SIGNED_OUT") setUser(null);
      if((event==="SIGNED_IN"||event==="USER_UPDATED")&&novaSessao&&novaSessao.user){
        const aposMarcar = event==="SIGNED_IN" ? marcarOnline(novaSessao.user.id) : Promise.resolve();
        aposMarcar.then(()=>sincronizarUsuarios(novaSessao.user.id)).then(logado=>{
          if(!ativo) return;
          const perfil = logado||fallbackProfile(novaSessao.user);
          if(!logado) setUser(perfil);
          if(event==="SIGNED_IN") setTab(perfil.role==="admin"?"painel":"tarefas");
          carregarDemoResponsavelPermitido(perfil);
          carregarDemoFuncionariosTeste(perfil);
        });
        if(event==="SIGNED_IN"){ carregarTarefas(); carregarPendencias(); carregarContratos(); carregarRepresentantes(); carregarAuditoria(); }
      }
    });

    return ()=>{ ativo=false; sub.subscription.unsubscribe(); };
  },[]);

  function addN(msg){ setNotifs(p=>[{id:Date.now(),msg,time:nowT(),read:false},...p].slice(0,20)); }
  // Grava local (otimista, aparece na hora pra quem agiu) e no Supabase — a
  // auditoria precisa existir de verdade no banco pra outra pessoa (ex.:
  // Financeiro vendo tarefa atribuída a ela) enxergar o que não foi ação
  // dela própria. "tarefaId" liga o registro à tarefa (RLS usa esse vínculo
  // pra decidir quem mais, além de admin/demo, pode ver a linha).
  function addA(tipo,tarefa,detalhe,tarefaId=null){
    setAuditLog(p=>[{id:Date.now(),tipo,tarefa,usuario:user?user.name:"",hora:nowF(),detalhe},...p]);
    if(user){
      supabase.from("auditoria").insert({
        tipo, referencia:tarefa, detalhe,
        usuario_id:user.id, usuario_nome:user.name,
        tarefa_id:tarefaId||null,
      });
    }
  }
  function eCor(e){ return ({"Aguardando retorno":{bg:D.orangeSoft,c:D.orangeText},"Em negociação":{bg:D.blueSoft,c:D.blueText},"Aprovado":{bg:D.greenSoft,c:D.greenText},"Recusado":{bg:D.redSoft,c:D.redText}})[e]||{bg:D.bg,c:D.muted}; }
  function roleLabel(r){ return r==="admin"?"Supervisora":r==="demo"?"Demonstração":"Funcionária"; }

  // Título + filtro + formulário "Nova Tarefa" + lista de cards. Extraído pra
  // função porque precisa aparecer em dois lugares diferentes do layout da
  // aba Tarefas dependendo do perfil (ver "tarefasNoGridFin" acima) sem
  // duplicar o JSX nem sua lógica.
  function TarefasSecao(){
    return (
      <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Tarefas</div><div style={{fontSize:13,color:D.muted}}>{tVis.length} resultado(s)</div></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{...st.inp,width:"auto",fontSize:13}}>
              <option value="todos">Todos</option><option value="pendente">Pendente</option><option value="vencido">Urgente</option><option value="prorrogado">Prorrogado</option><option value="pago">Concluída</option>
            </select>
            {isAdmin&&<button style={st.btnBlue} onClick={()=>setShowTForm(p=>!p)}><Plus size={15}/>Nova Tarefa</button>}
          </div>
        </div>
        {showTForm&&(
          <div className="bv-card" style={{...st.card,borderColor:D.blue,marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:14}}>Nova Tarefa</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div><label style={st.lbl}>Fornecedor</label><input style={st.inp} value={newT.fornecedor} onChange={e=>setNewT(p=>({...p,fornecedor:e.target.value}))}/></div>
              <div><label style={st.lbl}>Valor (opcional)</label><input type="number" style={st.inp} value={newT.valor} onChange={e=>setNewT(p=>({...p,valor:e.target.value}))}/></div>
              <div><label style={st.lbl}>Vencimento</label><input type="date" style={st.inp} value={newT.vencimento} onChange={e=>setNewT(p=>({...p,vencimento:e.target.value}))}/></div>
              <div><label style={st.lbl}>Responsável</label>
                <select style={st.inp} value={newT.responsavel||responsavelPadrao} onChange={e=>setNewT(p=>({...p,responsavel:e.target.value}))}>
                  {users.filter(u=>u.role==="func").map(u=><option key={u.id} value={u.id}>{u.name} — {u.setor}</option>)}
                </select>
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Observação</label><input style={st.inp} value={newT.obs} onChange={e=>setNewT(p=>({...p,obs:e.target.value}))}/></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:14}}><button style={st.btnBlue} onClick={addTarefa}><CheckCircle size={14}/>Salvar</button><button style={st.btn} onClick={()=>setShowTForm(false)}>Cancelar</button></div>
          </div>
        )}
        {tVis.length===0&&<div style={{textAlign:"center",padding:"3rem",color:D.muted,fontSize:14}}>Nenhuma tarefa encontrada.</div>}
        {tVis.map(t=>{
          const fn=users.find(u=>u.id===t.responsavel);
          return (
            <div className="bv-card" key={t.id} style={{...st.card,border:undefined,borderTop:"1px solid "+D.border,borderRight:"1px solid "+D.border,borderBottom:"1px solid "+D.border,borderLeft:t.status==="pago"?"3px solid "+D.green:t.status==="vencido"?"3px solid "+D.red:"1px solid "+D.border,borderRadius:t.status==="pago"||t.status==="vencido"?"0 14px 14px 0":14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:D.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid "+D.border}}><Receipt size={18} color={D.muted}/></div>
                  <div>
                    <div style={{fontWeight:600,fontSize:15,color:D.text}}>{t.fornecedor}</div>
                    <div style={{fontSize:13,color:D.muted,marginTop:3,display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{display:"flex",alignItems:"center",gap:4}}><Calendar size={12}/>{t.vencimento}</span>
                      {Number(t.valor)>0&&<span style={{fontWeight:600,color:D.text}}>{fBRL(t.valor)}</span>}
                      {isAdmin&&fn&&<span style={{display:"flex",alignItems:"center",gap:4}}><User size={12}/>{fn.name}</span>}
                    </div>
                    {t.obs&&<div style={{fontSize:12,color:D.muted,marginTop:4,fontStyle:"italic"}}>{t.obs}</div>}
                  </div>
                </div>
                <Badge status={t.status}/>
              </div>
              {t.historico&&t.historico.length>0&&(
                <div style={{marginTop:10,padding:"8px 12px",background:D.bg,borderRadius:8,fontSize:12,color:D.muted,borderLeft:"3px solid "+D.blue}}>
                  {t.historico.map((h,i)=><div key={i} style={{display:"flex",gap:6}}><ChevronRight size={12}/>Prorrogado em {h.data} → {h.novoVencimento}: {h.motivo}</div>)}
                </div>
              )}
              <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                {isAdmin&&t.status!=="pago"&&(
                  <>
                    <button style={{...st.btn,color:D.orangeText,borderColor:D.orange+"55"}} onClick={()=>{setShowProrr(t.id);setProrr({novoVencimento:"",motivo:""});setProrrErr("");}}><Calendar size={13}/>Prorrogar</button>
                    <button style={{...st.btn,color:D.greenText,borderColor:D.green+"55"}} onClick={()=>setConfirm(t.id)}><CheckCircle size={13}/>Concluir</button>
                  </>
                )}
                {isAdmin&&t.status==="pago"&&<button style={{...st.btn,color:D.redText,borderColor:D.red+"55"}} onClick={()=>reabrir(t.id)}><AlertCircle size={13}/>Reabrir</button>}
                {isAdmin&&<button style={st.btn} onClick={()=>abrirEditT(t)}><Edit3 size={13}/>Editar</button>}
                {isAdmin&&<button style={{...st.btn,color:D.redText,borderColor:D.red+"55"}} onClick={()=>setConfirmDel(t.id)}><X size={13}/>Excluir</button>}
                {!isAdmin&&!isDemo&&t.status!=="pago"&&(
                  <button style={{padding:"9px 18px",borderRadius:10,border:"none",background:D.green,cursor:"pointer",fontSize:13,color:"#ffffff",fontWeight:600,display:"inline-flex",alignItems:"center",gap:8}} onClick={()=>setConfirm(t.id)}>
                    <CheckCircle size={15}/>Concluir Tarefa
                  </button>
                )}
                {!isAdmin&&t.status==="pago"&&<div style={{padding:"7px 14px",background:D.greenSoft,borderRadius:10,fontSize:12,color:D.greenText,display:"inline-flex",alignItems:"center",gap:6,fontWeight:500}}><CheckCircle size={13}/>Concluída</div>}
              </div>
              {showProrr===t.id&&(
                <div style={{marginTop:12,padding:14,background:D.bg,borderRadius:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                  <div><label style={st.lbl}>Novo vencimento</label><input type="date" style={st.inp} value={prorr.novoVencimento} onChange={e=>setProrr(p=>({...p,novoVencimento:e.target.value}))}/></div>
                  <div><label style={st.lbl}>Motivo</label><input style={st.inp} value={prorr.motivo} onChange={e=>setProrr(p=>({...p,motivo:e.target.value}))}/></div>
                  {prorrErr&&<div style={{gridColumn:"1/-1",fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{prorrErr}</div>}
                  <div style={{gridColumn:"1/-1",display:"flex",gap:8}}><button style={st.btnBlue} onClick={()=>prorrogar(t.id)}>Confirmar</button><button style={st.btn} onClick={()=>{setShowProrr(null);setProrrErr("");}}>Cancelar</button></div>
                </div>
              )}
              {editT===t.id&&(
                <div style={{marginTop:12,padding:14,background:D.bg,borderRadius:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                  <div><label style={st.lbl}>Fornecedor</label><input style={st.inp} value={editTData.fornecedor} onChange={e=>setEditTData(p=>({...p,fornecedor:e.target.value}))}/></div>
                  <div><label style={st.lbl}>Valor (opcional)</label><input type="number" style={st.inp} value={editTData.valor} onChange={e=>setEditTData(p=>({...p,valor:e.target.value}))}/></div>
                  <div><label style={st.lbl}>Vencimento</label><input type="date" style={st.inp} value={editTData.vencimento} onChange={e=>setEditTData(p=>({...p,vencimento:e.target.value}))}/></div>
                  <div><label style={st.lbl}>Responsável</label>
                    <select style={st.inp} value={editTData.responsavel} onChange={e=>setEditTData(p=>({...p,responsavel:e.target.value}))}>
                      {users.filter(u=>u.role==="func").map(u=><option key={u.id} value={u.id}>{u.name} — {u.setor}</option>)}
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Observação</label><input style={st.inp} value={editTData.obs} onChange={e=>setEditTData(p=>({...p,obs:e.target.value}))}/></div>
                  <div style={{gridColumn:"1/-1",display:"flex",gap:8}}><button style={st.btnBlue} onClick={salvarEditT}><Save size={13}/>Salvar</button><button style={st.btn} onClick={()=>setEditT(null)}>Cancelar</button></div>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  }
  // Prévia local dos 90 dias, só pra exibir no formulário antes de salvar
  // (o valor de verdade é a coluna gerada no banco, vinculo_data_termino_previsto).
  function fmtTerminoPrevisto(dataInicioStr){
    if(!dataInicioStr) return "—";
    const d = new Date(dataInicioStr+"T00:00:00");
    d.setDate(d.getDate()+90);
    return d.toISOString().split("T")[0];
  }
  // Dias restantes até o término previsto do contrato temporário (negativo = já venceu).
  function diasParaVencerVinculo(r){
    if(r.tipoVinculo!=="temporario"||!r.vinculoDataTerminoPrevisto) return null;
    const hojeD = new Date(hoje+"T00:00:00");
    const termino = new Date(r.vinculoDataTerminoPrevisto+"T00:00:00");
    return Math.round((termino.getTime()-hojeD.getTime())/86400000);
  }
  const LIMITE_ALERTA_VINCULO_DIAS = 15;
  const vinculoLabel = {temporario:"Temporário",fixo:"Fixo",recibo:"Recibo"};
  // Guarda central pro perfil DEMONSTRAÇÃO: nenhum handler de escrita segue
  // adiante sem passar por aqui, mesmo que algum botão não tenha sido
  // escondido corretamente. O bloqueio de verdade está no RLS (o perfil
  // demo não consegue gravar nada mesmo chamando a API direto); isso aqui
  // só evita a chamada e mostra uma mensagem amigável.
  function bloqueadoDemo(){
    if(!isDemo) return false;
    setDemoMsg(true);
    setTimeout(()=>setDemoMsg(false),3000);
    return true;
  }

  async function doLogin(){
    const email = loginEmail.trim();
    if(!email||!loginSenha){ setLoginErr("Informe e-mail e senha."); return; }
    setLoginErr(""); setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: loginSenha });
    setLoginLoading(false);
    if(error){ setLoginErr("E-mail ou senha incorretos."); return; }
    setLoginSenha("");
  }

  function doLogout(){
    if(user) supabase.from("profiles").update({ status:"offline" }).eq("id", user.id);
    setUser(null); setLoginSenha("");
    supabase.auth.signOut();
  }

  function abrirForgot(){
    setShowForgot(true); setForgotStep("email"); setForgotEmail(loginEmail); setForgotErr("");
  }

  function fecharForgot(){
    setShowForgot(false); setForgotStep("email"); setForgotEmail(""); setForgotErr("");
  }

  async function enviarRecuperacao(){
    const email = forgotEmail.trim();
    if(!email){ setForgotErr("Informe o e-mail."); return; }
    setForgotErr(""); setForgotLoading(true);
    try{
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    } finally {
      setForgotLoading(false);
      setForgotStep("sent");
    }
  }

  async function definirNovaSenha(){
    if(novaSenha1.length<6){ setForgotErr("A senha deve ter ao menos 6 caracteres."); return; }
    if(novaSenha1!==novaSenha2){ setForgotErr("As senhas não coincidem."); return; }
    setForgotErr(""); setRecoveryLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha1 });
    setRecoveryLoading(false);
    if(error){ setForgotErr("Não foi possível alterar a senha. Tente novamente."); return; }
    setPasswordRecovery(false); setNovaSenha1(""); setNovaSenha2("");
  }

  function preencherEmailGoogle(id){
    const f=users.find(u=>u.id===id);
    if(!f||!f.email) return;
    setLoginEmail(f.email); setLoginErr(""); setLoginSenha(""); setShowGoogle(false);
  }

  async function salvarFoto(){
    if(bloqueadoDemo()) return;
    if(!photoPreview||!user) return;
    const { error } = await supabase.from("profiles").update({ photo_url: photoPreview }).eq("id", user.id);
    if(error){ setPhotoErr("Não foi possível salvar a foto. Tente novamente."); return; }
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,photo:photoPreview}:u));
    setUser(u=>u?{...u,photo:photoPreview}:u);
    setPhotoPreview(null); setPhotoErr("");
  }

  async function removerFoto(){
    if(bloqueadoDemo()) return;
    if(!user) return;
    const { error } = await supabase.from("profiles").update({ photo_url: null }).eq("id", user.id);
    if(error){ setPhotoErr("Não foi possível remover a foto. Tente novamente."); return; }
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,photo:null}:u));
    setUser(u=>u?{...u,photo:null}:u);
    setPhotoPreview(null); setPhotoErr("");
  }

  async function onFotoSelecionada(file){
    if(!file) return;
    const v = validarImagem(file);
    if(!v.ok){ setPhotoErr(v.erro); setPhotoPreview(null); return; }
    setPhotoErr("");
    setPhotoPreview(await lerComoDataURL(file));
  }

  async function concluir(id){
    if(bloqueadoDemo()) return;
    const t=tarefas.find(x=>x.id===id); if(!t) return;
    const { error } = await supabase.from("tarefas").update({ status:"pago" }).eq("id", id);
    if(error) return;
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,status:"pago"}:x));
    addN("🔔 "+(user?user.name:"")+" concluiu \""+t.fornecedor+"\".");
    addA("Tarefa concluída",t.fornecedor,"Concluída por "+(user?user.name:"")+" em "+nowF(),id);
    setConfirm(null);
  }

  async function reabrir(id){
    if(bloqueadoDemo()) return;
    const t=tarefas.find(x=>x.id===id); if(!t) return;
    const { error } = await supabase.from("tarefas").update({ status:"pendente" }).eq("id", id);
    if(error) return;
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,status:"pendente"}:x));
    addA("Status alterado",t.fornecedor,"Concluída → Pendente",id);
  }

  async function prorrogar(id){
    if(bloqueadoDemo()) return;
    if(!prorr.novoVencimento||!prorr.motivo){ setProrrErr("Preencha o novo vencimento e o motivo."); return; }
    const t=tarefas.find(x=>x.id===id);
    const { error: errUpd } = await supabase.from("tarefas").update({ vencimento:prorr.novoVencimento, status:"prorrogado" }).eq("id", id);
    if(errUpd){ setProrrErr("Não foi possível salvar a prorrogação. Tente novamente."); return; }
    const { error: errHist } = await supabase.from("tarefas_historico").insert({ tarefa_id:id, novo_vencimento:prorr.novoVencimento, motivo:prorr.motivo, criado_por:user?user.id:null });
    if(errHist){ setProrrErr("Vencimento salvo, mas o histórico não pôde ser registrado."); return; }
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,vencimento:prorr.novoVencimento,status:"prorrogado",historico:(x.historico||[]).concat([{data:hoje,...prorr}])}:x));
    addN("Prorrogação: "+(t?t.fornecedor:""));
    addA("Prorrogação",t?t.fornecedor:"","Novo vencimento: "+prorr.novoVencimento,id);
    setShowProrr(null); setProrr({novoVencimento:"",motivo:""}); setProrrErr("");
  }

  async function addTarefa(){
    if(bloqueadoDemo()) return;
    const responsavelId = newT.responsavel || responsavelPadrao;
    if(!newT.fornecedor||!newT.vencimento||!responsavelId) return;
    const resp=users.find(u=>u.id===responsavelId);
    const status = newT.vencimento<hoje?"vencido":"pendente";
    const { data, error } = await supabase.from("tarefas").insert({
      fornecedor: newT.fornecedor,
      valor: newT.valor===""?null:Number(newT.valor),
      vencimento: newT.vencimento,
      responsavel_id: responsavelId,
      observacao: newT.obs,
      status,
    }).select().single();
    if(error||!data) return;
    setTarefas(prev=>prev.concat([mapTarefaRow(data)]));
    addN("Nova tarefa: "+newT.fornecedor); addA("Tarefa criada",newT.fornecedor,"Atribuída a "+(resp?resp.name:""),data.id);
    setNewT({fornecedor:"",valor:"",vencimento:"",responsavel:"",obs:""}); setShowTForm(false);
  }

  async function mudaResp(id,nid){
    if(bloqueadoDemo()) return;
    const t=tarefas.find(x=>x.id===id);
    const ant=users.find(u=>u.id===(t?t.responsavel:""));
    const nov=users.find(u=>u.id===nid);
    const { error } = await supabase.from("tarefas").update({ responsavel_id:nid }).eq("id", id);
    if(error) return;
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,responsavel:nid}:x));
    addA("Responsável alterado",t?t.fornecedor:"",(ant?ant.name:"?")+" → "+(nov?nov.name:"?"),id);
  }

  function abrirEditT(t){
    setEditT(t.id);
    setEditTData({fornecedor:t.fornecedor,valor:t.valor,vencimento:t.vencimento,responsavel:t.responsavel,obs:t.obs});
  }

  async function salvarEditT(){
    if(bloqueadoDemo()) return;
    if(!editTData.fornecedor||!editTData.vencimento) return;
    const atual = tarefas.find(x=>x.id===editT);
    const status = atual&&atual.status==="pago" ? "pago" : (editTData.vencimento<hoje?"vencido":"pendente");
    const { error } = await supabase.from("tarefas").update({
      fornecedor: editTData.fornecedor,
      valor: editTData.valor===""?null:Number(editTData.valor),
      vencimento: editTData.vencimento,
      responsavel_id: editTData.responsavel,
      observacao: editTData.obs,
      status,
    }).eq("id", editT);
    if(error) return;
    setTarefas(prev=>prev.map(x=>x.id===editT?{...x,...editTData,status}:x));
    addA("Tarefa editada",editTData.fornecedor,"Dados atualizados por "+(user?user.name:""),editT);
    setEditT(null);
  }

  async function excluirTarefa(id){
    if(bloqueadoDemo()) return;
    const t=tarefas.find(x=>x.id===id);
    const { error } = await supabase.from("tarefas").delete().eq("id", id);
    if(error) return;
    setTarefas(prev=>prev.filter(x=>x.id!==id));
    // Sem tarefaId aqui de propósito: a tarefa já foi apagada na linha acima,
    // e a FK auditoria.tarefa_id não aceita referenciar um id que não existe
    // mais (diferente de um "on delete set null" numa linha já existente).
    addA("Tarefa excluída",t?t.fornecedor:"","Removida por "+(user?user.name:""));
    addN("🗑️ Tarefa excluída: "+(t?t.fornecedor:""));
    setConfirmDel(null);
  }

  function abrirNovoRep(){
    setRepForm({id:null,nome:"",cpf:"",regiao:"Pará",supervisorId:user?user.id:"",status:"Ativo",dataEntrada:hoje,dataSaida:"",motivoSaida:"",numeroCore:"",tipoVinculo:"",vinculoDataInicio:"",vinculoDataTerminoPrevisto:"",statusContrato:"",contratoDataEnvio:"",contratoDataConclusao:""});
    setRepFormErr(""); setShowRepForm(true);
  }

  function abrirEditarRep(r){
    setRepForm({id:r.id,nome:r.nome,cpf:r.cpf,regiao:r.regiao,supervisorId:r.supervisorId,status:r.status,dataEntrada:r.dataEntrada,dataSaida:r.dataSaida,motivoSaida:r.motivoSaida,numeroCore:r.numeroCore,tipoVinculo:r.tipoVinculo,vinculoDataInicio:r.vinculoDataInicio,vinculoDataTerminoPrevisto:r.vinculoDataTerminoPrevisto,statusContrato:r.statusContrato,contratoDataEnvio:r.contratoDataEnvio,contratoDataConclusao:r.contratoDataConclusao});
    setRepFormErr(""); setShowRepForm(true);
  }

  // Troca de tipo de vínculo = novo período começando: reinicia data de
  // início, status do contrato e datas de envio/conclusão. O período
  // anterior não é perdido — o trigger no banco arquiva automaticamente em
  // representante_vinculos_historico quando salvarRepresentante gravar essa
  // mudança.
  function mudarTipoVinculo(novoTipo){
    setRepForm(p=>({
      ...p,
      tipoVinculo: novoTipo,
      vinculoDataInicio: novoTipo ? hoje : "",
      statusContrato: novoTipo ? "aguardando_assinatura" : "",
      contratoDataEnvio: "",
      contratoDataConclusao: "",
    }));
  }

  function fecharRepForm(){
    setShowRepForm(false); setRepFormErr("");
  }

  async function salvarRepresentante(){
    if(bloqueadoDemo()) return;
    const nome = repForm.nome.trim();
    if(!nome){ setRepFormErr("Informe o nome."); return; }
    if(repForm.status==="Inativo"&&!repForm.dataSaida){ setRepFormErr("Informe a data de saída."); return; }
    const payload = {
      nome,
      cpf: repForm.cpf.trim()||null,
      regiao: repForm.regiao,
      supervisor_id: repForm.supervisorId||null,
      status: repForm.status,
      data_entrada: repForm.dataEntrada||hoje,
      data_saida: repForm.status==="Inativo" ? (repForm.dataSaida||null) : null,
      motivo_saida: repForm.status==="Inativo" ? (repForm.motivoSaida.trim()||null) : null,
      numero_core: repForm.numeroCore.trim()||null,
      tipo_vinculo: repForm.tipoVinculo||null,
      vinculo_data_inicio: repForm.tipoVinculo ? (repForm.vinculoDataInicio||hoje) : null,
      status_contrato: repForm.tipoVinculo ? (repForm.statusContrato||"aguardando_assinatura") : null,
      contrato_data_envio: repForm.contratoDataEnvio||null,
      contrato_data_conclusao: repForm.contratoDataConclusao||null,
      // vinculo_data_termino_previsto é coluna gerada (90 dias a partir de
      // vinculo_data_inicio) — nunca enviada, o Postgres calcula sozinho.
    };
    if(repForm.id){
      const { data, error } = await supabase.from("representantes").update(payload).eq("id",repForm.id).select("*").single();
      if(error||!data){ setRepFormErr("Não foi possível salvar as alterações."); return; }
      const atualizado = mapRepresentanteRow(data);
      setRepresentantes(prev=>prev.map(r=>r.id===atualizado.id?atualizado:r).sort((a,b)=>a.nome.localeCompare(b.nome)));
      addA("Edição de informações",nome,"Representante atualizado por "+(user?user.name:""));
    } else {
      const { data, error } = await supabase.from("representantes").insert(payload).select("*").single();
      if(error||!data){ setRepFormErr("Não foi possível criar o representante."); return; }
      const novo = mapRepresentanteRow(data);
      setRepresentantes(prev=>[...prev, novo].sort((a,b)=>a.nome.localeCompare(b.nome)));
      setNewC(p=>({...p, representanteId:novo.id}));
      addN("Novo representante: "+nome); addA("Representante criado",nome,"Região: "+novo.regiao);
    }
    setShowRepForm(false); setRepFormErr("");
  }

  async function addContrato(){
    if(bloqueadoDemo()) return;
    const representanteId = newC.representanteId;
    const porcentagem = (newC.porcentagem || "").toString().trim();
    const porcentagemNum = Number(porcentagem);
    const cpfCnpj = (newC.cpfCnpj || "").trim();
    const email = (newC.email || "").trim();
    const telefone = (newC.telefone || "").trim();
    const dataInicio = newC.dataInicio || hoje;
    const tipo = newC.tipo || "vendedor";

    if(!representanteId || !porcentagem || isNaN(porcentagemNum) || porcentagemNum<0 || porcentagemNum>100){ return; }

    const { data, error } = await supabase.from("contratos").insert({
      representante_id: representanteId,
      tipo, cpf_cnpj: cpfCnpj, porcentagem: porcentagemNum, email, telefone,
      data_inicio: dataInicio, status:"ativo", created_by: user?user.id:null,
    }).select("*, representantes(nome)").single();
    if(error||!data) return;
    const novo = mapContratoRow(data);
    setContratos(prev=>[novo, ...prev]);
    addN("Novo contrato: "+novo.representante); addA("Contrato criado",novo.representante,"Tipo: "+(TIPO_MOD[tipo]?TIPO_MOD[tipo].label:""));
    setShowCForm(false); setNewC({representanteId:"",cpfCnpj:"",porcentagem:"",email:"",telefone:"",dataInicio:hoje,tipo:"vendedor"});
  }

  async function addNF(){
    if(bloqueadoDemo()) return;
    if(!newPr.fornecedor||!newPr.nf) return;
    const { data, error } = await supabase.from("pendencias").insert({
      fornecedor: newPr.fornecedor,
      numero_nf: newPr.nf,
      vencimento: newPr.vencimento || null,
      estado: newPr.estado,
    }).select().single();
    if(error||!data) return;
    setProrrogacoes(prev=>prev.concat([mapPendenciaRow(data)]));
    addN("NF incluída: "+newPr.nf); addA("NF incluída",newPr.fornecedor,"NF: "+newPr.nf);
    setNewPr({fornecedor:"",nf:"",vencimento:"",estado:"Aguardando retorno"}); setShowProrrForm(false);
  }

  async function mudarEstadoNF(id,estado){
    if(bloqueadoDemo()) return;
    const { error } = await supabase.from("pendencias").update({ estado }).eq("id", id);
    if(error) return;
    setProrrogacoes(prev=>prev.map(x=>x.id===id?{...x,estado}:x));
  }

  async function excluirNF(id){
    if(bloqueadoDemo()) return;
    const { error } = await supabase.from("pendencias").delete().eq("id", id);
    if(error) return;
    setProrrogacoes(prev=>prev.filter(x=>x.id!==id));
  }

  function exportPDF(c,txt){
    const titulo=(TIPO_MOD[c.tipo]?TIPO_MOD[c.tipo].label:"Documento");
    const conteudo=txt!==undefined?txt:fillTpl(modelos[c.tipo||"vendedor"],c);
    const w=window.open("","_blank");
    if(!w) return;
    w.opener=null;
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'/><style>@page{margin:2.5cm}body{font-family:'Times New Roman',serif;font-size:12pt;color:#111;line-height:1.8}pre{font-family:inherit;white-space:pre-wrap;font-size:12pt;margin:0}.r{margin-top:48px;font-size:10pt;color:#555;text-align:center;border-top:1px solid #ccc;padding-top:10px}@media print{button{display:none}}</style></head><body></body></html>");
    w.document.close();
    w.document.title=titulo;
    const pre=w.document.createElement("pre");
    pre.textContent=conteudo;
    const rodape=w.document.createElement("div");
    rodape.className="r";
    rodape.textContent="Documento gerado pelo BP-Visionn — "+new Date().toLocaleDateString("pt-BR");
    w.document.body.appendChild(pre);
    w.document.body.appendChild(rodape);
    w.print();
    w.onafterprint=function(){w.close();};
    addA("Exportação PDF",c.representante,titulo+" exportado"); addN("PDF: "+titulo+" — "+c.representante);
  }

  // Salva a última versão do texto do contrato (histórico de revisão) no banco.
  async function salvarDocumento(id,texto){
    if(bloqueadoDemo()) return;
    const { error } = await supabase.from("contratos").update({ documento_texto: texto }).eq("id", id);
    if(error) return;
    setContratos(prev=>prev.map(x=>x.id===id?{...x,documentoTexto:texto}:x));
    setShowContrato(prev=>prev&&prev.id===id?{...prev,documentoTexto:texto}:prev);
  }

  async function saveU(id){
    if(bloqueadoDemo()) return;
    if(!editN.trim()||!editSetor.trim()) return;
    const nome = editN.trim(), setor = editSetor.trim();
    const { error } = await supabase.from("profiles").update({ name:nome, setor, initials:getIn(nome) }).eq("id", id);
    if(error) return;
    const up=users.map(u=>u.id===id?{...u,name:nome,initials:getIn(nome),setor}:u);
    setUsers(up); if(user&&user.id===id) setUser(up.find(u=>u.id===id));
    setEditU(null); setEditN(""); setEditS(""); setEditSetor("");
  }

  // E-mail de outro usuário só é buscado quando a Supervisora clica em "Ver
  // e-mail" — a coluna nem vem na listagem (ver sincronizarUsuarios). O
  // backend (get_user_email, security definer) confere is_admin() de novo,
  // então mesmo essa chamada não adianta nada pra quem não é Supervisora.
  async function verEmail(id){
    if(bloqueadoDemo()) return;
    if(revealedEmails[id]) return;
    setEmailLoadingId(id); setEmailErr(p=>({...p,[id]:""}));
    const { data, error } = await supabase.rpc("get_user_email", { target_id: id });
    setEmailLoadingId(null);
    if(error || typeof data!=="string"){
      setEmailErr(p=>({...p,[id]:"Não foi possível carregar o e-mail."}));
      return;
    }
    setRevealedEmails(p=>({...p,[id]:data}));
  }

  function abrirConfirmDelUser(id,name){
    if(bloqueadoDemo()) return;
    setDelUserErr(""); setConfirmDelUser({id,name});
  }

  async function excluirUsuario(){
    if(!confirmDelUser) return;
    if(bloqueadoDemo()) return;
    setDelUserLoading(true); setDelUserErr("");
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { id: confirmDelUser.id },
    });
    setDelUserLoading(false);
    if(error || !data?.ok){
      let msg = data?.error;
      if(!msg && error && typeof error.context?.json === "function"){
        try { msg = (await error.context.json())?.error; } catch { /* corpo não era JSON */ }
      }
      setDelUserErr(msg || error?.message || "Não foi possível excluir o usuário.");
      return;
    }
    addA("Usuário excluído", confirmDelUser.name, "Conta removida da equipe");
    setUsers(prev=>prev.filter(u=>u.id!==confirmDelUser.id));
    setConfirmDelUser(null);
  }

  function abrirNewU(){
    setShowNewU(true); setNewU({name:"",setor:"",role:"func",email:"",senha:""}); setNewUErr("");
  }

  function fecharNewU(){
    setShowNewU(false); setNewUErr("");
  }

  async function criarUsuario(){
    if(bloqueadoDemo()) return;
    const nome = newU.name.trim();
    const setor = newU.setor.trim();
    const email = newU.email.trim();
    if(!nome){ setNewUErr("Informe o nome."); return; }
    if(!setor){ setNewUErr("Informe o setor."); return; }
    if(!email){ setNewUErr("Informe o e-mail."); return; }
    if(newU.senha.length<6){ setNewUErr("A senha deve ter ao menos 6 caracteres."); return; }
    setNewUErr(""); setNewULoading(true);

    try {
      const { data: created, error: createErr } = await supabase.functions.invoke("create-user", {
        body: { name: nome, email, senha: newU.senha },
      });
      if(createErr || !created?.id){
        // supabase-js só preenche createErr.message com um texto genérico
        // ("Edge Function returned a non-2xx status code"); o motivo real
        // que a função devolveu em JSON só existe em error.context.
        let msg = created?.error;
        if(!msg && createErr && typeof createErr.context?.json === "function"){
          try { msg = (await createErr.context.json())?.error; } catch { /* corpo não era JSON */ }
        }
        setNewUErr(msg || createErr?.message || "Não foi possível criar o usuário.");
        return;
      }

      const cores = ["#2563EB","#8B5CF6","#F59E0B","#22C55E","#EF4444"];
      const { data: atualizado, error: updErr } = await supabase.from("profiles").update({
        setor, role: newU.role, initials: getIn(nome), color: cores[users.length%cores.length],
      }).eq("id", created.id).select("id,name,role,setor,initials,color,photo_url,status,last_access").single();
      if(updErr || !atualizado){
        setNewUErr("Usuário criado no login, mas não foi possível salvar setor/cargo. Edite pela lista de Equipe.");
        return;
      }

      const novo: UserType = mapProfileRow(atualizado);
      setUsers(prev=>[...prev, novo]);
      addA("Usuário criado", nome, "Novo usuário adicionado à equipe ("+setor+")");
      addN("Novo usuário cadastrado: "+nome);
      setShowNewU(false); setNewUErr("");
    } catch(e) {
      setNewUErr("Não foi possível criar o usuário. Verifique sua conexão e tente novamente.");
    } finally {
      setNewULoading(false);
    }
  }

  const NAV=[
    {id:"painel",label:"Dashboard",Icon:LayoutDashboard,show:isAdmin||isDemo},
    {id:"tarefas",label:"Tarefas",Icon:Receipt,show:true},
    {id:"pendencias",label:"Pendências",Icon:Clock,show:true},
    {id:"mensagens",label:"Mensagens",Icon:MessageCircle,show:!isDemo},
    {id:"contratos",label:"Contratos",Icon:FileText,show:isAdmin||isFin||isDemo},
    {id:"representantes",label:"Representantes",Icon:Users,show:isAdmin||isFin||isDemo},
    {id:"calendario",label:"Calendário",Icon:Calendar,show:true},
    {id:"auditoria",label:"Auditoria",Icon:ClipboardList,show:isAdmin||isDemo||isFin},
    {id:"config",label:"Configurações",Icon:Settings,show:!isDemo},
  ].filter(n=>n.show);

  const loginBg = dark ? "radial-gradient(circle at 15% 15%, rgba(62,147,255,0.12), transparent 45%), radial-gradient(circle at 85% 85%, rgba(62,147,255,0.10), transparent 45%), linear-gradient(160deg, #05070D 0%, #0A0F1E 100%)" : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)";

  if(authLoading) return (
    <div className="bv-login-wrap" style={{background:loginBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:dark?"#fff":D.text,fontSize:14,fontWeight:600}}>Carregando...</div>
    </div>
  );

  if(passwordRecovery) return (
    <div className="bv-login-wrap" style={{background:loginBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="bv-modal-card" style={{background:dark?D.bg:D.white,borderRadius:18,padding:"2.5rem",maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}}>
        <div style={{width:48,height:48,borderRadius:12,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Lock size={24} color={D.blue}/></div>
        <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>Defina sua nova senha</div>
        <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>Você seguiu o link de recuperação enviado por e-mail. Escolha uma nova senha para acessar sua conta.</div>
        <label style={st.lbl}>Nova senha</label>
        <input type="password" placeholder="Nova senha" value={novaSenha1} onChange={e=>{setNovaSenha1(e.target.value);setForgotErr("");}} style={{...st.inp,marginBottom:12}} autoFocus/>
        <label style={st.lbl}>Confirmar nova senha</label>
        <input type="password" placeholder="Confirme a nova senha" value={novaSenha2} onChange={e=>{setNovaSenha2(e.target.value);setForgotErr("");}} onKeyDown={e=>e.key==="Enter"&&definirNovaSenha()} style={{...st.inp,marginBottom:12}}/>
        {forgotErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{forgotErr}</div>}
        <button style={{...st.btnBlue,width:"100%",justifyContent:"center",padding:"12px"}} onClick={definirNovaSenha} disabled={recoveryLoading}>{recoveryLoading?"Salvando...":"Salvar nova senha"}</button>
      </div>
    </div>
  );

  if(!user) return (
    <div className="bv-login-wrap" style={{background:loginBg}}>
      <div className="bv-modal-card bv-login-card" style={{boxShadow: dark ? "0 30px 90px rgba(0,0,0,0.55)" : "0 30px 80px rgba(15,23,42,0.18)", border:"1px solid "+(dark?"rgba(62,147,255,0.18)":D.border)}}>
        {/* PAINEL DE MARCA */}
        <div className="bv-login-brand" style={{background:"radial-gradient(circle at 25% 15%, rgba(62,147,255,0.22), transparent 45%), radial-gradient(circle at 80% 88%, rgba(62,147,255,0.14), transparent 50%), linear-gradient(165deg, #060912 0%, #0B1226 100%)"}}>
          <svg viewBox="0 0 400 600" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.5,pointerEvents:"none"}}>
            <path d="M-20,120 C80,60 160,180 260,110 S420,40 460,100" stroke="#3E93FF" strokeWidth="1.2" fill="none" opacity="0.35"/>
            <path d="M-20,260 C90,210 170,320 270,250 S430,190 470,240" stroke="#3E93FF" strokeWidth="1" fill="none" opacity="0.25"/>
            <path d="M-20,420 C100,370 180,470 280,400 S440,340 480,390" stroke="#3E93FF" strokeWidth="1" fill="none" opacity="0.2"/>
            <circle cx="40" cy="500" r="1.5" fill="#3E93FF" opacity="0.5"/>
            <circle cx="70" cy="530" r="1" fill="#3E93FF" opacity="0.4"/>
            <circle cx="30" cy="560" r="1.2" fill="#3E93FF" opacity="0.4"/>
          </svg>
          <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",height:"100%"}}>
            <div style={{width:60,height:60,borderRadius:16,background:"rgba(62,147,255,0.12)",border:"1px solid rgba(62,147,255,0.35)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px rgba(62,147,255,0.25)"}}><Lock size={26} color="#5FA8FF"/></div>
            <div style={{fontSize:26,fontWeight:800,color:"#fff",marginTop:22,letterSpacing:"-0.5px"}}>BP-Visionn</div>
            <div style={{fontSize:14,color:"#9FB0D0",marginTop:8,lineHeight:1.5}}>Gestão inteligente<br/>financeira e operacional</div>
            <div style={{width:38,height:3,borderRadius:2,background:"#3E93FF",margin:"20px 0"}}/>
            <div style={{fontSize:13,color:"#7C8AAE",lineHeight:1.7,maxWidth:230}}>Solução completa para supervisão e controle de pendências, contratos e boletos.</div>
          </div>
        </div>

        {/* PAINEL DE LOGIN */}
        <div className="bv-login-form" style={{background:dark?D.bg:D.white}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:18}}>
            <button onClick={()=>setDark(p=>!p)} style={{...st.btn,padding:"8px 14px",fontSize:12.5}}>{dark?<><Sun size={15} color={D.orange}/>Modo claro</>:<><Moon size={15} color={D.muted}/>Modo escuro</>}</button>
          </div>
          <div style={{fontSize:24,fontWeight:800,color:D.text}}>Bem-vinda de volta! 👋</div>
          <div style={{fontSize:13.5,color:D.muted,marginTop:6,marginBottom:26}}>Faça login para acessar sua conta</div>

          <label style={st.lbl}>E-mail</label>
          <div style={{position:"relative",marginBottom:12}}>
            <Mail size={15} color={D.muted} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input type="email" placeholder="seu.email@bp-visionn.com" value={loginEmail} onChange={e=>{setLoginEmail(e.target.value);setLoginErr("");}} style={{...st.inp,paddingLeft:36}} autoFocus/>
          </div>
          {users.filter(u=>u.email&&u.email.toLowerCase()===loginEmail.trim().toLowerCase()).map(u=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:dark?D.white:D.bg,borderRadius:10,marginBottom:16,border:"1px solid "+D.border}}>
              <Av name={u.name} initials={u.initials} color={u.color} size={32}/>
              <div><div style={{fontWeight:600,fontSize:13,color:D.text}}>{u.name}</div><div style={{fontSize:11,color:D.muted}}>{u.setor}</div></div>
            </div>
          ))}

          <label style={st.lbl}>Senha</label>
          <div style={{position:"relative",marginBottom:12}}>
            <input type={senhaVis?"text":"password"} placeholder="Digite sua senha" value={loginSenha} onChange={e=>{setLoginSenha(e.target.value);setLoginErr("");}} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{...st.inp,paddingRight:40}}/>
            <button onClick={()=>setSenhaVis(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:D.muted,display:"flex"}}>{senhaVis?<EyeOff size={16}/>:<Eye size={16}/>}</button>
          </div>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,fontSize:12.5,flexWrap:"wrap",gap:8}}>
            <label style={{display:"flex",alignItems:"center",gap:7,color:D.muted,cursor:"pointer"}}>
              <input type="checkbox" checked={lembrar} onChange={e=>setLembrar(e.target.checked)} style={{accentColor:D.blue,width:14,height:14,cursor:"pointer"}}/>
              Lembrar deste dispositivo
            </label>
            <span onClick={abrirForgot} style={{color:D.blue,fontWeight:600,cursor:"pointer"}}>Esqueci minha senha</span>
          </div>

          {loginErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{loginErr}</div>}

          <button style={{...st.btnBlue,width:"100%",justifyContent:"center",padding:"12px"}} onClick={doLogin} disabled={loginLoading}>{loginLoading?"Entrando...":<>Entrar <ArrowRight size={15}/></>}</button>

          <div style={{display:"flex",alignItems:"center",gap:12,margin:"14px 0 10px"}}>
            <div style={{flex:1,height:1,background:D.border}}/>
            <span style={{fontSize:12,color:D.muted}}>ou</span>
            <div style={{flex:1,height:1,background:D.border}}/>
          </div>

          <button onClick={()=>setShowGoogle(true)} style={{...st.btn,width:"100%",justifyContent:"center",padding:"11px",background:dark?D.bg:D.white}}>
            <GoogleIcon size={16}/>
            Entrar com Google
          </button>
        </div>
      </div>

      {showForgot&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={fecharForgot}>
          <div className="bv-modal-card" style={{background:dark?D.bg:D.white,borderRadius:18,padding:"2rem",maxWidth:380,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            {forgotStep==="email"&&(
              <>
                <div style={{width:48,height:48,borderRadius:12,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Mail size={24} color={D.blue}/></div>
                <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>Esqueci minha senha</div>
                <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>Informe o e-mail da sua conta. Enviaremos um link para você redefinir sua senha.</div>
                <label style={st.lbl}>E-mail</label>
                <input type="email" placeholder="seu.email@bp-visionn.com" value={forgotEmail} onChange={e=>{setForgotEmail(e.target.value);setForgotErr("");}} onKeyDown={e=>e.key==="Enter"&&enviarRecuperacao()} style={{...st.inp,marginBottom:12}} autoFocus/>
                {forgotErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{forgotErr}</div>}
                <div style={{display:"flex",gap:10}}>
                  <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:dark?D.bg:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={fecharForgot}>Cancelar</button>
                  <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={enviarRecuperacao} disabled={forgotLoading}>{forgotLoading?"Enviando...":"Enviar link"}</button>
                </div>
              </>
            )}
            {forgotStep==="sent"&&(
              <>
                <div style={{width:48,height:48,borderRadius:12,background:D.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><CheckCircle size={26} color={D.green}/></div>
                <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>Verifique seu e-mail</div>
                <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:24}}>Se esse e-mail estiver cadastrado, você receberá em instantes um link para redefinir sua senha.</div>
                <button style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={fecharForgot}>Fechar</button>
              </>
            )}
          </div>
        </div>
      )}

      {showGoogle&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>setShowGoogle(false)}>
          <div className="bv-modal-card" style={{background:"#fff",borderRadius:18,padding:"0",maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"28px 24px 16px",textAlign:"center"}}>
              <GoogleIcon size={36} style={{margin:"0 auto 14px"}}/>
              <div style={{fontWeight:600,fontSize:16,color:"#202124"}}>Escolha uma conta</div>
              <div style={{fontSize:13,color:"#5f6368",marginTop:4}}>para continuar no BP-Visionn</div>
            </div>
            <div style={{borderTop:"1px solid #e8eaed"}}>
              {users.map(u=>(
                <div key={u.id} onClick={()=>preencherEmailGoogle(u.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 24px",cursor:"pointer",transition:"background-color .12s ease"}} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Av name={u.name} initials={u.initials} color={u.color} size={36}/>
                  <div><div style={{fontWeight:500,fontSize:14,color:"#202124"}}>{u.name}</div><div style={{fontSize:12,color:"#5f6368"}}>{u.setor}</div></div>
                </div>
              ))}
            </div>
            <div style={{padding:"14px 24px",borderTop:"1px solid #e8eaed"}}>
              <button style={{width:"100%",padding:"9px",borderRadius:8,border:"1px solid #dadce0",background:"#fff",cursor:"pointer",fontSize:13,color:"#5f6368",fontWeight:500}} onClick={()=>setShowGoogle(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bv-page-outer" style={{minHeight:"100vh",background: dark ? "linear-gradient(135deg, "+D.bg+" 0%, "+D.white+" 100%)" : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",padding:"24px",boxSizing:"border-box"}}>
      {demoMsg&&(
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:D.redSoft,color:D.redText,border:"1px solid "+D.red+"44",borderRadius:12,padding:"10px 18px",fontSize:13,fontWeight:600,boxShadow:"0 12px 30px rgba(0,0,0,0.18)",display:"flex",alignItems:"center",gap:8}}>
          <AlertCircle size={15}/>Você não possui permissão para executar esta ação.
        </div>
      )}
      <div className="bv-page-card" style={{maxWidth:1600,margin:"0 auto",minHeight:"calc(100vh - 48px)",background:dark?D.bg:D.white,borderRadius:28,overflow:"hidden",boxShadow:"0 24px 70px rgba(15,23,42,0.16)",border:"1px solid "+D.border,display:"flex",flexDirection:"column"}}>
        {/* HEADER */}
      <div className="bv-header" style={{background:D.white,borderBottom:"1px solid "+D.border,padding:"0 28px",height:78,display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="bv-hamburger-btn" onClick={()=>setShowDrawer(true)} style={{...st.btn,padding:"7px 9px",border:"none",background:D.bg}}><Menu size={18} color={D.text}/></button>
          <div style={{width:32,height:32,borderRadius:8,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center"}}><Receipt size={16} color={D.blue}/></div>
          <span className="bv-header-brand-text" style={{fontWeight:700,fontSize:15,color:D.blue,letterSpacing:"-0.3px"}}>BP-Visionn</span>
        </div>
        <div className="bv-header-search" style={{flex:1,maxWidth:420,position:"relative"}}>
          <Search size={14} color={D.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
          <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{...st.inp,paddingLeft:32,fontSize:13,background:D.bg}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{position:"relative"}} ref={notifRef}>
            <button onClick={()=>{setShowNotif(p=>!p);setNotifs(p=>p.map(n=>({...n,read:true})));}} style={{...st.btn,padding:"7px 10px",border:"none",background:D.bg,position:"relative"}}>
              <Bell size={17} color={unread>0?D.blue:D.muted}/>
              {unread>0&&<span style={{position:"absolute",top:-3,right:-3,minWidth:16,height:16,borderRadius:20,background:D.blue,color:"#fff",border:"2px solid "+D.white,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{unread}</span>}
            </button>
            {showNotif&&(
              <div style={{position:"absolute",right:0,top:44,width:300,background:D.white,borderRadius:14,border:"1px solid "+D.border,boxShadow:"0 8px 30px rgba(0,0,0,0.12)",zIndex:100,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+D.border,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:600,fontSize:14,color:D.text}}>Notificações</span>
                  <button onClick={()=>setNotifs([])} style={{fontSize:11,color:D.muted,background:"none",border:"none",cursor:"pointer"}}>Limpar</button>
                </div>
                <div style={{maxHeight:300,overflowY:"auto"}}>
                  {notifs.length===0&&<div style={{padding:"2rem",textAlign:"center",color:D.muted,fontSize:13}}>Nenhuma.</div>}
                  {notifs.map(n=><div key={n.id} style={{padding:"10px 16px",borderBottom:"1px solid "+D.border,background:D.bg}}><div style={{fontSize:13,color:D.text,lineHeight:1.4}}>{n.msg}</div><div style={{fontSize:11,color:D.muted,marginTop:3}}>{n.time}</div></div>)}
                </div>
              </div>
            )}
          </div>
          <Av name={user.name} initials={user.initials} color={user.color} photo={user.photo} status={user.status||"online"} D={D} ringColor={D.white} size={32}/>
          <div className="bv-header-username"><div style={{fontSize:13,fontWeight:600,color:D.text}}>{user.name}</div><div style={{fontSize:11,color:D.muted}}>{user.setor}</div></div>
          <button style={{...st.btn,padding:"6px 10px",border:"none",background:D.bg}} onClick={doLogout}><LogOut size={15} color={D.muted}/></button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative"}}>
        {showDrawer&&<div className="bv-drawer-backdrop" onClick={()=>setShowDrawer(false)}/>}
        {/* SIDEBAR */}
        <div className={"bv-sidebar"+(showDrawer?" open":"")} style={{width:250,background:dark?D.white:"#f8fafc",borderRight:"1px solid "+D.border,padding:"1.15rem 0.9rem",flexShrink:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 4px",marginBottom:16}}>
            <Av name={user.name} initials={user.initials} color={user.color} photo={user.photo} status={user.status||"online"} D={D} ringColor={dark?D.white:"#f8fafc"} size={36}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Olá, {user.name}!</div>
              <div style={{fontSize:11,color:D.muted}}>{roleLabel(user.role)}</div>
            </div>
          </div>
          {NAV.map(n=>(
            <button key={n.id} className={"bv-nav-item"+(tab===n.id?" active":"")} onClick={()=>{setTab(n.id);setShowDrawer(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"11px 12px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:5,position:"relative",background:tab===n.id?D.blueSoft:"transparent",color:tab===n.id?D.blue:D.muted,fontWeight:tab===n.id?600:500,fontSize:13,boxShadow:tab===n.id?"0 8px 20px rgba(37,99,235,0.12)":"none"}}>
              <n.Icon size={16}/>{n.label}
              {n.id==="pendencias"&&pendsVis.length>0&&<span style={{marginLeft:"auto",background:D.red,color:"#fff",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 6px"}}>{pendsVis.length}</span>}
              {n.id==="mensagens"&&naoLidasChat>0&&<span style={{marginLeft:"auto",background:D.red,color:"#fff",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 6px"}}>{naoLidasChat}</span>}
            </button>
          ))}

          <div style={{marginTop:"auto",paddingTop:14,display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>setDark(p=>!p)} style={{...st.btn,width:"100%",justifyContent:"space-between",background:dark?D.bg:"#fff"}}>
              <span style={{display:"flex",alignItems:"center",gap:8}}>{dark?<Moon size={15} color={D.blue}/>:<Sun size={15} color={D.orange}/>}Modo escuro</span>
              <span className={"bv-switch"+(dark?" on":"")}><span className="bv-switch-knob"/></span>
            </button>
            <button onClick={doLogout} style={{...st.btn,width:"100%",justifyContent:"center",color:D.redText,background:dark?D.bg:"#fff"}}><LogOut size={15}/>Sair</button>
            <div style={{fontSize:10,color:D.muted,textAlign:"center",marginTop:4}}>© 2026 BP-Visionn<br/>Todos os direitos reservados.</div>
          </div>
        </div>

        <div style={{flex:1,padding:"1.9rem 2.2rem",overflowY:"auto",background:D.bg}}>

          {/* DASHBOARD */}
          {tab==="painel"&&(isAdmin||isDemo)&&(
            <div>
              <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:D.text}}>Dashboard</div><div style={{fontSize:13,color:D.muted}}>Bem-vinda, Bárbara!</div></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
                <MCard D={D} label="Pendências" value={tarefas.filter(t=>t.status==="pendente"||t.status==="vencido").length} Icon={Clock} bg={D.orangeSoft} color={D.orange} highlight={D.orange+"66"}/>
                <MCard D={D} label="Urgentes"   value={tarefas.filter(t=>t.status==="vencido").length} Icon={Zap} bg={D.redSoft} color={D.red} highlight={D.red+"66"}/>
                <MCard D={D} label="Concluídas" value={tarefas.filter(t=>t.status==="pago").length} Icon={CheckCircle} bg={D.greenSoft} color={D.green} highlight={D.green+"66"}/>
                <MCard D={D} label="Total"      value={tarefas.length} Icon={Receipt} bg={D.blueSoft} color={D.blue}/>
              </div>
              <div className="bv-dash-grid">
              <div>
              <div className="bv-card" style={{...st.card,marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:9,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center"}}><Users size={16} color={D.blue}/></div>
                    <span style={{fontWeight:600,fontSize:14,color:D.text}}>Produtividade da equipe</span>
                  </div>
                  <button style={{...st.btn,padding:"5px 12px",fontSize:12}} onClick={()=>setTab("tarefas")}>Ver todos</button>
                </div>
                {users.filter(u=>u.role==="func" && (!isDemo || demoFuncionariosTeste.includes(u.id))).map(fn=>{
                  const m=tarefas.filter(t=>t.responsavel===fn.id);
                  const pd=m.filter(t=>t.status!=="pago").length;
                  const ug=m.filter(t=>t.status==="vencido").length;
                  const pc=m.length>0?Math.round((m.filter(t=>t.status==="pago").length/m.length)*100):0;
                  const pCor = pc>60?D.green:pc>30?D.orange:D.red;
                  return (
                    <div key={fn.id} style={{display:"flex",alignItems:"center",gap:14,marginBottom:18,flexWrap:"wrap"}}>
                      <Av name={fn.name} initials={fn.initials} color={fn.color} photo={fn.photo} size={40}/>
                      <div style={{minWidth:110}}>
                        <div style={{fontSize:13,fontWeight:600,color:D.text}}>{fn.name}</div>
                        <div style={{fontSize:11,color:D.muted}}>{roleLabel(fn.role)}</div>
                      </div>
                      <div style={{flex:1,minWidth:130,display:"flex",alignItems:"center",gap:10}}>
                        <div style={{flex:1,height:8,background:D.gray,borderRadius:20,overflow:"hidden"}}><div className="bv-progress-fill" style={{height:"100%",background:"linear-gradient(90deg, "+pCor+"cc, "+pCor+")",borderRadius:20,width:pc+"%"}}></div></div>
                        <span style={{fontSize:13,fontWeight:700,color:pCor,minWidth:36,textAlign:"right"}}>{pc}%</span>
                      </div>
                      <div style={{textAlign:"center",minWidth:56}}>
                        <div style={{fontSize:15,fontWeight:700,color:D.text}}>{m.length}</div>
                        <div style={{fontSize:10,color:D.muted}}>Tarefas</div>
                      </div>
                      <div style={{textAlign:"center",minWidth:70}}>
                        <div style={{fontSize:15,fontWeight:700,color:D.text}}>{pd}</div>
                        <div style={{fontSize:10,color:D.muted}}>{pd===1?"Pendência":"Pendências"}</div>
                        {ug>0&&<div style={{fontSize:9,color:D.redText,fontWeight:600,marginTop:1}}>{ug} urgente{ug>1?"s":""}</div>}
                      </div>
                    </div>
                  );
                })}
                <div style={{fontSize:11,color:D.muted,marginTop:4,paddingTop:12,borderTop:"1px solid "+D.border}}>Dados atualizados em tempo real</div>
              </div>
              <div className="bv-card" style={{...st.card,marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div><div style={{fontWeight:600,fontSize:14,color:D.text}}>📋 Prorrogação de Boletos</div><div style={{fontSize:12,color:D.muted,marginTop:2}}>NFs aguardando prorrogação</div></div>
                  {!isDemo&&<button style={{...st.btnBlue,padding:"7px 14px",fontSize:12}} onClick={()=>setShowProrrForm(p=>!p)}><Plus size={13}/>Incluir NF</button>}
                </div>
                {showProrrForm&&(
                  <div style={{background:D.bg,borderRadius:10,padding:14,marginBottom:14}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                      <div><label style={st.lbl}>Fornecedor</label><input style={st.inp} value={newPr.fornecedor} onChange={e=>setNewPr(p=>({...p,fornecedor:e.target.value}))}/></div>
                      <div><label style={st.lbl}>Nº da NF</label><input style={st.inp} placeholder="NF-000" value={newPr.nf} onChange={e=>setNewPr(p=>({...p,nf:e.target.value}))}/></div>
                      <div><label style={st.lbl}>Vencimento</label><input type="date" style={st.inp} value={newPr.vencimento} onChange={e=>setNewPr(p=>({...p,vencimento:e.target.value}))}/></div>
                      <div><label style={st.lbl}>Estado</label>
                        <select style={st.inp} value={newPr.estado} onChange={e=>setNewPr(p=>({...p,estado:e.target.value}))}>
                          <option>Aguardando retorno</option><option>Em negociação</option><option>Aprovado</option><option>Recusado</option>
                        </select>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <button style={st.btnBlue} onClick={addNF}><CheckCircle size={13}/>Salvar</button>
                      <button style={st.btn} onClick={()=>setShowProrrForm(false)}>Cancelar</button>
                    </div>
                  </div>
                )}
                {prorrogacoes.length===0?<div style={{textAlign:"center",padding:"1rem 0",color:D.muted,fontSize:13}}>Nenhuma NF cadastrada.</div>:(
                  <div style={{overflowX:"auto"}}>
                  <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Fornecedor","NF","Vencimento","Estado",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
                    <tbody>{prorrogacoes.map(pr=>{
                      const ec=eCor(pr.estado);
                      return (
                        <tr key={pr.id} style={{borderBottom:"1px solid "+D.border}}>
                          <td data-label="Fornecedor" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{pr.fornecedor}</td>
                          <td data-label="NF" style={{padding:"10px 8px",color:D.muted,fontFamily:"monospace"}}>{pr.nf}</td>
                          <td data-label="Vencimento" style={{padding:"10px 8px",color:D.muted}}>{pr.vencimento||"—"}</td>
                          <td data-label="Estado" style={{padding:"10px 8px"}}>
                            <select value={pr.estado} disabled={isDemo} onChange={e=>mudarEstadoNF(pr.id,e.target.value)} style={{fontSize:11,fontWeight:600,background:ec.bg,color:ec.c,border:"none",borderRadius:20,padding:"3px 10px",cursor:isDemo?"default":"pointer",outline:"none"}}>
                              <option>Aguardando retorno</option><option>Em negociação</option><option>Aprovado</option><option>Recusado</option>
                            </select>
                          </td>
                          <td style={{padding:"10px 8px"}}>{isAdmin&&<button style={{...st.btn,padding:"3px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} onClick={()=>excluirNF(pr.id)}><X size={12}/></button>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                  </div>
                )}
              </div>
              <div className="bv-card" style={st.card}>
                <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:14}}>Tarefas recentes</div>
                <div style={{overflowX:"auto"}}>
                <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Fornecedor","Vencimento","Responsável","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
                  <tbody>{tarefas.slice(0,5).map(t=>{
                    const fn=users.find(u=>u.id===t.responsavel);
                    return (
                      <tr key={t.id} style={{borderBottom:"1px solid "+D.border}}>
                        <td data-label="Fornecedor" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{t.fornecedor}</td>
                        <td data-label="Vencimento" style={{padding:"10px 8px",color:D.muted}}>{t.vencimento}</td>
                        <td data-label="Responsável" style={{padding:"10px 8px"}}>{fn&&<div style={{display:"flex",alignItems:"center",gap:6}}><Av name={fn.name} initials={fn.initials} color={fn.color} size={22}/><span style={{color:D.muted}}>{fn.name}</span></div>}</td>
                        <td data-label="Status" style={{padding:"10px 8px"}}><Badge status={t.status}/></td>
                        <td style={{padding:"10px 8px"}}>{!isDemo&&t.status!=="pago"&&<button style={{...st.btn,padding:"4px 8px",fontSize:11}} onClick={()=>setConfirm(t.id)}><CheckCircle size={12}/>Concluir</button>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
                </div>
              </div>
              </div>

              <div>
                <MiniCalendario D={D} st={st} tarefas={tarefas} setTab={setTab}/>
                <StatusDonutCard D={D} st={st} tarefas={tarefas} setTab={setTab}/>

                <div className="bv-card" style={st.card}>
                  <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:14}}>Atividades recentes</div>
                  {auditLog.length===0?(
                    <div style={{textAlign:"center",padding:"1.5rem 0",color:D.muted,fontSize:13}}>Nenhuma atividade ainda.</div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      {auditLog.slice(0,5).map(a=>(
                        <div key={a.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                          <div style={{width:30,height:30,borderRadius:9,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{AUDIT_IC[a.tipo]||"📝"}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12.5,fontWeight:500,color:D.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.tipo}{a.tarefa?" — "+a.tarefa:""}</div>
                            <div style={{fontSize:11,color:D.muted,marginTop:1}}>{a.hora}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              </div>
            </div>
          )}

          {/* TAREFAS */}
          {tab==="tarefas"&&(
            <div>
              {!isAdmin&&!isDemo&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:16,fontWeight:700,color:D.text,marginBottom:4}}>Olá, {user.name}! 👋</div>
                  <div style={{fontSize:13,color:D.muted,marginBottom:14}}>{user.setor}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
                    {[
                      {label:"Total",value:tarefas.filter(t=>t.responsavel===user.id).length,Icon:Receipt,bg:D.blueSoft,color:D.blue},
                      {label:"Pendentes",value:tarefas.filter(t=>t.responsavel===user.id&&t.status==="pendente").length,Icon:Clock,bg:D.orangeSoft,color:D.orange},
                      {label:"Urgentes",value:tarefas.filter(t=>t.responsavel===user.id&&t.status==="vencido").length,Icon:AlertCircle,bg:D.redSoft,color:D.red},
                      {label:"Concluídas",value:tarefas.filter(t=>t.responsavel===user.id&&t.status==="pago").length,Icon:CheckCircle,bg:D.greenSoft,color:D.green},
                    ].map(m=>(
                      <div key={m.label} style={{background:D.white,borderRadius:12,border:"1px solid "+D.border,padding:"0.875rem",display:"flex",flexDirection:"column",gap:6}}>
                        <div style={{width:30,height:30,borderRadius:8,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><m.Icon size={15} color={m.color}/></div>
                        <div style={{fontSize:22,fontWeight:700,color:D.text,lineHeight:1}}>{m.value}</div>
                        <div style={{fontSize:11,color:D.muted}}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  {isFin?(
                    <div className="bv-dash-grid">
                      <div>
                      <div className="bv-card" style={st.card}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                          <div><div style={{fontWeight:600,fontSize:14,color:D.text}}>📋 Prorrogação de Boletos</div><div style={{fontSize:12,color:D.muted,marginTop:2}}>NFs aguardando prorrogação</div></div>
                          <button style={{...st.btnBlue,padding:"7px 14px",fontSize:12}} onClick={()=>setShowProrrForm(p=>!p)}><Plus size={13}/>Incluir NF</button>
                        </div>
                        {showProrrForm&&(
                          <div style={{background:D.bg,borderRadius:10,padding:14,marginBottom:14}}>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                              <div><label style={st.lbl}>Fornecedor</label><input style={st.inp} value={newPr.fornecedor} onChange={e=>setNewPr(p=>({...p,fornecedor:e.target.value}))}/></div>
                              <div><label style={st.lbl}>Nº da NF</label><input style={st.inp} placeholder="NF-000" value={newPr.nf} onChange={e=>setNewPr(p=>({...p,nf:e.target.value}))}/></div>
                              <div><label style={st.lbl}>Vencimento</label><input type="date" style={st.inp} value={newPr.vencimento} onChange={e=>setNewPr(p=>({...p,vencimento:e.target.value}))}/></div>
                              <div><label style={st.lbl}>Estado</label>
                                <select style={st.inp} value={newPr.estado} onChange={e=>setNewPr(p=>({...p,estado:e.target.value}))}>
                                  <option>Aguardando retorno</option><option>Em negociação</option><option>Aprovado</option><option>Recusado</option>
                                </select>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:8,marginTop:10}}>
                              <button style={st.btnBlue} onClick={addNF}><CheckCircle size={13}/>Salvar</button>
                              <button style={st.btn} onClick={()=>setShowProrrForm(false)}>Cancelar</button>
                            </div>
                          </div>
                        )}
                        {prorrogacoes.length===0?<div style={{textAlign:"center",padding:"1rem 0",color:D.muted,fontSize:13}}>Nenhuma NF cadastrada.</div>:(
                          <div style={{overflowX:"auto"}}>
                          <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Fornecedor","NF","Vencimento","Estado",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
                            <tbody>{prorrogacoes.map(pr=>{
                              const ec=eCor(pr.estado);
                              return (
                                <tr key={pr.id} style={{borderBottom:"1px solid "+D.border}}>
                                  <td data-label="Fornecedor" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{pr.fornecedor}</td>
                                  <td data-label="NF" style={{padding:"10px 8px",color:D.muted,fontFamily:"monospace"}}>{pr.nf}</td>
                                  <td data-label="Vencimento" style={{padding:"10px 8px",color:D.muted}}>{pr.vencimento||"—"}</td>
                                  <td data-label="Estado" style={{padding:"10px 8px"}}>
                                    <select value={pr.estado} onChange={e=>mudarEstadoNF(pr.id,e.target.value)} style={{fontSize:11,fontWeight:600,background:ec.bg,color:ec.c,border:"none",borderRadius:20,padding:"3px 10px",cursor:"pointer",outline:"none"}}>
                                      <option>Aguardando retorno</option><option>Em negociação</option><option>Aprovado</option><option>Recusado</option>
                                    </select>
                                  </td>
                                  <td style={{padding:"10px 8px"}}>{isAdmin&&<button style={{...st.btn,padding:"3px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} onClick={()=>excluirNF(pr.id)}><X size={12}/></button>}</td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                          </div>
                        )}
                      </div>
                      <TarefasSecao/>
                      </div>
                      <div>
                        <MiniCalendario D={D} st={st} tarefas={tarefas.filter(t=>t.responsavel===user.id)} setTab={setTab}/>
                        <StatusDonutCard D={D} st={st} tarefas={tarefas.filter(t=>t.responsavel===user.id)} setTab={setTab} title="Minhas tarefas por status"/>
                      </div>
                    </div>
                  ):(
                    <div className="bv-dash-grid">
                      <MiniCalendario D={D} st={st} tarefas={tarefas.filter(t=>t.responsavel===user.id)} setTab={setTab}/>
                      <StatusDonutCard D={D} st={st} tarefas={tarefas.filter(t=>t.responsavel===user.id)} setTab={setTab} title="Minhas tarefas por status"/>
                    </div>
                  )}
                </div>
              )}
              {/* Pra funcionária do financeiro, essa seção já foi renderizada
                  acima, dentro da coluna principal do grid (logo abaixo de
                  Prorrogação de Boletos) — ver "tarefasNoGridFin". */}
              {!tarefasNoGridFin && <TarefasSecao/>}
            </div>
          )}

          {/* PENDÊNCIAS */}
          {tab==="pendencias"&&(
            <div>
              <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:D.text}}>Pendências</div><div style={{fontSize:13,color:D.muted}}>{pendsVis.length} em aberto</div></div>
              {pendsVis.length===0&&<div style={{textAlign:"center",padding:"3rem"}}><CheckCircle size={40} color={D.green} style={{display:"block",margin:"0 auto 10px"}}/><div style={{color:D.muted}}>Nenhuma pendência!</div></div>}
              {pendsVis.map(t=>(
                <div className="bv-card" key={t.id} style={{...st.card,border:undefined,borderTop:"1px solid "+D.border,borderRight:"1px solid "+D.border,borderBottom:"1px solid "+D.border,borderLeft:"3px solid "+(t.status==="vencido"?D.red:D.orange),borderRadius:"0 14px 14px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div><div style={{fontWeight:600,color:D.text}}>{t.fornecedor}</div><div style={{fontSize:13,color:D.muted,marginTop:3}}>{t.vencimento}{isAdmin&&" · "+(users.find(u=>u.id===t.responsavel)||{name:""}).name}</div></div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <Badge status={t.status}/>
                      {isAdmin&&<select style={{...st.inp,width:"auto",padding:"5px 8px",fontSize:12}} value={t.responsavel} onChange={e=>mudaResp(t.id,e.target.value)}>{users.filter(u=>u.role==="func").map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CONTRATOS */}
          {tab==="contratos"&&(isAdmin||isFin||isDemo)&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Contratos</div><div style={{fontSize:13,color:D.muted}}>{contratos.length} representante(s)</div></div>
                {!isDemo&&<button style={st.btnBlue} onClick={()=>setShowCForm(p=>!p)}><Plus size={15}/>Novo contrato</button>}
              </div>
              <div style={{display:"flex",gap:4,marginBottom:20,background:D.bg,borderRadius:10,padding:4,width:"fit-content"}}>
                {[{id:"lista",label:"📋 Lista"},{id:"modelos",label:"📄 Modelos"}].map(a=>(
                  <button key={a.id} onClick={()=>setAbaC(a.id)} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:abaC===a.id?600:400,background:abaC===a.id?D.white:"transparent",color:abaC===a.id?D.text:D.muted}}>{a.label}</button>
                ))}
              </div>
              {abaC==="lista"&&(
                <div>
                  {showCForm&&(
                    <div className="bv-card" style={{...st.card,borderColor:D.blue,marginBottom:16}}>
                      <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:14}}>Novo contrato</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
                        <div><label style={st.lbl}>Tipo</label><select style={st.inp} value={newC.tipo} onChange={e=>setNewC(p=>({...p,tipo:e.target.value}))}>{Object.keys(TIPO_MOD).map(k=><option key={k} value={k}>{TIPO_MOD[k].emoji} {TIPO_MOD[k].label}</option>)}</select></div>
                        <div><label style={st.lbl}>Representante</label>
                          <div style={{display:"flex",gap:6}}>
                            <select style={st.inp} value={newC.representanteId} onChange={e=>setNewC(p=>({...p,representanteId:e.target.value}))}>
                              <option value="">Selecione...</option>
                              {representantesAtivos.map(r=><option key={r.id} value={r.id}>{r.nome} — {r.regiao}</option>)}
                            </select>
                            <button type="button" style={st.btn} onClick={abrirNovoRep}>+ Novo</button>
                          </div>
                        </div>
                        <div><label style={st.lbl}>CPF/CNPJ</label><input style={st.inp} value={newC.cpfCnpj} onChange={e=>setNewC(p=>({...p,cpfCnpj:e.target.value}))}/></div>
                        <div><label style={st.lbl}>% Comissão</label><input type="number" style={st.inp} value={newC.porcentagem} onChange={e=>setNewC(p=>({...p,porcentagem:e.target.value}))}/></div>
                        <div><label style={st.lbl}>E-mail</label><input style={st.inp} value={newC.email} onChange={e=>setNewC(p=>({...p,email:e.target.value}))}/></div>
                        <div><label style={st.lbl}>Telefone</label><input style={st.inp} value={newC.telefone} onChange={e=>setNewC(p=>({...p,telefone:e.target.value}))}/></div>
                        <div><label style={st.lbl}>Data de início</label><input type="date" style={st.inp} value={newC.dataInicio} onChange={e=>setNewC(p=>({...p,dataInicio:e.target.value}))}/></div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:14}}><button type="button" style={st.btnBlue} onClick={addContrato}><CheckCircle size={14}/>Salvar</button><button type="button" style={st.btn} onClick={()=>setShowCForm(false)}>Cancelar</button></div>
                    </div>
                  )}
                  {contratos.length===0&&<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhum contrato.</div>}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
                    {contratos.map(c=>(
                      <div className="bv-card" key={c.id} style={st.card}>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                          <Av name={c.representante} initials={getIn(c.representante)} color={D.purple} size={42}/>
                          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15,color:D.text}}>{c.representante}</div><div style={{fontSize:11,color:D.muted,marginTop:2}}>{TIPO_MOD[c.tipo]?TIPO_MOD[c.tipo].emoji:""} {TIPO_MOD[c.tipo]?TIPO_MOD[c.tipo].label:""}</div></div>
                          <span style={{background:D.greenSoft,color:D.greenText,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}>Ativo</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8,marginBottom:14}}>
                          {[["Comissão",c.porcentagem+"%"],["Início",c.dataInicio],["E-mail",c.email],["Telefone",c.telefone]].map(function(kv){ return <div key={kv[0]} style={{background:D.bg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:11,color:D.muted,marginBottom:2}}>{kv[0]}</div><div style={{fontSize:12,fontWeight:600,color:D.text}}>{kv[1]}</div></div>; })}
                        </div>
                        <button style={{...st.btn,width:"100%",justifyContent:"center"}} onClick={()=>{setShowContrato(c);setDocEdit(c.documentoTexto||"");setEditDoc(false);}}><FileText size={14}/>Ver / Editar</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {abaC==="modelos"&&(
                <div>
                  <div style={{fontSize:13,color:D.muted,marginBottom:16}}>Use <code style={{background:D.bg,padding:"1px 6px",borderRadius:4,color:D.blue}}>{"{{nome}}"}</code> etc. como variáveis.</div>
                  {Object.keys(TIPO_MOD).map(key=>(
                    <div className="bv-card" key={key} style={st.card}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <div style={{fontWeight:600,fontSize:15,color:D.text}}>{TIPO_MOD[key].emoji} {TIPO_MOD[key].label}</div>
                        {!isDemo&&(editMod===key?(
                          <div style={{display:"flex",gap:8}}>
                            <button style={st.btnBlue} onClick={()=>{setModelos(p=>({...p,[key]:modEdit}));setEditMod(null);addA("Edição de informações","Modelo",TIPO_MOD[key].label+" editado");}}><Save size={13}/>Salvar</button>
                            <button style={st.btn} onClick={()=>setEditMod(null)}>Cancelar</button>
                          </div>
                        ):(
                          <button style={st.btn} onClick={()=>{setEditMod(key);setModEdit(modelos[key]);}}><Edit3 size={13}/>Editar</button>
                        ))}
                      </div>
                      {editMod===key?<textarea value={modEdit} onChange={e=>setModEdit(e.target.value)} style={{...st.inp,minHeight:240,fontFamily:"monospace",fontSize:13,lineHeight:1.6,resize:"vertical"}}/>:<pre style={{fontSize:12,color:D.muted,background:D.bg,borderRadius:8,padding:"1rem",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap",overflow:"auto"}}>{modelos[key]}</pre>}
                    </div>
                  ))}
                </div>
              )}
              {showContrato&&(
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}} onClick={()=>{setShowContrato(null);setEditDoc(false);}}>
                  <div style={{background:D.white,borderRadius:16,padding:"2rem",maxWidth:560,width:"90%",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                      <div style={{fontWeight:700,fontSize:16,color:D.text}}>{TIPO_MOD[showContrato.tipo]?TIPO_MOD[showContrato.tipo].emoji:""} {TIPO_MOD[showContrato.tipo]?TIPO_MOD[showContrato.tipo].label:""}</div>
                      <button style={{...st.btn,padding:"4px 8px",border:"none"}} onClick={()=>{setShowContrato(null);setEditDoc(false);}}><X size={16}/></button>
                    </div>
                    {editDoc?(
                      <>
                        <textarea value={docEdit} onChange={e=>setDocEdit(e.target.value)} style={{...st.inp,minHeight:320,fontFamily:"'Times New Roman',serif",fontSize:13,lineHeight:1.8,resize:"vertical",marginBottom:16}}/>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <button style={st.btnBlue} onClick={()=>{salvarDocumento(showContrato.id,docEdit);setEditDoc(false);}}><Save size={14}/>Salvar revisão</button>
                          <button style={{...st.btnBlue,background:D.green}} onClick={()=>{salvarDocumento(showContrato.id,docEdit);exportPDF(showContrato,docEdit);}}><Save size={14}/>Exportar PDF</button>
                          <button style={st.btn} onClick={()=>{setDocEdit(showContrato.documentoTexto||fillTpl(modelos[showContrato.tipo||"vendedor"],showContrato));setEditDoc(false);}}>Descartar</button>
                        </div>
                      </>
                    ):(
                      <>
                        <pre style={{fontSize:13,color:D.text,background:D.bg,borderRadius:10,padding:"1.25rem",lineHeight:1.8,whiteSpace:"pre-wrap",margin:"0 0 16px",fontFamily:"'Times New Roman',serif"}}>{docEdit||fillTpl(modelos[showContrato.tipo||"vendedor"],showContrato)}</pre>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {!isDemo&&<button style={st.btn} onClick={()=>{setDocEdit(docEdit||fillTpl(modelos[showContrato.tipo||"vendedor"],showContrato));setEditDoc(true);}}><Edit3 size={14}/>Editar</button>}
                          <button style={st.btnBlue} onClick={()=>window.print()}><Printer size={14}/>Imprimir</button>
                          <button style={{...st.btnBlue,background:D.green}} onClick={()=>{if(docEdit) salvarDocumento(showContrato.id,docEdit); exportPDF(showContrato,docEdit||undefined);}}><Save size={14}/>Exportar PDF</button>
                          <button style={st.btn} onClick={()=>{setShowContrato(null);setEditDoc(false);setDocEdit("");}}>Fechar</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REPRESENTANTES */}
          {tab==="representantes"&&(isAdmin||isFin||isDemo)&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Representantes</div><div style={{fontSize:13,color:D.muted}}>{representantesVisiveis.length} de {representantes.length} representante(s)</div></div>
                {!isDemo&&<button style={st.btnBlue} onClick={abrirNovoRep}><Plus size={15}/>Novo representante</button>}
              </div>

              <div className="bv-card" style={{...st.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{flex:"1 1 200px"}}>
                  <label style={st.lbl}>Pesquisar</label>
                  <input style={st.inp} placeholder="Nome ou CPF" value={repSearch} onChange={e=>setRepSearch(e.target.value)}/>
                </div>
                <div style={{flex:"1 1 140px"}}>
                  <label style={st.lbl}>Região</label>
                  <select style={st.inp} value={repFiltroRegiao} onChange={e=>setRepFiltroRegiao(e.target.value)}>
                    <option value="todos">Todas</option>
                    <option value="Pará">Pará</option>
                    <option value="Piauí">Piauí</option>
                  </select>
                </div>
                <div style={{flex:"1 1 140px"}}>
                  <label style={st.lbl}>Status</label>
                  <select style={st.inp} value={repFiltroStatus} onChange={e=>setRepFiltroStatus(e.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div style={{flex:"1 1 160px"}}>
                  <label style={st.lbl}>Supervisor</label>
                  <select style={st.inp} value={repFiltroSupervisor} onChange={e=>setRepFiltroSupervisor(e.target.value)}>
                    <option value="todos">Todos</option>
                    {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bv-card" style={st.card}>
                {representantesVisiveis.length===0?<div style={{textAlign:"center",padding:"2rem",color:D.muted}}>Nenhum representante encontrado.</div>:(
                  <div style={{overflowX:"auto"}}>
                  <table className="bv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Nome","CPF","Região","Supervisor","Status","Vínculo","Entrada","Saída",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
                    <tbody>{representantesVisiveis.map(r=>{
                      const sup = users.find(u=>u.id===r.supervisorId);
                      const diasVinculo = diasParaVencerVinculo(r);
                      const venceEmBreve = diasVinculo!==null && diasVinculo<=LIMITE_ALERTA_VINCULO_DIAS;
                      return (
                        <tr key={r.id} style={{borderBottom:"1px solid "+D.border,background:venceEmBreve?D.orangeSoft:undefined}}>
                          <td data-label="Nome" style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{r.nome}</td>
                          <td data-label="CPF" style={{padding:"10px 8px",color:D.muted,fontFamily:"monospace"}}>{r.cpf||"—"}</td>
                          <td data-label="Região" style={{padding:"10px 8px",color:D.muted}}>{r.regiao}</td>
                          <td data-label="Supervisor" style={{padding:"10px 8px",color:D.muted}}>{sup?sup.name:"—"}</td>
                          <td data-label="Status" style={{padding:"10px 8px"}}><span style={{fontSize:11,fontWeight:600,background:r.status==="Ativo"?D.greenSoft:D.redSoft,color:r.status==="Ativo"?D.greenText:D.redText,borderRadius:20,padding:"3px 10px"}}>{r.status}</span></td>
                          <td data-label="Vínculo" style={{padding:"10px 8px"}}>
                            {r.tipoVinculo?<span style={{fontSize:11,fontWeight:600,background:D.blueSoft,color:D.blueText,borderRadius:20,padding:"3px 10px"}}>{vinculoLabel[r.tipoVinculo]}</span>:<span style={{color:D.muted}}>—</span>}
                            {venceEmBreve&&(
                              <div style={{marginTop:4,fontSize:11,fontWeight:600,color:D.orangeText,display:"flex",alignItems:"center",gap:4}}>
                                <AlertCircle size={12}/>{diasVinculo<0?"Contrato temporário vencido":diasVinculo===0?"Vence hoje":"Vence em "+diasVinculo+" dia"+(diasVinculo===1?"":"s")}
                              </div>
                            )}
                          </td>
                          <td data-label="Entrada" style={{padding:"10px 8px",color:D.muted}}>{r.dataEntrada||"—"}</td>
                          <td data-label="Saída" style={{padding:"10px 8px",color:D.muted}}>{r.dataSaida||"—"}</td>
                          <td style={{padding:"10px 8px"}}>{!isDemo&&<button style={{...st.btn,padding:"4px 8px",fontSize:11}} onClick={()=>abrirEditarRep(r)}><Pencil size={12}/>Editar</button>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CALENDÁRIO */}
          {tab==="calendario"&&(
            <Calendario D={D} st={st} tarefas={tarefas} prorrogacoes={prorrogacoes} eventos={eventos} setEventos={setEventos} users={users}/>
          )}

          {/* MENSAGENS */}
          {tab==="mensagens"&&!isDemo&&(
            <Mensagens D={D} st={st} user={user} users={users} onNaoLidasChange={setNaoLidasChat}/>
          )}

          {/* AUDITORIA */}
          {tab==="auditoria"&&(isAdmin||isDemo||isFin)&&(
            <div>
              <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:D.text}}>Auditoria</div><div style={{fontSize:13,color:D.muted}}>Log de alterações</div></div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                {["todos"].concat(auditLog.map(a=>a.tipo).filter((v,i,arr)=>arr.indexOf(v)===i)).map(tipo=>(
                  <button key={tipo} onClick={()=>setFiltroAudit(tipo)} style={{...st.btn,fontSize:12,padding:"5px 12px",background:filtroAudit===tipo?D.blue:"transparent",color:filtroAudit===tipo?"#fff":D.muted,border:"1px solid "+(filtroAudit===tipo?D.blue:D.border)}}>
                    {tipo==="todos"?"Todos":(AUDIT_IC[tipo]||"")+" "+tipo}
                  </button>
                ))}
              </div>
              {(filtroAudit==="todos"?auditLog:auditLog.filter(a=>a.tipo===filtroAudit)).map(a=>(
                <div className="bv-card" key={a.id} style={{...st.card,display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{AUDIT_IC[a.tipo]||"📝"}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}><div><span style={{fontWeight:600,fontSize:14,color:D.text}}>{a.tipo}</span><span style={{fontSize:13,color:D.muted,marginLeft:8}}>— {a.tarefa}</span></div><span style={{fontSize:11,color:D.muted,background:D.bg,padding:"2px 8px",borderRadius:20}}>{a.hora}</span></div>
                    <div style={{fontSize:13,color:D.muted,marginTop:4}}>{a.detalhe}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginTop:6}}>
                      <Av name={a.usuario} initials={getIn(a.usuario||"S")} color={(users.find(u=>u.name===a.usuario)||{color:D.blue}).color} size={18}/>
                      <span style={{fontSize:12,color:D.muted}}>{a.usuario}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CONFIGURAÇÕES */}
          {tab==="config"&&!isDemo&&(
            <div>
              <div style={{fontSize:20,fontWeight:700,color:D.text,marginBottom:6}}>Configurações</div>
              <div style={{fontSize:13,color:D.muted,marginBottom:20}}>{isAdmin?"Gerencie usuários e senhas":"Gerencie sua foto de perfil"}</div>

              <div className="bv-card" style={{...st.card,display:"flex",gap:28,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div style={{fontWeight:600,fontSize:14,color:D.text,width:"100%"}}>Meu Perfil</div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,minWidth:160}}>
                  <div className="bv-avatar-photo">
                    <Av name={user.name} initials={user.initials} color={user.color} photo={photoPreview||user.photo} status={user.status||"online"} D={D} ringColor={D.white} size={96}/>
                  </div>
                  <input id="bv-foto-input" type="file" accept="image/png,image/jpeg" style={{display:"none"}} onChange={e=>{onFotoSelecionada(e.target.files&&e.target.files[0]); e.target.value="";}}/>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                    <label htmlFor="bv-foto-input" style={{...st.btn,cursor:"pointer"}}><Edit3 size={13}/>Alterar Foto</label>
                    {(photoPreview||user.photo)&&<button style={{...st.btn,color:D.redText,borderColor:D.red+"44"}} onClick={removerFoto}><X size={13}/>Remover Foto</button>}
                  </div>
                  {photoErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6,textAlign:"center"}}><AlertCircle size={13}/>{photoErr}</div>}
                  {photoPreview&&(
                    <div style={{display:"flex",gap:8,width:"100%"}}>
                      <button style={{...st.btnBlue,flex:1,justifyContent:"center"}} onClick={salvarFoto}><Save size={13}/>Salvar alteração</button>
                      <button style={{...st.btn,flex:1,justifyContent:"center"}} onClick={()=>{setPhotoPreview(null);setPhotoErr("");}}><X size={13}/>Cancelar</button>
                    </div>
                  )}
                </div>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{fontWeight:700,fontSize:18,color:D.text}}>{user.name}</div>
                  <div style={{fontSize:13,color:D.muted,marginTop:2}}>{user.setor} · {roleLabel(user.role)}</div>
                  <div style={{fontSize:13,color:D.muted,marginTop:12}}>{user.email||"E-mail não informado"}</div>
                  <div style={{fontSize:12,color:D.muted,marginTop:12}}>Último acesso: {user.lastAccess||"—"}</div>
                </div>
              </div>

              {isAdmin&&(
              <div className="bv-card" style={st.card}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{fontWeight:600,fontSize:14,color:D.text}}>Equipe</div>
                  <button style={{...st.btnBlue,padding:"7px 12px",fontSize:12.5}} onClick={abrirNewU}><Plus size={13}/>Novo usuário</button>
                </div>
                {users.map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:"1px solid "+D.border}}>
                    <Av name={u.name} initials={u.initials} color={u.color} size={38}/>
                    <div style={{flex:1}}>
                      {editU===u.id?(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <input autoFocus placeholder="Nome" style={{...st.inp,padding:"6px 10px",maxWidth:200}} value={editN} onChange={e=>setEditN(e.target.value)}/>
                          <input placeholder="Setor" style={{...st.inp,padding:"6px 10px",maxWidth:200}} value={editSetor} onChange={e=>setEditSetor(e.target.value)}/>
                          <input placeholder="Nova senha (em branco = manter)" type="password" style={{...st.inp,padding:"6px 10px",maxWidth:260}} value={editS} onChange={e=>setEditS(e.target.value)}/>
                          <div style={{display:"flex",gap:8}}>
                            <button style={{...st.btnBlue,padding:"6px 12px",fontSize:12}} onClick={()=>saveU(u.id)}><Check size={13}/>Salvar</button>
                            <button style={{...st.btn,padding:"6px 12px",fontSize:12}} onClick={()=>{setEditU(null);setEditN("");setEditS("");setEditSetor("");}}><X size={13}/>Cancelar</button>
                          </div>
                        </div>
                      ):(
                        <>
                          <div style={{fontWeight:500,fontSize:14,color:D.text}}>{u.name}</div>
                          <div style={{fontSize:12,color:D.muted,marginTop:2}}>{u.setor} · {roleLabel(u.role)}</div>
                          {revealedEmails[u.id]&&<div style={{fontSize:12,color:D.muted,marginTop:2}}>{revealedEmails[u.id]}</div>}
                          {emailErr[u.id]&&<div style={{fontSize:11,color:D.redText,marginTop:2}}>{emailErr[u.id]}</div>}
                        </>
                      )}
                    </div>
                    {editU!==u.id&&(
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,background:u.role==="admin"?D.blueSoft:D.bg,color:u.role==="admin"?D.blueText:D.muted,borderRadius:20,padding:"3px 10px",fontWeight:500}}>{u.setor}</span>
                        {!revealedEmails[u.id]&&<button style={{...st.btn,padding:"6px 8px"}} title="Ver e-mail" disabled={emailLoadingId===u.id} onClick={()=>verEmail(u.id)}><Mail size={13} color={D.muted}/></button>}
                        <button style={{...st.btn,padding:"6px 8px"}} onClick={()=>{setEditU(u.id);setEditN(u.name);setEditS("");setEditSetor(u.setor);}}><Pencil size={13} color={D.muted}/></button>
                        {u.id!==user.id&&<button style={{...st.btn,padding:"6px 8px",color:D.redText,borderColor:D.red+"44"}} title="Excluir usuário" onClick={()=>abrirConfirmDelUser(u.id,u.name)}><Trash2 size={13}/></button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL CONFIRMAR */}
      {confirm!==null&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}} onClick={()=>setConfirm(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><CheckCircle size={26} color={D.green}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>Concluir tarefa?</div>
            <div style={{fontSize:14,color:D.text,textAlign:"center",fontWeight:500,marginBottom:6}}>"{(tarefas.find(t=>t.id===confirm)||{fornecedor:""}).fornecedor}"</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:24}}>Essa ação ficará registrada na auditoria.</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setConfirm(null)}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.green,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={()=>concluir(confirm)}>Concluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {confirmDel!==null&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}} onClick={()=>setConfirmDel(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><X size={26} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>Excluir tarefa?</div>
            <div style={{fontSize:14,color:D.text,textAlign:"center",fontWeight:500,marginBottom:6}}>"{(tarefas.find(t=>t.id===confirmDel)||{fornecedor:""}).fornecedor}"</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:24}}>Essa ação não pode ser desfeita.</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setConfirmDel(null)}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={()=>excluirTarefa(confirmDel)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR USUÁRIO */}
      {confirmDelUser!==null&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}} onClick={()=>{if(!delUserLoading){setConfirmDelUser(null);setDelUserErr("");}}}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Trash2 size={22} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>Excluir usuário?</div>
            <div style={{fontSize:14,color:D.text,textAlign:"center",fontWeight:500,marginBottom:6}}>"{confirmDelUser.name}"</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:24}}>Essa ação é <strong>permanente</strong> e não pode ser desfeita. O acesso ao sistema será removido imediatamente.</div>
            {delUserErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:16,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{delUserErr}</div>}
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>{setConfirmDelUser(null);setDelUserErr("");}} disabled={delUserLoading}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={excluirUsuario} disabled={delUserLoading}>{delUserLoading?"Excluindo...":"Excluir"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO USUÁRIO */}
      {showNewU&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={fecharNewU}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Users size={22} color={D.blue}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>Novo usuário</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>Cadastre um novo membro da equipe.</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Nome</label><input autoFocus style={st.inp} value={newU.name} onChange={e=>{setNewU(p=>({...p,name:e.target.value}));setNewUErr("");}}/></div>
              <div><label style={st.lbl}>Setor</label><input style={st.inp} placeholder="Ex.: Financeiro" value={newU.setor} onChange={e=>{setNewU(p=>({...p,setor:e.target.value}));setNewUErr("");}}/></div>
              <div><label style={st.lbl}>Cargo</label>
                <select style={st.inp} value={newU.role} onChange={e=>setNewU(p=>({...p,role:e.target.value}))}>
                  <option value="func">Funcionária</option>
                  <option value="admin">Supervisora</option>
                </select>
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>E-mail</label><input type="email" style={st.inp} placeholder="nome@bp-visionn.com" value={newU.email} onChange={e=>setNewU(p=>({...p,email:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Senha inicial</label><input type="password" style={st.inp} value={newU.senha} onChange={e=>{setNewU(p=>({...p,senha:e.target.value}));setNewUErr("");}} onKeyDown={e=>e.key==="Enter"&&criarUsuario()}/></div>
            </div>
            {newUErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",margin:"12px 0 0",display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{newUErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={fecharNewU} disabled={newULoading}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={criarUsuario} disabled={newULoading}>{newULoading?"Criando...":"Criar usuário"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPRESENTANTE (cadastro/edição) */}
      {showRepForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={fecharRepForm}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:460,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Users size={22} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:8}}>{repForm.id?"Editar representante":"Novo representante"}</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:20}}>{repForm.id?"Atualize os dados do representante.":"Cadastre um representante para vincular a contratos."}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Nome</label><input autoFocus style={st.inp} value={repForm.nome} onChange={e=>{setRepForm(p=>({...p,nome:e.target.value}));setRepFormErr("");}}/></div>
              <div><label style={st.lbl}>CPF</label><input style={st.inp} value={repForm.cpf} onChange={e=>setRepForm(p=>({...p,cpf:e.target.value}))}/></div>
              <div><label style={st.lbl}>Região</label>
                <select style={st.inp} value={repForm.regiao} onChange={e=>setRepForm(p=>({...p,regiao:e.target.value}))}>
                  <option value="Pará">Pará</option>
                  <option value="Piauí">Piauí</option>
                </select>
              </div>
              <div><label style={st.lbl}>Supervisor</label>
                <select style={st.inp} value={repForm.supervisorId} onChange={e=>setRepForm(p=>({...p,supervisorId:e.target.value}))}>
                  <option value="">Sem supervisor</option>
                  {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div><label style={st.lbl}>Status</label>
                <select style={st.inp} value={repForm.status} onChange={e=>{setRepForm(p=>({...p,status:e.target.value}));setRepFormErr("");}}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div><label style={st.lbl}>Data de entrada</label><input type="date" style={st.inp} value={repForm.dataEntrada} onChange={e=>setRepForm(p=>({...p,dataEntrada:e.target.value}))}/></div>
              <div><label style={st.lbl}>Número do CORE</label><input style={st.inp} value={repForm.numeroCore} onChange={e=>setRepForm(p=>({...p,numeroCore:e.target.value}))}/></div>
              {repForm.status==="Inativo"&&(<>
                <div><label style={st.lbl}>Data de saída</label><input type="date" style={st.inp} value={repForm.dataSaida} onChange={e=>{setRepForm(p=>({...p,dataSaida:e.target.value}));setRepFormErr("");}}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={st.lbl}>Motivo da saída (opcional)</label><input style={st.inp} value={repForm.motivoSaida} onChange={e=>setRepForm(p=>({...p,motivoSaida:e.target.value}))}/></div>
              </>)}
            </div>

            <div style={{fontWeight:600,fontSize:13,color:D.text,margin:"18px 0 10px"}}>Vínculo / Contrato</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              <div><label style={st.lbl}>Tipo de vínculo</label>
                <select style={st.inp} value={repForm.tipoVinculo} onChange={e=>mudarTipoVinculo(e.target.value)}>
                  <option value="">Não definido</option>
                  <option value="temporario">Contrato Temporário (90 dias)</option>
                  <option value="fixo">Contrato Fixo</option>
                  <option value="recibo">Recibo</option>
                </select>
              </div>
              {repForm.tipoVinculo&&(<>
                <div><label style={st.lbl}>{repForm.tipoVinculo==="temporario"?"Data de início do temporário":repForm.tipoVinculo==="fixo"?"Data de início do fixo":"Data de início"}</label><input type="date" style={st.inp} value={repForm.vinculoDataInicio} onChange={e=>setRepForm(p=>({...p,vinculoDataInicio:e.target.value}))}/></div>
                {repForm.tipoVinculo==="temporario"&&(
                  <div><label style={st.lbl}>Término previsto (90 dias)</label><input disabled style={{...st.inp,color:D.muted,cursor:"default"}} value={repForm.vinculoDataTerminoPrevisto||(repForm.vinculoDataInicio?fmtTerminoPrevisto(repForm.vinculoDataInicio):"—")}/></div>
                )}
                <div><label style={st.lbl}>Status do contrato</label>
                  <select style={st.inp} value={repForm.statusContrato} onChange={e=>setRepForm(p=>({...p,statusContrato:e.target.value}))}>
                    <option value="aguardando_assinatura">Aguardando assinatura</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div><label style={st.lbl}>Data de envio do contrato</label><input type="date" style={st.inp} value={repForm.contratoDataEnvio} onChange={e=>setRepForm(p=>({...p,contratoDataEnvio:e.target.value}))}/></div>
                <div><label style={st.lbl}>Data de conclusão/assinatura</label><input type="date" style={st.inp} value={repForm.contratoDataConclusao} onChange={e=>setRepForm(p=>({...p,contratoDataConclusao:e.target.value}))}/></div>
              </>)}
            </div>
            {repFormErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",margin:"12px 0 0",display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{repFormErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={fecharRepForm}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={salvarRepresentante}>{repForm.id?"Salvar alterações":"Criar representante"}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
