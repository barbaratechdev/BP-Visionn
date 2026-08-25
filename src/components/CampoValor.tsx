import { useRef } from "react";
import { fMoedaInputLive } from "../lib/helpers";

// Conta quantos caracteres são dígitos entre o início da string e "pos"
// (exclusive) — usado como âncora de posição do cursor porque dígitos são
// a única coisa que não muda de lugar quando a máscara reformata o texto
// (pontos de milhar aparecem/desaparecem, mas a sequência de dígitos
// digitados continua a mesma).
function digitosAte(str, pos) {
  let n = 0;
  for (let i = 0; i < pos && i < str.length; i++) {
    if (str[i] >= "0" && str[i] <= "9") n++;
  }
  return n;
}
// Inverso de digitosAte: acha o índice logo depois do n-ésimo dígito da
// string já formatada, pra recolocar o cursor no lugar equivalente.
function posDepoisDoDigito(str, n) {
  if (n <= 0) return 0;
  let contados = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] >= "0" && str[i] <= "9") {
      contados++;
      if (contados === n) return i + 1;
    }
  }
  return str.length;
}
// Só contar dígitos não basta como âncora: quando ainda não há nenhuma
// casa decimal digitada, "logo antes da vírgula" e "logo depois da
// vírgula" têm exatamente a mesma contagem de dígitos (a vírgula em si
// não é um dígito), então as duas posições ficavam indistinguíveis — o
// dígito digitado depois da vírgula acabava entrando na parte inteira.
// Por isso a âncora guarda também de qual lado da vírgula o cursor está.
function analisarCursor(str, pos) {
  const iv = str.indexOf(",");
  if (iv === -1 || pos <= iv) return { parte: "inteira", digitos: digitosAte(str, pos) };
  return { parte: "decimal", digitos: digitosAte(str.slice(iv + 1), pos - iv - 1) };
}
function restaurarCursor(str, ancora) {
  const iv = str.indexOf(",");
  if (ancora.parte === "inteira" || iv === -1) return posDepoisDoDigito(iv === -1 ? str : str.slice(0, iv), ancora.digitos);
  return iv + 1 + posDepoisDoDigito(str.slice(iv + 1), ancora.digitos);
}

// Campo de valor monetário com máscara "ao vivo" (padrão brasileiro,
// 1.234,56) que preserva a posição do cursor durante a digitação — sem
// isso, reformatar o texto a cada tecla (inserindo/removendo pontos de
// milhar) empurra o cursor pro final do campo a cada keystroke, o que
// atrapalha editar/apagar/inserir no meio de um valor já digitado.
//
// Técnica: no onChange, o navegador já aplicou a tecla digitada (ou a
// colagem) ao valor bruto do input antes deste handler rodar — contamos
// quantos dígitos existem antes do cursor NESSE valor bruto, aplicamos a
// máscara (fMoedaInputLive, que só formata a parte inteira; a parte
// decimal digitada não é mexida até o campo perder o foco — ver
// fMoedaInput em lib/helpers), e recolocamos o cursor depois do mesmo
// tanto de dígitos no texto já formatado. Funciona igual pra digitação,
// backspace/delete e colar, porque em todos os casos o navegador já fez a
// edição no valor bruto antes do handler — não precisamos distinguir o
// tipo de edição.
export default function CampoValor(p) {
  const ref = useRef(null);

  function onChange(e) {
    const el = e.target;
    const bruto = el.value;
    const cursorBruto = el.selectionStart==null ? bruto.length : el.selectionStart;
    const ancora = analisarCursor(bruto, cursorBruto);

    const formatado = fMoedaInputLive(bruto);
    p.onChange(formatado);

    // O React só aplica o novo "value" no DOM depois deste handler
    // terminar — recoloca o cursor no próximo frame, já com o texto
    // formatado renderizado.
    requestAnimationFrame(() => {
      if (!ref.current) return;
      const pos = restaurarCursor(formatado, ancora);
      ref.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={ref}
      inputMode="decimal"
      placeholder={p.placeholder || "0,00"}
      style={p.style}
      value={p.value}
      onChange={onChange}
      onBlur={p.onBlur}
    />
  );
}
