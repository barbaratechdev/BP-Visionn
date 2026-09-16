import { useRef, useState } from "react";

// Torna um modal de cadastro arrastável pelo cabeçalho: `dragHandleProps` vai
// no elemento que serve de "pega" (o topo do modal) e `dragStyle` no card do
// modal, somado ao style já existente. Usa Pointer Events (mouse, touch e
// caneta cobertos pelo mesmo conjunto de handlers, sem libs extras).
//
// A posição é relativa (translate) e não reseta sozinha: quem chama o hook
// deve invocar `resetDrag()` no mesmo lugar onde manda abrir o modal (ex.:
// abrirNovo/abrirEditar), senão reabrir herdaria a posição arrastada da vez
// anterior. De propósito não é um useEffect reagindo à abertura — o lint
// deste projeto (react-hooks "set-state-in-effect"/"refs") rejeita tanto
// setState quanto leitura de ref durante o efeito ou o render; chamar
// resetDrag() dentro de um event handler comum não esbarra em nenhuma das
// duas regras.
export function useDraggable(){
  const [pos, setPos] = useState({x:0,y:0});
  const origem = useRef(null);

  function onPointerDown(e){
    if(e.button!==0) return;
    origem.current = {x:e.clientX, y:e.clientY, posX:pos.x, posY:pos.y};
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e){
    if(!origem.current) return;
    const {x,y,posX,posY} = origem.current;
    setPos({x:posX+(e.clientX-x), y:posY+(e.clientY-y)});
  }

  function onPointerUp(e){
    origem.current = null;
    if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return {
    dragStyle: (pos.x||pos.y) ? {transform:"translate("+pos.x+"px, "+pos.y+"px)"} : undefined,
    dragHandleProps: {
      onPointerDown, onPointerMove, onPointerUp, onPointerCancel:onPointerUp,
      style:{cursor:"grab", touchAction:"none"},
    },
    resetDrag: ()=>setPos({x:0,y:0}),
  };
}
