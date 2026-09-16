import { Stethoscope, CalendarClock } from "lucide-react";
import { situacaoExame } from "../lib/helpers";

// Aba "Alertas de RH" — contagens 100% calculadas a partir dos dados reais
// já carregados por RH.tsx (funcionarios/exames/ferias, sem nenhum select
// próprio aqui), nunca fixas. Só considera funcionário Ativo — inativo não
// gera alerta de exame/férias. Clicar num card leva pra lista de
// funcionários já filtrada nesse grupo (callback onVerGrupo, tratado em
// RH.tsx).
export default function RHAlertas(p) {
  const D = p.D, st = p.st;
  const funcionarios = p.funcionarios || [];
  const exames = p.exames || [];
  const ferias = p.ferias || [];
  const onVerGrupo = p.onVerGrupo;

  const ativos = funcionarios.filter(f=>f.status==="Ativo");
  const idsAtrasado = [], idsProximo = [], idsFeriasPendente = [];

  ativos.forEach(f=>{
    const examesDoFunc = exames.filter(e=>e.funcionarioId===f.id).sort((a,b)=>b.ano-a.ano);
    const ultimo = examesDoFunc[0];
    const situacao = ultimo ? situacaoExame(ultimo) : null;
    if(situacao==="Atrasado") idsAtrasado.push(f.id);
    if(situacao==="Próximo do vencimento") idsProximo.push(f.id);

    const feriasDoFunc = ferias.filter(x=>x.funcionarioId===f.id).sort((a,b)=>(b.periodoAquisitivoInicio||"").localeCompare(a.periodoAquisitivoInicio||""));
    const ultimaFerias = feriasDoFunc[0];
    if(ultimaFerias&&ultimaFerias.status==="Pendente") idsFeriasPendente.push(f.id);
  });

  const cards = [
    {id:"atrasado", label:"com exame periódico atrasado", Icon:Stethoscope, cor:D.red, bg:D.redSoft, texto:D.redText, ids:idsAtrasado},
    {id:"proximo", label:"com exame próximo do vencimento", Icon:Stethoscope, cor:D.orange, bg:D.orangeSoft, texto:D.orangeText, ids:idsProximo},
    {id:"feriasPendente", label:"com férias pendentes", Icon:CalendarClock, cor:D.blue, bg:D.blueSoft, texto:D.blueText, ids:idsFeriasPendente},
  ];
  const semAlertas = cards.every(c=>c.ids.length===0);

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:700,color:D.text}}>Alertas de RH</div>
        <div style={{fontSize:13,color:D.muted}}>Calculado a partir dos registros de exames e férias dos funcionários ativos.</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:20}}>
        {cards.map(c=>(
          <button key={c.id} onClick={()=>{ if(c.ids.length) onVerGrupo(c.ids); }} disabled={!c.ids.length} className="bv-stat-card" style={{textAlign:"left",cursor:c.ids.length?"pointer":"default",background:D.white,borderRadius:14,border:"1px solid "+D.border,padding:"1.3rem",display:"flex",flexDirection:"column",gap:10,opacity:c.ids.length?1:0.55}}>
            <div style={{width:38,height:38,borderRadius:10,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><c.Icon size={18} color={c.cor}/></div>
            <div style={{fontSize:28,fontWeight:700,color:c.ids.length?c.texto:D.text,lineHeight:1}}>{c.ids.length}</div>
            <div style={{fontSize:13,color:D.muted}}>funcionário(s) {c.label}</div>
          </button>
        ))}
      </div>

      {semAlertas&&(
        <div className="bv-card" style={{...st.card,textAlign:"center",color:D.muted}}>Nenhum alerta no momento.</div>
      )}
    </div>
  );
}
