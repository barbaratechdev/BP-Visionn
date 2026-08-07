export default function Donut(p) {
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
