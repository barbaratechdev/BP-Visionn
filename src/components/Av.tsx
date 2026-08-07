import { getIn } from "../lib/helpers";

const STATUS_COR = { online:"#22C55E", away:"#F59E0B", offline:"#94A3B8" };

export default function Av(p) {
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
