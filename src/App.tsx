import { useState, useRef, useEffect, type CSSProperties } from "react";
import { LayoutDashboard, Receipt, Clock, FileText, Bell, Search, LogOut, Plus, ChevronRight, ChevronDown, TrendingUp, CheckCircle, AlertCircle, Calendar, User, Settings, X, Printer, ArrowRight, Pencil, Check, Zap, Eye, EyeOff, Lock, Edit3, Save, Moon, Sun, ClipboardList, Users } from "lucide-react";

type User = { id:string; name:string; role:string; setor:string; initials:string; color:string; senha:string; photo?:string|null; email?:string; status?:"online"|"away"|"offline"; lastAccess?:string; };
type Tarefa = { id:number; fornecedor:string; valor:number | string; vencimento:string; status:string; responsavel:string; obs:string; historico:Array<{data:string; novoVencimento:string; motivo:string}>; };
type Contrato = { id:number; representante:string; cpfCnpj:string; porcentagem:string; email:string; telefone:string; dataInicio:string; tipo:string; status?:string; };
type Prorrogacao = { id:number; fornecedor:string; nf:string; vencimento:string; estado:string; };
type Evento = { id:string; data:string; titulo:string; tipo:string; hora:string; responsavel:string; descricao:string; auto:boolean; };
type Notif = { id:number; msg:string; time:string; read:boolean; };
type AuditEntry = { id:number; tipo:string; tarefa:string; usuario:string; hora:string; detalhe:string; };

const LIGHT = { bg:"#F8FAFC",white:"#FFFFFF",text:"#111827",muted:"#6B7280",border:"#E5E7EB",blue:"#2563EB",blueSoft:"#EFF6FF",blueText:"#1D4ED8",green:"#22C55E",greenSoft:"#F0FDF4",greenText:"#15803D",red:"#EF4444",redSoft:"#FEF2F2",redText:"#B91C1C",orange:"#F59E0B",orangeSoft:"#FFFBEB",orangeText:"#B45309",gray:"#E5E7EB",purple:"#8B5CF6",purpleSoft:"#F5F3FF",purpleText:"#6D28D9" };
const DARK  = { bg:"#070A13",white:"#0F1526",text:"#F5F7FA",muted:"#8D99AE",border:"#212B42",blue:"#3E93FF",blueSoft:"#132B54",blueText:"#7EB8FF",green:"#22C55E",greenSoft:"#0F3D28",greenText:"#4ADE80",red:"#F0585F",redSoft:"#3A171A",redText:"#F79A9E",orange:"#EFA857",orangeSoft:"#3D2A12",orangeText:"#F7C888",gray:"#212B42",purple:"#A78BFA",purpleSoft:"#2A2059",purpleText:"#D3C2FB" };

const USUARIOS = [
  { id:"supervisora", name:"Bárbara",      role:"admin", setor:"Supervisão", initials:"BA", color:"#2563EB", senha:"adm123", email:"barbara@bvisionn.com", status:"online" as const },
  { id:"Esmeralda",       name:"Esmeralda",        role:"func",  setor:"Financeiro", initials:"AD", color:"#8B5CF6", senha:"adm123", email:"esmeralda@bvisionn.com", status:"online" as const },
  { id:"ana",         name:"Ana", role:"func",  setor:"Financeiro", initials:"AC", color:"#F59E0B", senha:"adm123", email:"ana@bvisionn.com", status:"online" as const   },
  { id:"Maria",      name:"Maria",       role:"func",  setor:"RH",         initials:"MA", color:"#22C55E", senha:"adm123", email:"maria@bvisionn.com", status:"online" as const},
  { id:"Victor",       name:"Victor",        role:"func",  setor:"Cadastro",   initials:"PA", color:"#EF4444", senha:"adm123", email:"victor@bvisionn.com", status:"online" as const },
];

const hoje = new Date().toISOString().split("T")[0];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DSEM  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const TIPO_EV = { tarefa:{label:"Tarefa",cor:"#2563EB",bg:"#EFF6FF"}, vencimento:{label:"Vencimento",cor:"#EF4444",bg:"#FEF2F2"}, reuniao:{label:"Reunião",cor:"#8B5CF6",bg:"#F5F3FF"}, lembrete:{label:"Lembrete",cor:"#F59E0B",bg:"#FFFBEB"} };

const MODELOS_INIT = {
  supervisor:"CONTRATO DE SUPERVISÃO COMERCIAL\n\nSupervisor: {{nome}}\nCPF/CNPJ: {{cpfCnpj}}\nE-mail: {{email}}\nTelefone: {{telefone}}\nData de Início: {{dataInicio}}\nComissão: {{porcentagem}}%\n\nCLÁUSULA 1 — DO OBJETO\nO Supervisor coordenará e supervisionará a equipe de vendas.\n\nCLÁUSULA 2 — DA REMUNERAÇÃO\nReceberá {{porcentagem}}% sobre as vendas totais da equipe, pagos mensalmente.\n\nCLÁUSULA 3 — DA VIGÊNCIA\nPrazo indeterminado, rescindível com aviso prévio de 30 dias.\n\n___________________________     ___________________________\nContratante                       Supervisor",
  vendedor:"CONTRATO DE REPRESENTAÇÃO COMERCIAL\n\nRepresentante: {{nome}}\nCPF/CNPJ: {{cpfCnpj}}\nE-mail: {{email}}\nTelefone: {{telefone}}\nData de Início: {{dataInicio}}\nComissão: {{porcentagem}}%\n\nCLÁUSULA 1 — DO OBJETO\nAtuará como agente comercial autônomo.\n\nCLÁUSULA 2 — DA REMUNERAÇÃO\nReceberá {{porcentagem}}% sobre vendas concretizadas, pagos mensalmente.\n\nCLÁUSULA 3 — DA VIGÊNCIA\nPrazo indeterminado, rescindível com aviso prévio de 30 dias.\n\n___________________________     ___________________________\nContratante                       Representante",
  recibo:"RECIBO DE PAGAMENTO\n\nNome: {{nome}}\nCPF/CNPJ: {{cpfCnpj}}\nComissão: {{porcentagem}}%\nData: {{dataInicio}}\n\nDeclaro ter recebido o valor referente à comissão sobre vendas realizadas no período.\n\n___________________________     ___________________________\nContratante                       Representante",
};
const TIPO_MOD = { supervisor:{label:"Contrato de Supervisor",emoji:"📄"}, vendedor:{label:"Contrato de Vendedor",emoji:"📄"}, recibo:{label:"Recibo",emoji:"🧾"} };
const AUDIT_IC = { "Tarefa criada":"✅","Status alterado":"🔄","Responsável alterado":"👤","Prorrogação":"📅","NF incluída":"📋","Contrato criado":"📄","Tarefa concluída":"✔️","Edição de informações":"✏️","Exportação PDF":"📥" };

type AppStyles = {
  inp: CSSProperties;
  lbl: CSSProperties;
  btn: CSSProperties;
  btnBlue: CSSProperties;
  card: CSSProperties;
};

