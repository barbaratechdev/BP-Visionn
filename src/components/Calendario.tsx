import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { MESES, DSEM, TIPO_EV } from "../constants";

export default function Calendario(p) {
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
