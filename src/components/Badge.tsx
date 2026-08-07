export default function Badge(p: { status: string }) {
  const m = { pendente:{label:"Pendente",bg:"#FFFBEB",c:"#B45309",dot:"#F59E0B"}, pago:{label:"Concluída",bg:"#F0FDF4",c:"#15803D",dot:"#22C55E"}, prorrogado:{label:"Prorrogado",bg:"#EFF6FF",c:"#1D4ED8",dot:"#2563EB"}, vencido:{label:"Urgente",bg:"#FEF2F2",c:"#B91C1C",dot:"#EF4444"} };
  const s = m[p.status] || m.pendente;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.c,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}><span style={{width:5,height:5,borderRadius:"50%",background:s.dot}}></span>{s.label}</span>;
}