function getIn(n){ return n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
function fBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function fillTpl(tpl, d){
  return tpl
    .replace(/\{\{nome\}\}/g, d.representante||"")
    .replace(/\{\{cpfCnpj\}\}/g, d.cpfCnpj||"")
    .replace(/\{\{email\}\}/g, d.email||"")
    .replace(/\{\{telefone\}\}/g, d.telefone||"")
    .replace(/\{\{dataInicio\}\}/g, d.dataInicio||"")
    .replace(/\{\{porcentagem\}\}/g, d.porcentagem||"");
}
function nowT(){ return new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }
function nowF(){ return new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); }

function loadTarefas(): Tarefa[] {
  try {
    const raw = localStorage.getItem("bvisionn_tarefas");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const TIPOS_IMG_PERMITIDOS = ["image/png","image/jpeg"];
const TAMANHO_MAX_IMG = 5*1024*1024;
function validarImagem(file){
  if(!TIPOS_IMG_PERMITIDOS.includes(file.type)) return {ok:false, erro:"Formato não suportado. Envie uma imagem PNG, JPG ou JPEG."};
  if(file.size>TAMANHO_MAX_IMG) return {ok:false, erro:"Arquivo muito grande. O limite é 5MB."};
  return {ok:true};
}
function lerComoDataURL(file){
  return new Promise<string>((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result as string);
    reader.onerror = ()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Badge(p) {
  const m = { pendente:{label:"Pendente",bg:"#FFFBEB",c:"#B45309",dot:"#F59E0B"}, pago:{label:"Concluída",bg:"#F0FDF4",c:"#15803D",dot:"#22C55E"}, prorrogado:{label:"Prorrogado",bg:"#EFF6FF",c:"#1D4ED8",dot:"#2563EB"}, vencido:{label:"Urgente",bg:"#FEF2F2",c:"#B91C1C",dot:"#EF4444"} };
  const s = m[p.status] || m.pendente;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.c,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}><span style={{width:5,height:5,borderRadius:"50%",background:s.dot}}></span>{s.label}</span>;
}

const STATUS_COR = { online:"#22C55E", away:"#F59E0B", offline:"#94A3B8" };
function Av(p) {
  const size = p.size || 36;
  const color = p.color || "#2563EB";
  const D = p.D;
  const statusCor = p.status && (D ? {online:D.green,away:D.orange,offline:D.muted}[p.status] : STATUS_COR[p.status]);
  const nucleo = p.photo
    ? <img src={p.photo} alt={p.name||"Foto de perfil"} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"1.5px solid "+color+"55",boxShadow:"0 2px 8px rgba(15,23,42,0.12)"}}/>
    : <div style={{width:size,height:size,borderRadius:"50%",background:color+"33",color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.36,flexShrink:0,border:"1.5px solid "+color+"55"}}>{p.initials||getIn(p.name)}</div>;
  if(!statusCor) return nucleo;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      {nucleo}
      <span style={{position:"absolute",right:-1,bottom:-1,width:Math.max(9,size*0.28),height:Math.max(9,size*0.28),borderRadius:"50%",background:statusCor,border:"2px solid "+(p.ringColor||"#fff")}}></span>
    </div>
  );
}

