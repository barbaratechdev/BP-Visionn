export default function Badge(p: { status: string }) {
  // Cores de texto (c) intensificadas em relação ao fundo/ponto (bg/dot,
  // que continuam a identidade original) — mesmo critério usado em
  // LIGHT.*Text (src/constants.ts): texto mais escuro, mais legível.
  const m = { pendente:{label:"Pendente",bg:"#FFFBEB",c:"#92400E",dot:"#F59E0B"}, pago:{label:"Concluída",bg:"#F0FDF4",c:"#166534",dot:"#22C55E"}, prorrogado:{label:"Prorrogado",bg:"#EFF6FF",c:"#1E40AF",dot:"#2563EB"}, vencido:{label:"Urgente",bg:"#FEF2F2",c:"#991B1B",dot:"#EF4444"} };
  const s = m[p.status] || m.pendente;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.c,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}><span style={{width:5,height:5,borderRadius:"50%",background:s.dot}}></span>{s.label}</span>;
}
