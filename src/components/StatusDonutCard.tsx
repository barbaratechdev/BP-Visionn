import { ChevronRight } from "lucide-react";
import Donut from "./Donut";

export default function StatusDonutCard(p) {
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
