import { TrendingUp } from "lucide-react";

export default function MCard(p) {
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