function MCard(p) {
  return (
    <div className="bv-stat-card" style={{background:p.D.white,borderRadius:18,border:"1.5px solid "+(p.highlight||p.D.border),padding:"1.6rem",display:"flex",flexDirection:"column",gap:16,boxShadow:"0 1px 2px rgba(15,23,42,0.04), 0 12px 28px rgba(15,23,42,0.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{width:46,height:46,borderRadius:13,background:p.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><p.Icon size={22} color={p.color}/></div>
        <div style={{width:26,height:26,borderRadius:"50%",background:p.D.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><TrendingUp size={13} color={p.D.muted}/></div>
      </div>
      <div style={{fontSize:32,fontWeight:700,color:p.highlight||p.D.text,lineHeight:1,letterSpacing:"-0.5px"}}>{p.value}</div>
      <div style={{fontSize:13,color:p.D.muted}}>{p.label}</div>
    </div>
  );
}

function Donut(p) {
  const size = p.size||140, stroke=16, r=(size-stroke)/2, c=2*Math.PI*r;
  const total = p.data.reduce((s,d)=>s+d.value,0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={"0 0 "+size+" "+size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={p.D.gray} strokeWidth={stroke}/>
      {total>0 && p.data.filter(d=>d.value>0).map(d=>{
        const len = (d.value/total)*c;
        const seg = <circle key={d.label} cx={size/2} cy={size/2} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={len+" "+(c-len)} strokeDashoffset={-offset} transform={"rotate(-90 "+size/2+" "+size/2+")"} style={{transition:"stroke-dasharray .4s ease"}}/>;
        offset += len;
        return seg;
      })}
    </svg>
  );
}

function Calendario(p) {
  const D = p.D; const st = p.st;
  const [mes, setMes] = useState(new Date().getMonth());
  const [ano, setAno] = useState(new Date().getFullYear());
  const [diaSel, setDiaSel] = useState<number | null>(null);
  const [form, setForm] = useState(false);
  const [nTit, setNTit] = useState("");
  const [nTipo, setNTipo] = useState("tarefa");
  const [nHora, setNHora] = useState("");
  const [nResp, setNResp] = useState("");
  const [nDesc, setNDesc] = useState("");

  const hd = new Date();
  const prim = new Date(ano, mes, 1).getDay();
  const ndias = new Date(ano, mes+1, 0).getDate();
  const m2 = String(mes+1).padStart(2,"0");
  const mStr = ano+"-"+m2;

  const evT = p.tarefas
    .filter(t => { const pt = t.vencimento.split("-"); return Number(pt[0])===ano && Number(pt[1])-1===mes; })
    .map(t => { const fu = p.users.find(u => u.id===t.responsavel); return {id:"t"+t.id,data:t.vencimento,titulo:t.fornecedor,tipo:"vencimento",responsavel:fu?fu.name:"",descricao:"Status: "+t.status,hora:"",auto:true}; });

  const evP = p.prorrogacoes
    .filter(pr => pr.vencimento && pr.vencimento.indexOf(mStr)===0)
    .map(pr => ({id:"p"+pr.id,data:pr.vencimento,titulo:"NF "+pr.nf+" - "+pr.fornecedor,tipo:"lembrete",responsavel:"",descricao:"Estado: "+pr.estado,hora:"",auto:true}));

  const evM = p.eventos.filter(e => e.data.indexOf(mStr)===0);
  const todos = evT.concat(evP).concat(evM);

  function doDia(d) {
    const ds = ano+"-"+m2+"-"+String(d).padStart(2,"0");
    return todos.filter(e => e.data===ds);
  }

  function prevM() { if(mes===0){setMes(11);setAno(a=>a-1);}else{setMes(m=>m-1);} }
  function nextM() { if(mes===11){setMes(0);setAno(a=>a+1);}else{setMes(m=>m+1);} }

  function salvar() {
    if(!nTit||!diaSel) return;
    const ds = ano+"-"+m2+"-"+String(diaSel).padStart(2,"0");
    p.setEventos(prev => prev.concat([{id:"ev"+Date.now(),data:ds,titulo:nTit,tipo:nTipo,hora:nHora,responsavel:nResp,descricao:nDesc,auto:false}]));
    setNTit(""); setNTipo("tarefa"); setNHora(""); setNResp(""); setNDesc(""); setForm(false);
  }

  const cells = [];
  for(let i=0;i<prim;i++) cells.push(null);
  for(let d=1;d<=ndias;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);
  const prox = todos.slice().sort((a,b)=>a.data>b.data?1:-1).slice(0,6);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Calendário</div><div style={{fontSize:13,color:D.muted}}>Vencimentos e eventos</div></div>
        <button style={st.btnBlue} onClick={()=>{setDiaSel(hd.getDate());setForm(true);}}><Plus size={15}/>Novo evento</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button style={st.btn} onClick={prevM}>‹</button>
        <span style={{fontWeight:600,fontSize:16,color:D.text,minWidth:160,textAlign:"center"}}>{MESES[mes]} {ano}</span>
        <button style={st.btn} onClick={nextM}>›</button>
        <button style={{...st.btn,fontSize:12,padding:"6px 12px"}} onClick={()=>{setMes(hd.getMonth());setAno(hd.getFullYear());}}>Hoje</button>
      </div>
      <div className="bv-card" style={{...st.card,padding:"1rem",marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {DSEM.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:D.muted,padding:"6px 0"}}>{d}</div>)}
          {cells.map((d,i)=>{
            if(!d) return <div key={"e"+i}/>;
            const evs=doDia(d);
            const isH=d===hd.getDate()&&mes===hd.getMonth()&&ano===hd.getFullYear();
            const isS=d===diaSel;
            return (
              <div key={"d"+d} onClick={()=>{setDiaSel(d);setForm(false);}} style={{minHeight:60,borderRadius:8,padding:4,cursor:"pointer",border:"1.5px solid "+(isS?D.blue:isH?D.orange:D.border),background:isS?D.blueSoft:isH?D.orangeSoft:D.white}}>
                <div style={{fontSize:12,fontWeight:isH||isS?700:400,color:isS?D.blue:isH?D.orange:D.text,marginBottom:2}}>{d}</div>
                {evs.slice(0,2).map(ev=>{ const tc=TIPO_EV[ev.tipo]||TIPO_EV.tarefa; return <div key={ev.id} style={{fontSize:9,background:tc.bg,color:tc.cor,borderRadius:3,padding:"1px 3px",marginBottom:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{ev.titulo}</div>; })}
                {evs.length>2&&<div style={{fontSize:9,color:D.muted}}>+{evs.length-2}</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div className="bv-card" style={st.card}>
          <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:12}}>{diaSel?"Dia "+diaSel+" de "+MESES[mes]:"Selecione um dia"}</div>
          {diaSel&&(()=>{
            const evs=doDia(diaSel);
            if(evs.length===0) return <div style={{color:D.muted,fontSize:13,textAlign:"center",padding:"1rem 0"}}>Nenhum evento.</div>;
            return evs.map(ev=>{
              const tc=TIPO_EV[ev.tipo]||TIPO_EV.tarefa;
              return (
                <div key={ev.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid "+D.border}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:tc.cor,flexShrink:0,marginTop:4}}></div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:13,color:D.text}}>{ev.titulo}</div>
                    <div style={{fontSize:11,color:D.muted,marginTop:2}}>
                      <span style={{background:tc.bg,color:tc.cor,borderRadius:10,padding:"1px 7px",fontWeight:600}}>{tc.label}</span>
                      {ev.hora&&<span style={{marginLeft:6}}>{ev.hora}</span>}
                      {ev.responsavel&&<span style={{marginLeft:6}}>· {ev.responsavel}</span>}
                    </div>
                    {ev.descricao&&<div style={{fontSize:11,color:D.muted,marginTop:2,fontStyle:"italic"}}>{ev.descricao}</div>}
                  </div>
                  {!ev.auto&&<button style={{...st.btn,padding:"2px 6px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} onClick={()=>p.setEventos(prev=>prev.filter(x=>x.id!==ev.id))}><X size={11}/></button>}
                </div>
              );
            });
          })()}
          {form&&diaSel&&(
            <div style={{marginTop:12,padding:12,background:D.bg,borderRadius:10}}>
              <div style={{fontWeight:500,fontSize:13,color:D.text,marginBottom:10}}>Novo evento — dia {diaSel}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div><label style={st.lbl}>Título</label><input style={st.inp} value={nTit} onChange={e=>setNTit(e.target.value)}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={st.lbl}>Tipo</label>
                    <select style={st.inp} value={nTipo} onChange={e=>setNTipo(e.target.value)}>
                      {Object.keys(TIPO_EV).map(k=><option key={k} value={k}>{TIPO_EV[k].label}</option>)}
                    </select>
                  </div>
                  <div><label style={st.lbl}>Hora</label><input type="time" style={st.inp} value={nHora} onChange={e=>setNHora(e.target.value)}/></div>
                </div>
                <div><label style={st.lbl}>Responsável</label>
                  <select style={st.inp} value={nResp} onChange={e=>setNResp(e.target.value)}>
                    <option value="">— Selecione —</option>
                    {p.users.map(u=><option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
                <div><label style={st.lbl}>Descrição</label><input style={st.inp} value={nDesc} onChange={e=>setNDesc(e.target.value)}/></div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button style={st.btnBlue} onClick={salvar}><Check size={13}/>Salvar</button>
                <button style={st.btn} onClick={()=>setForm(false)}>Cancelar</button>
              </div>
            </div>
          )}
          {!form&&diaSel&&<button style={{...st.btn,marginTop:12,fontSize:12,width:"100%",justifyContent:"center"}} onClick={()=>setForm(true)}><Plus size={13}/>Adicionar evento</button>}
        </div>
        <div className="bv-card" style={st.card}>
          <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:12}}>Próximos eventos</div>
          {prox.length===0&&<div style={{color:D.muted,fontSize:13,textAlign:"center",padding:"1rem 0"}}>Nenhum evento próximo.</div>}
          {prox.map(ev=>{
            const tc=TIPO_EV[ev.tipo]||TIPO_EV.tarefa;
            const dd=ev.data.split("-")[2];
            return (
              <div key={ev.id} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderBottom:"1px solid "+D.border}}>
                <div style={{width:34,height:34,borderRadius:8,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:13,fontWeight:700,color:tc.cor}}>{+dd}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:D.text}}>{ev.titulo}</div>
                  <div style={{fontSize:11,color:D.muted}}>{ev.data}{ev.responsavel&&" · "+ev.responsavel}</div>
                </div>
                <span style={{fontSize:10,background:tc.bg,color:tc.cor,borderRadius:10,padding:"2px 8px",fontWeight:600}}>{tc.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniCalendario(p) {
  const D = p.D; const st = p.st;
  const hd = new Date();
  const mes = hd.getMonth(); const ano = hd.getFullYear();
  const prim = new Date(ano, mes, 1).getDay();
  const ndias = new Date(ano, mes+1, 0).getDate();
  const m2 = String(mes+1).padStart(2,"0");
  const mStr = ano+"-"+m2;
  const diasComEvento = new Set(
    p.tarefas.filter(t=>t.vencimento && t.vencimento.indexOf(mStr)===0).map(t=>Number(t.vencimento.split("-")[2]))
  );
  const cells = [];
  for(let i=0;i<prim;i++) cells.push(null);
  for(let d=1;d<=ndias;d++) cells.push(d);

  return (
    <div className="bv-card" style={st.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:14,color:D.text}}>Calendário</div>
        <span style={{fontSize:12,color:D.muted,fontWeight:500}}>{MESES[mes]} {ano}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
        {DSEM.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,color:D.muted,padding:"2px 0"}}>{d[0]}</div>)}
        {cells.map((d,i)=>{
          if(!d) return <div key={"e"+i}/>;
          const isH = d===hd.getDate();
          const has = diasComEvento.has(d);
          return (
            <div key={"d"+d} style={{textAlign:"center",fontSize:11,padding:"5px 0",borderRadius:6,fontWeight:isH?700:400,color:isH?D.blue:D.text,background:isH?D.blueSoft:"transparent",position:"relative"}}>
              {d}
              {has&&!isH&&<span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:D.orange}}/>}
            </div>
          );
        })}
      </div>
      <button onClick={()=>p.setTab("calendario")} style={{marginTop:10,padding:"10px 0 0",borderTop:"1px solid "+D.border,borderLeft:"none",borderRight:"none",borderBottom:"none",width:"100%",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",color:D.blue,fontSize:12,fontWeight:600}}>Ver calendário completo<ChevronRight size={14}/></button>
    </div>
  );
}

function StatusDonutCard(p) {
  const D = p.D; const st = p.st;
  const tarefas = p.tarefas;
  const statusData = [
    {label:"Pendente",   value:tarefas.filter(t=>t.status==="pendente").length,   color:D.orange},
    {label:"Vencido",    value:tarefas.filter(t=>t.status==="vencido").length,    color:D.red},
    {label:"Prorrogado", value:tarefas.filter(t=>t.status==="prorrogado").length, color:D.blue},
    {label:"Concluída",  value:tarefas.filter(t=>t.status==="pago").length,       color:D.green},
  ];
  return (
    <div className="bv-card" style={{...st.card,marginBottom:20}}>
      <div style={{fontWeight:600,fontSize:14,color:D.text}}>{p.title||"Tarefas por status"}</div>
      <div style={{fontSize:12,color:D.muted,marginBottom:16}}>{p.subtitle||"Distribuição atual"}</div>
      {tarefas.length===0?(
        <div style={{textAlign:"center",padding:"1.5rem 0",color:D.muted,fontSize:13}}>Nenhuma tarefa cadastrada.</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <div style={{position:"relative",width:140,height:140}}>
            <Donut D={D} size={140} data={statusData}/>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:26,fontWeight:700,color:D.text}}>{tarefas.length}</div>
              <div style={{fontSize:10,color:D.muted}}>Total</div>
            </div>
          </div>
          <div style={{width:"100%",display:"flex",flexDirection:"column",gap:9}}>
            {statusData.map(d=>(
              <div key={d.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:D.muted}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}></span>
                <span style={{flex:1}}>{d.label}</span>
                <span style={{fontWeight:600,color:D.text}}>{d.value} ({tarefas.length>0?Math.round((d.value/tarefas.length)*1000)/10:0}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={()=>p.setTab("pendencias")} style={{marginTop:16,padding:"14px 0 0",borderTop:"1px solid "+D.border,borderLeft:"none",borderRight:"none",borderBottom:"none",width:"100%",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",color:D.blue,fontSize:12,fontWeight:600}}>Ver todas as pendências<ChevronRight size={14}/></button>
    </div>
  );
}

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

  const [users, setUsers] = useState<User[]>(USUARIOS.map(u=>({...u})));
  const [user, setUser]   = useState<User | null>(null);
  const [loginId, setLoginId] = useState("supervisora");
  const [loginSenha, setLoginSenha] = useState("");
  const [senhaVis, setSenhaVis] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [tab, setTab] = useState("painel");
  const [tarefas, setTarefas] = useState<Tarefa[]>(loadTarefas);
  const [contratos, setContratos] = useState<Contrato[]>([{id:1,representante:"Representante Exemplo",cpfCnpj:"",porcentagem:"0",email:"",telefone:"",dataInicio:hoje,tipo:"vendedor"}]);
  const [modelos, setModelos] = useState({...MODELOS_INIT});
  const [prorrogacoes, setProrrogacoes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [notifs, setNotifs] = useState([{id:1,msg:"Bem-vinda ao BP-Visionn!",time:"00:00",read:false}]);
  const [showNotif, setShowNotif] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([{id:1,tipo:"Tarefa criada",tarefa:"Sistema",usuario:"Bárbara",hora:"Início",detalhe:"Sistema iniciado."}]);
  const [filtroAudit, setFiltroAudit] = useState("todos");
  const [showTForm, setShowTForm] = useState(false);
  const [showCForm, setShowCForm] = useState(false);
  const [showProrr, setShowProrr] = useState<number | null>(null);
  const [showProrrForm, setShowProrrForm] = useState(false);
  const [showContrato, setShowContrato] = useState<Contrato | null>(null);
  const [editDoc, setEditDoc] = useState(false);
  const [docEdit, setDocEdit] = useState("");
  const [abaC, setAbaC] = useState("lista");
  const [editMod, setEditMod] = useState<string | null>(null);
  const [modEdit, setModEdit] = useState("");
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [newT, setNewT] = useState({fornecedor:"",valor:"",vencimento:"",responsavel:"Esmeralda",obs:""});
  const [newC, setNewC] = useState({representante:"",cpfCnpj:"",porcentagem:"",email:"",telefone:"",dataInicio:hoje,tipo:"vendedor"});
  const [newPr, setNewPr] = useState({fornecedor:"",nf:"",vencimento:"",estado:"Aguardando retorno"});
  const [prorr, setProrr] = useState({novoVencimento:"",motivo:""});
  const [prorrErr, setProrrErr] = useState("");
  const [editU, setEditU] = useState<string | null>(null);
  const [editN, setEditN] = useState("");
  const [editS, setEditS] = useState("");
  const [confirm, setConfirm] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [editT, setEditT] = useState<number | null>(null);
  const [editTData, setEditTData] = useState({fornecedor:"",valor:"" as number | string,vencimento:"",responsavel:"",obs:""});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");
  const notifRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user && user.role==="admin";
  const isFin   = user && user.setor==="Financeiro";

  const tVis = (isAdmin ? tarefas : tarefas.filter(t=>t.responsavel===(user&&user.id)))
    .filter(t=>(fStatus==="todos"||t.status===fStatus)&&(!search||t.fornecedor.toLowerCase().includes(search.toLowerCase())));
  const pends    = tarefas.filter(t=>t.status==="pendente"||t.status==="vencido");
  const pendsVis = isAdmin ? pends : pends.filter(t=>t.responsavel===(user&&user.id));
  const unread   = notifs.filter(n=>!n.read).length;

  useEffect(()=>{
    function h(e){ if(notifRef.current&&!notifRef.current.contains(e.target)) setShowNotif(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    localStorage.setItem("bvisionn_tarefas", JSON.stringify(tarefas));
  },[tarefas]);

  function addN(msg){ setNotifs(p=>[{id:Date.now(),msg,time:nowT(),read:false},...p].slice(0,20)); }
  function addA(tipo,tarefa,detalhe){ setAuditLog(p=>[{id:Date.now(),tipo,tarefa,usuario:user?user.name:"",hora:nowF(),detalhe},...p]); }
  function eCor(e){ return ({"Aguardando retorno":{bg:D.orangeSoft,c:D.orangeText},"Em negociação":{bg:D.blueSoft,c:D.blueText},"Aprovado":{bg:D.greenSoft,c:D.greenText},"Recusado":{bg:D.redSoft,c:D.redText}})[e]||{bg:D.bg,c:D.muted}; }

  function doLogin(){
    const f=users.find(u=>u.id===loginId);
    if(!f||f.senha!==loginSenha){setLoginErr("Usuário ou senha incorretos.");return;}
    const fotoSalva = localStorage.getItem("bvisionn_photo_"+f.id);
    const logado = {...f, photo: fotoSalva!==null?fotoSalva:f.photo, lastAccess: nowF()};
    setUsers(prev=>prev.map(u=>u.id===f.id?logado:u));
    setUser(logado); setLoginErr(""); setLoginSenha("");
    setTab(f.role==="admin"?"painel":"tarefas");
  }

  function salvarFoto(){
    if(!photoPreview||!user) return;
    localStorage.setItem("bvisionn_photo_"+user.id, photoPreview);
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,photo:photoPreview}:u));
    setUser(u=>u?{...u,photo:photoPreview}:u);
    setPhotoPreview(null); setPhotoErr("");
  }

  function removerFoto(){
    if(!user) return;
    localStorage.removeItem("bvisionn_photo_"+user.id);
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

  function concluir(id){
    const t=tarefas.find(x=>x.id===id); if(!t) return;
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,status:"pago"}:x));
    addN("🔔 "+(user?user.name:"")+" concluiu \""+t.fornecedor+"\".");
    addA("Tarefa concluída",t.fornecedor,"Concluída por "+(user?user.name:"")+" em "+nowF());
    setConfirm(null);
  }

  function reabrir(id){
    const t=tarefas.find(x=>x.id===id); if(!t) return;
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,status:"pendente"}:x));
    addA("Status alterado",t.fornecedor,"Concluída → Pendente");
  }

  function prorrogar(id){
    if(!prorr.novoVencimento||!prorr.motivo){ setProrrErr("Preencha o novo vencimento e o motivo."); return; }
    const t=tarefas.find(x=>x.id===id);
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,vencimento:prorr.novoVencimento,status:"prorrogado",historico:(x.historico||[]).concat([{data:hoje,...prorr}])}:x));
    addN("Prorrogação: "+(t?t.fornecedor:""));
    addA("Prorrogação",t?t.fornecedor:"","Novo vencimento: "+prorr.novoVencimento);
    setShowProrr(null); setProrr({novoVencimento:"",motivo:""}); setProrrErr("");
  }

  function addTarefa(){
    if(!newT.fornecedor||!newT.vencimento) return;
    const resp=users.find(u=>u.id===newT.responsavel);
    setTarefas(prev=>prev.concat([{...newT,id:Date.now(),status:newT.vencimento<hoje?"vencido":"pendente",historico:[]}]));
    addN("Nova tarefa: "+newT.fornecedor); addA("Tarefa criada",newT.fornecedor,"Atribuída a "+(resp?resp.name:""));
    setNewT({fornecedor:"",valor:"",vencimento:"",responsavel:"Esmeralda",obs:""}); setShowTForm(false);
  }

  function mudaResp(id,nid){
    const t=tarefas.find(x=>x.id===id);
    const ant=users.find(u=>u.id===(t?t.responsavel:""));
    const nov=users.find(u=>u.id===nid);
    setTarefas(prev=>prev.map(x=>x.id===id?{...x,responsavel:nid}:x));
    addA("Responsável alterado",t?t.fornecedor:"",(ant?ant.name:"?")+" → "+(nov?nov.name:"?"));
  }

  function abrirEditT(t){
    setEditT(t.id);
    setEditTData({fornecedor:t.fornecedor,valor:t.valor,vencimento:t.vencimento,responsavel:t.responsavel,obs:t.obs});
  }

  function salvarEditT(){
    if(!editTData.fornecedor||!editTData.vencimento) return;
    setTarefas(prev=>prev.map(x=>x.id===editT?{...x,...editTData,status:x.status==="pago"?"pago":(editTData.vencimento<hoje?"vencido":"pendente")}:x));
    addA("Tarefa editada",editTData.fornecedor,"Dados atualizados por "+(user?user.name:""));
    setEditT(null);
  }

  function excluirTarefa(id){
    const t=tarefas.find(x=>x.id===id);
    setTarefas(prev=>prev.filter(x=>x.id!==id));
    addA("Tarefa excluída",t?t.fornecedor:"","Removida por "+(user?user.name:""));
    addN("🗑️ Tarefa excluída: "+(t?t.fornecedor:""));
    setConfirmDel(null);
  }

  function addContrato(){
    const representante = (newC.representante || "").trim();
    const porcentagem = (newC.porcentagem || "").toString().trim();
    const cpfCnpj = (newC.cpfCnpj || "").trim();
    const email = (newC.email || "").trim();
    const telefone = (newC.telefone || "").trim();
    const dataInicio = newC.dataInicio || hoje;
    const tipo = newC.tipo || "vendedor";

    if(!representante || !porcentagem){ return; }

    const contrato = { representante, cpfCnpj, porcentagem, email, telefone, dataInicio, tipo, id:Date.now(), status:"ativo" as const };
    setContratos(prev=>prev.concat([contrato]));
    addN("Novo contrato: "+representante); addA("Contrato criado",representante,"Tipo: "+(TIPO_MOD[tipo]?TIPO_MOD[tipo].label:""));
    setShowCForm(false); setNewC({representante:"",cpfCnpj:"",porcentagem:"",email:"",telefone:"",dataInicio:hoje,tipo:"vendedor"});
  }

  function addNF(){
    if(!newPr.fornecedor||!newPr.nf) return;
    setProrrogacoes(prev=>prev.concat([{...newPr,id:Date.now()}]));
    addN("NF incluída: "+newPr.nf); addA("NF incluída",newPr.fornecedor,"NF: "+newPr.nf);
    setNewPr({fornecedor:"",nf:"",vencimento:"",estado:"Aguardando retorno"}); setShowProrrForm(false);
  }

  function exportPDF(c,txt){
    const titulo=(TIPO_MOD[c.tipo]?TIPO_MOD[c.tipo].label:"Documento");
    const conteudo=txt!==undefined?txt:fillTpl(modelos[c.tipo||"vendedor"],c);
    const w=window.open("","_blank");
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>"+titulo+"</title><style>@page{margin:2.5cm}body{font-family:'Times New Roman',serif;font-size:12pt;color:#111;line-height:1.8}pre{font-family:inherit;white-space:pre-wrap;font-size:12pt;margin:0}.r{margin-top:48px;font-size:10pt;color:#555;text-align:center;border-top:1px solid #ccc;padding-top:10px}@media print{button{display:none}}</style></head><body><pre>"+conteudo+"</pre><div class='r'>Documento gerado pelo BP-Visionn — "+new Date().toLocaleDateString("pt-BR")+"</div><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>");
    w.document.close();
    addA("Exportação PDF",c.representante,titulo+" exportado"); addN("PDF: "+titulo+" — "+c.representante);
  }

  function saveU(id){
    if(!editN.trim()) return;
    const up=users.map(u=>u.id===id?{...u,name:editN.trim(),initials:getIn(editN.trim()),senha:editS||u.senha}:u);
    setUsers(up); if(user&&user.id===id) setUser(up.find(u=>u.id===id));
    setEditU(null); setEditN(""); setEditS("");
  }

  const NAV=[
    {id:"painel",label:"Dashboard",Icon:LayoutDashboard,show:isAdmin},
    {id:"tarefas",label:"Tarefas",Icon:Receipt,show:true},
    {id:"pendencias",label:"Pendências",Icon:Clock,show:true},
    {id:"contratos",label:"Contratos",Icon:FileText,show:isAdmin||isFin},
    {id:"calendario",label:"Calendário",Icon:Calendar,show:true},
    {id:"auditoria",label:"Auditoria",Icon:ClipboardList,show:isAdmin},
    {id:"config",label:"Configurações",Icon:Settings,show:isAdmin},
  ].filter(n=>n.show);

  if(!user) return (
    <div className="bv-login-wrap" style={{background: dark ? "radial-gradient(circle at 15% 15%, rgba(62,147,255,0.12), transparent 45%), radial-gradient(circle at 85% 85%, rgba(62,147,255,0.10), transparent 45%), linear-gradient(160deg, #05070D 0%, #0A0F1E 100%)" : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)"}}>
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

          <label style={st.lbl}>Usuário</label>
          <div style={{position:"relative",marginBottom:12}}>
            <User size={15} color={D.muted} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <select value={loginId} onChange={e=>{setLoginId(e.target.value);setLoginErr("");}} style={{...st.inp,paddingLeft:36,paddingRight:34,appearance:"none",WebkitAppearance:"none"}}>
              {users.map(u=><option key={u.id} value={u.id}>{u.name} — {u.setor}</option>)}
            </select>
            <ChevronDown size={15} color={D.muted} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
          </div>
          {users.filter(u=>u.id===loginId).map(u=>(
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
            <span style={{color:D.blue,fontWeight:600,cursor:"pointer"}}>Esqueci minha senha</span>
          </div>

          {loginErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{loginErr}</div>}

          <button style={{...st.btnBlue,width:"100%",justifyContent:"center",padding:"12px"}} onClick={doLogin}>Entrar <ArrowRight size={15}/></button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background: dark ? "linear-gradient(135deg, "+D.bg+" 0%, "+D.white+" 100%)" : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",padding:"24px",boxSizing:"border-box"}}>
      <div style={{maxWidth:1600,margin:"0 auto",minHeight:"calc(100vh - 48px)",background:dark?D.bg:D.white,borderRadius:28,overflow:"hidden",boxShadow:"0 24px 70px rgba(15,23,42,0.16)",border:"1px solid "+D.border,display:"flex",flexDirection:"column"}}>
        {/* HEADER */}
      <div style={{background:D.white,borderBottom:"1px solid "+D.border,padding:"0 28px",height:78,display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center"}}><Receipt size={16} color={D.blue}/></div>
          <span style={{fontWeight:700,fontSize:15,color:D.blue,letterSpacing:"-0.3px"}}>BP-Visionn</span>
        </div>
        <div style={{flex:1,maxWidth:420,position:"relative"}}>
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
          <div><div style={{fontSize:13,fontWeight:600,color:D.text}}>{user.name}</div><div style={{fontSize:11,color:D.muted}}>{user.setor}</div></div>
          <button style={{...st.btn,padding:"6px 10px",border:"none",background:D.bg}} onClick={()=>{setUser(null);setLoginSenha("");}}><LogOut size={15} color={D.muted}/></button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* SIDEBAR */}
        <div style={{width:250,background:dark?D.white:"#f8fafc",borderRight:"1px solid "+D.border,padding:"1.15rem 0.9rem",flexShrink:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 4px",marginBottom:16}}>
            <Av name={user.name} initials={user.initials} color={user.color} photo={user.photo} status={user.status||"online"} D={D} ringColor={dark?D.white:"#f8fafc"} size={36}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Olá, {user.name}!</div>
              <div style={{fontSize:11,color:D.muted}}>{user.role==="admin"?"Supervisora":"Funcionária"}</div>
            </div>
          </div>
          {NAV.map(n=>(
            <button key={n.id} className={"bv-nav-item"+(tab===n.id?" active":"")} onClick={()=>setTab(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"11px 12px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:5,position:"relative",background:tab===n.id?D.blueSoft:"transparent",color:tab===n.id?D.blue:D.muted,fontWeight:tab===n.id?600:500,fontSize:13,boxShadow:tab===n.id?"0 8px 20px rgba(37,99,235,0.12)":"none"}}>
              <n.Icon size={16}/>{n.label}
              {n.id==="pendencias"&&pendsVis.length>0&&<span style={{marginLeft:"auto",background:D.red,color:"#fff",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 6px"}}>{pendsVis.length}</span>}
            </button>
          ))}

          <div style={{marginTop:"auto",paddingTop:14,display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>setDark(p=>!p)} style={{...st.btn,width:"100%",justifyContent:"space-between",background:dark?D.bg:"#fff"}}>
              <span style={{display:"flex",alignItems:"center",gap:8}}>{dark?<Moon size={15} color={D.blue}/>:<Sun size={15} color={D.orange}/>}Modo escuro</span>
              <span className={"bv-switch"+(dark?" on":"")}><span className="bv-switch-knob"/></span>
            </button>
            <button onClick={()=>{setUser(null);setLoginSenha("");}} style={{...st.btn,width:"100%",justifyContent:"center",color:D.redText,background:dark?D.bg:"#fff"}}><LogOut size={15}/>Sair</button>
            <div style={{fontSize:10,color:D.muted,textAlign:"center",marginTop:4}}>© 2026 BP-Visionn<br/>Todos os direitos reservados.</div>
          </div>
        </div>

        <div style={{flex:1,padding:"1.9rem 2.2rem",overflowY:"auto",background:D.bg}}>

          {/* DASHBOARD */}
          {tab==="painel"&&isAdmin&&(
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
                {users.filter(u=>u.role==="func").map(fn=>{
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
                        <div style={{fontSize:11,color:D.muted}}>{fn.role==="admin"?"Supervisora":"Funcionária"}</div>
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
                  <button style={{...st.btnBlue,padding:"7px 14px",fontSize:12}} onClick={()=>setShowProrrForm(p=>!p)}><Plus size={13}/>Incluir NF</button>
                </div>
                {showProrrForm&&(
                  <div style={{background:D.bg,borderRadius:10,padding:14,marginBottom:14}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
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
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Fornecedor","NF","Vencimento","Estado",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
                    <tbody>{prorrogacoes.map(pr=>{
                      const ec=eCor(pr.estado);
                      return (
                        <tr key={pr.id} style={{borderBottom:"1px solid "+D.border}}>
                          <td style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{pr.fornecedor}</td>
                          <td style={{padding:"10px 8px",color:D.muted,fontFamily:"monospace"}}>{pr.nf}</td>
                          <td style={{padding:"10px 8px",color:D.muted}}>{pr.vencimento||"—"}</td>
                          <td style={{padding:"10px 8px"}}>
                            <select value={pr.estado} onChange={e=>setProrrogacoes(prev=>prev.map(x=>x.id===pr.id?{...x,estado:e.target.value}:x))} style={{fontSize:11,fontWeight:600,background:ec.bg,color:ec.c,border:"none",borderRadius:20,padding:"3px 10px",cursor:"pointer",outline:"none"}}>
                              <option>Aguardando retorno</option><option>Em negociação</option><option>Aprovado</option><option>Recusado</option>
                            </select>
                          </td>
                          <td style={{padding:"10px 8px"}}><button style={{...st.btn,padding:"3px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} onClick={()=>setProrrogacoes(prev=>prev.filter(x=>x.id!==pr.id))}><X size={12}/></button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </div>
              <div className="bv-card" style={st.card}>
                <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:14}}>Tarefas recentes</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Fornecedor","Vencimento","Responsável","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
                  <tbody>{tarefas.slice(0,5).map(t=>{
                    const fn=users.find(u=>u.id===t.responsavel);
                    return (
                      <tr key={t.id} style={{borderBottom:"1px solid "+D.border}}>
                        <td style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{t.fornecedor}</td>
                        <td style={{padding:"10px 8px",color:D.muted}}>{t.vencimento}</td>
                        <td style={{padding:"10px 8px"}}>{fn&&<div style={{display:"flex",alignItems:"center",gap:6}}><Av name={fn.name} initials={fn.initials} color={fn.color} size={22}/><span style={{color:D.muted}}>{fn.name}</span></div>}</td>
                        <td style={{padding:"10px 8px"}}><Badge status={t.status}/></td>
                        <td style={{padding:"10px 8px"}}>{t.status!=="pago"&&<button style={{...st.btn,padding:"4px 8px",fontSize:11}} onClick={()=>setConfirm(t.id)}><CheckCircle size={12}/>Concluir</button>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
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
              {!isAdmin&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:16,fontWeight:700,color:D.text,marginBottom:4}}>Olá, {user.name}! 👋</div>
                  <div style={{fontSize:13,color:D.muted,marginBottom:14}}>{user.setor}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
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
                  {isFin&&prorrogacoes.length>0?(
                    <div className="bv-dash-grid">
                      <div className="bv-card" style={st.card}>
                        <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:12}}>📋 Prorrogação de Boletos</div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                          <thead><tr style={{borderBottom:"1px solid "+D.border}}>{["Fornecedor","NF","Vencimento","Estado"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:D.muted,fontWeight:500,fontSize:12}}>{h}</th>)}</tr></thead>
                          <tbody>{prorrogacoes.map(pr=>{const ec=eCor(pr.estado);return(<tr key={pr.id} style={{borderBottom:"1px solid "+D.border}}><td style={{padding:"10px 8px",fontWeight:500,color:D.text}}>{pr.fornecedor}</td><td style={{padding:"10px 8px",color:D.muted,fontFamily:"monospace"}}>{pr.nf}</td><td style={{padding:"10px 8px",color:D.muted}}>{pr.vencimento||"—"}</td><td style={{padding:"10px 8px"}}><span style={{fontSize:11,fontWeight:600,background:ec.bg,color:ec.c,borderRadius:20,padding:"3px 10px"}}>{pr.estado}</span></td></tr>);})}</tbody>
                        </table>
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
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div><label style={st.lbl}>Fornecedor</label><input style={st.inp} value={newT.fornecedor} onChange={e=>setNewT(p=>({...p,fornecedor:e.target.value}))}/></div>
                    <div><label style={st.lbl}>Valor (opcional)</label><input type="number" style={st.inp} value={newT.valor} onChange={e=>setNewT(p=>({...p,valor:e.target.value}))}/></div>
                    <div><label style={st.lbl}>Vencimento</label><input type="date" style={st.inp} value={newT.vencimento} onChange={e=>setNewT(p=>({...p,vencimento:e.target.value}))}/></div>
                    <div><label style={st.lbl}>Responsável</label>
                      <select style={st.inp} value={newT.responsavel} onChange={e=>setNewT(p=>({...p,responsavel:e.target.value}))}>
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
                      {!isAdmin&&t.status!=="pago"&&(
                        <button style={{padding:"9px 18px",borderRadius:10,border:"none",background:D.green,cursor:"pointer",fontSize:13,color:"#ffffff",fontWeight:600,display:"inline-flex",alignItems:"center",gap:8}} onClick={()=>setConfirm(t.id)}>
                          <CheckCircle size={15}/>Concluir Tarefa
                        </button>
                      )}
                      {!isAdmin&&t.status==="pago"&&<div style={{padding:"7px 14px",background:D.greenSoft,borderRadius:10,fontSize:12,color:D.greenText,display:"inline-flex",alignItems:"center",gap:6,fontWeight:500}}><CheckCircle size={13}/>Concluída</div>}
                    </div>
                    {showProrr===t.id&&(
                      <div style={{marginTop:12,padding:14,background:D.bg,borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div><label style={st.lbl}>Novo vencimento</label><input type="date" style={st.inp} value={prorr.novoVencimento} onChange={e=>setProrr(p=>({...p,novoVencimento:e.target.value}))}/></div>
                        <div><label style={st.lbl}>Motivo</label><input style={st.inp} value={prorr.motivo} onChange={e=>setProrr(p=>({...p,motivo:e.target.value}))}/></div>
                        {prorrErr&&<div style={{gridColumn:"1/-1",fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{prorrErr}</div>}
                        <div style={{gridColumn:"1/-1",display:"flex",gap:8}}><button style={st.btnBlue} onClick={()=>prorrogar(t.id)}>Confirmar</button><button style={st.btn} onClick={()=>{setShowProrr(null);setProrrErr("");}}>Cancelar</button></div>
                      </div>
                    )}
                    {editT===t.id&&(
                      <div style={{marginTop:12,padding:14,background:D.bg,borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
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
          {tab==="contratos"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div><div style={{fontSize:20,fontWeight:700,color:D.text}}>Contratos</div><div style={{fontSize:13,color:D.muted}}>{contratos.length} representante(s)</div></div>
                <button style={st.btnBlue} onClick={()=>setShowCForm(p=>!p)}><Plus size={15}/>Novo contrato</button>
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
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div><label style={st.lbl}>Tipo</label><select style={st.inp} value={newC.tipo} onChange={e=>setNewC(p=>({...p,tipo:e.target.value}))}>{Object.keys(TIPO_MOD).map(k=><option key={k} value={k}>{TIPO_MOD[k].emoji} {TIPO_MOD[k].label}</option>)}</select></div>
                        <div><label style={st.lbl}>Nome</label><input style={st.inp} value={newC.representante} onChange={e=>setNewC(p=>({...p,representante:e.target.value}))}/></div>
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
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                          {[["Comissão",c.porcentagem+"%"],["Início",c.dataInicio],["E-mail",c.email],["Telefone",c.telefone]].map(function(kv){ return <div key={kv[0]} style={{background:D.bg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:11,color:D.muted,marginBottom:2}}>{kv[0]}</div><div style={{fontSize:12,fontWeight:600,color:D.text}}>{kv[1]}</div></div>; })}
                        </div>
                        <button style={{...st.btn,width:"100%",justifyContent:"center"}} onClick={()=>{setShowContrato(c);setDocEdit("");setEditDoc(false);}}><FileText size={14}/>Ver / Editar</button>
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
                        {editMod===key?(
                          <div style={{display:"flex",gap:8}}>
                            <button style={st.btnBlue} onClick={()=>{setModelos(p=>({...p,[key]:modEdit}));setEditMod(null);addA("Edição de informações","Modelo",TIPO_MOD[key].label+" editado");}}><Save size={13}/>Salvar</button>
                            <button style={st.btn} onClick={()=>setEditMod(null)}>Cancelar</button>
                          </div>
                        ):(
                          <button style={st.btn} onClick={()=>{setEditMod(key);setModEdit(modelos[key]);}}><Edit3 size={13}/>Editar</button>
                        )}
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
                          <button style={st.btnBlue} onClick={()=>setEditDoc(false)}><Save size={14}/>Salvar revisão</button>
                          <button style={{...st.btnBlue,background:D.green}} onClick={()=>exportPDF(showContrato,docEdit)}><Save size={14}/>Exportar PDF</button>
                          <button style={st.btn} onClick={()=>{setDocEdit(fillTpl(modelos[showContrato.tipo||"vendedor"],showContrato));setEditDoc(false);}}>Descartar</button>
                        </div>
                      </>
                    ):(
                      <>
                        <pre style={{fontSize:13,color:D.text,background:D.bg,borderRadius:10,padding:"1.25rem",lineHeight:1.8,whiteSpace:"pre-wrap",margin:"0 0 16px",fontFamily:"'Times New Roman',serif"}}>{docEdit||fillTpl(modelos[showContrato.tipo||"vendedor"],showContrato)}</pre>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <button style={st.btn} onClick={()=>{setDocEdit(docEdit||fillTpl(modelos[showContrato.tipo||"vendedor"],showContrato));setEditDoc(true);}}><Edit3 size={14}/>Editar</button>
                          <button style={st.btnBlue} onClick={()=>window.print()}><Printer size={14}/>Imprimir</button>
                          <button style={{...st.btnBlue,background:D.green}} onClick={()=>exportPDF(showContrato,docEdit||undefined)}><Save size={14}/>Exportar PDF</button>
                          <button style={st.btn} onClick={()=>{setShowContrato(null);setEditDoc(false);setDocEdit("");}}>Fechar</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CALENDÁRIO */}
          {tab==="calendario"&&(
            <Calendario D={D} st={st} tarefas={tarefas} prorrogacoes={prorrogacoes} eventos={eventos} setEventos={setEventos} users={users}/>
          )}

          {/* AUDITORIA */}
          {tab==="auditoria"&&isAdmin&&(
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
          {tab==="config"&&isAdmin&&(
            <div>
              <div style={{fontSize:20,fontWeight:700,color:D.text,marginBottom:6}}>Configurações</div>
              <div style={{fontSize:13,color:D.muted,marginBottom:20}}>Gerencie usuários e senhas</div>

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
                  {photoPreview&&<button style={{...st.btnBlue,width:"100%",justifyContent:"center"}} onClick={salvarFoto}><Save size={13}/>Salvar</button>}
                </div>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{fontWeight:700,fontSize:18,color:D.text}}>{user.name}</div>
                  <div style={{fontSize:13,color:D.muted,marginTop:2}}>{user.setor} · {user.role==="admin"?"Supervisora":"Funcionária"}</div>
                  <div style={{fontSize:13,color:D.muted,marginTop:12}}>{user.email||"E-mail não informado"}</div>
                  <div style={{fontSize:12,color:D.muted,marginTop:12}}>Último acesso: {user.lastAccess||"—"}</div>
                </div>
              </div>

              <div className="bv-card" style={st.card}>
                <div style={{fontWeight:600,fontSize:14,color:D.text,marginBottom:16}}>Equipe</div>
                {users.map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:"1px solid "+D.border}}>
                    <Av name={u.name} initials={u.initials} color={u.color} size={38}/>
                    <div style={{flex:1}}>
                      {editU===u.id?(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <input autoFocus placeholder="Nome" style={{...st.inp,padding:"6px 10px",maxWidth:200}} value={editN} onChange={e=>setEditN(e.target.value)}/>
                          <input placeholder="Nova senha (em branco = manter)" type="password" style={{...st.inp,padding:"6px 10px",maxWidth:260}} value={editS} onChange={e=>setEditS(e.target.value)}/>
                          <div style={{display:"flex",gap:8}}>
                            <button style={{...st.btnBlue,padding:"6px 12px",fontSize:12}} onClick={()=>saveU(u.id)}><Check size={13}/>Salvar</button>
                            <button style={{...st.btn,padding:"6px 12px",fontSize:12}} onClick={()=>{setEditU(null);setEditN("");setEditS("");}}><X size={13}/>Cancelar</button>
                          </div>
                        </div>
                      ):(
                        <>
                          <div style={{fontWeight:500,fontSize:14,color:D.text}}>{u.name}</div>
                          <div style={{fontSize:12,color:D.muted,marginTop:2}}>{u.setor} · {u.role==="admin"?"Supervisora":"Funcionária"}</div>
                        </>
                      )}
                    </div>
                    {editU!==u.id&&(
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,background:u.role==="admin"?D.blueSoft:D.bg,color:u.role==="admin"?D.blueText:D.muted,borderRadius:20,padding:"3px 10px",fontWeight:500}}>{u.setor}</span>
                        <button style={{...st.btn,padding:"6px 8px"}} onClick={()=>{setEditU(u.id);setEditN(u.name);setEditS("");}}><Pencil size={13} color={D.muted}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
      </div>
    </div>
  );
}
