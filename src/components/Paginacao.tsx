import { Fragment, useEffect, useState } from "react";

// Paginação das abas de cadastro: 20 registros por página.
export const POR_PAGINA = 20;

// Corta a lista na página atual. `chave` = texto com os filtros/busca atuais:
// quando muda, volta pra página 1. A página nunca passa da última (ex.: depois de excluir).
export function usePaginacao(lista, chave = "") {
  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [chave]);
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const atual = Math.min(pagina, totalPaginas);
  const inicio = (atual - 1) * POR_PAGINA;
  return { itens: lista.slice(inicio, inicio + POR_PAGINA), pagina: atual, totalPaginas, total, inicio, irPara: setPagina };
}

// Barra "Mostrando 1–20 de N" + botões Anterior / números / Próxima.
export default function Paginacao({ p, D, st }) {
  if (p.total === 0) return null;
  const { pagina, totalPaginas, total, inicio, irPara } = p;
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginTop:14,fontSize:13,color:D.muted}}>
      <span>Mostrando {inicio+1}–{Math.min(inicio+POR_PAGINA,total)} de {total}</span>
      {totalPaginas>1&&(
        <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
          <button style={{...st.btn,padding:"5px 10px",fontSize:12,opacity:pagina===1?0.45:1}} disabled={pagina===1} onClick={()=>irPara(pagina-1)}>Anterior</button>
          {/* Primeira, última e até 2 vizinhas da atual; o resto vira "…". */}
          {Array.from({length:totalPaginas},(_,i)=>i+1).filter(n=>n===1||n===totalPaginas||Math.abs(n-pagina)<=2).map((n,i,arr)=>(
            <Fragment key={n}>
              {i>0&&n-arr[i-1]>1&&<span style={{padding:"0 4px",color:D.muted}}>…</span>}
              <button aria-current={n===pagina?"page":undefined} style={{...(n===pagina?st.btnBlue:st.btn),padding:"5px 10px",fontSize:12,minWidth:32,justifyContent:"center"}} onClick={()=>irPara(n)}>{n}</button>
            </Fragment>
          ))}
          <button style={{...st.btn,padding:"5px 10px",fontSize:12,opacity:pagina===totalPaginas?0.45:1}} disabled={pagina===totalPaginas} onClick={()=>irPara(pagina+1)}>Próxima</button>
        </div>
      )}
    </div>
  );
}
