import { ChevronRight } from "lucide-react";
import { MESES, DSEM } from "../constants";

export default function MiniCalendario(p) {
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
