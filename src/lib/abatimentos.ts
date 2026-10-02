// Regras puras do Controle de Abatimentos (sem React nem Supabase): opções
// de tipo/situação, percentual, filtros e totais. Fica fora do componente pra
// poder ser testada isolada e reaproveitada.

export const TIPOS_ABATIMENTO = ["Desconto Comercial","Avaria","Desconto Campanha"];

// Situação do abatimento — o que acompanha "quanto já recuperamos":
// PENDENTE = solicitado ao fornecedor, ainda não abatido no boleto;
// REALIZADO = efetivamente abatido. É independente do status ATIVO/CANCELADO
// (cancelamento, que tem fluxo próprio de aprovação).
export const SITUACOES_ABATIMENTO = [
  {valor:"PENDENTE", label:"Pendente"},
  {valor:"REALIZADO", label:"Realizado"},
];

export function situacaoLabel(s){
  const item = SITUACOES_ABATIMENTO.find(x=>x.valor===s);
  return item ? item.label : "";
}

// Texto do campo Percentual (%) → número.
// vazio → null (campo opcional); inválido → undefined; válido → number (0 a 100, 2 casas).
// Aceita "2", "2,5", "2.5", "10%" e espaços.
export function parsePercentual(txt){
  const s = String(txt==null?"":txt).replace("%","").trim().replace(",",".");
  if(s==="") return null;
  if(!/^\d+(\.\d+)?$/.test(s)) return undefined;
  const n = Math.round(Number(s)*100)/100;
  if(!isFinite(n) || n<0 || n>100) return undefined;
  return n;
}

// 2 → "2%", 2.5 → "2,5%", null → "—"
export function fPercentual(n){
  if(n==null || n==="") return "—";
  return Number(n).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%";
}

// Valor do campo de edição (sem o símbolo %): 2.5 → "2,5"
export function fPercentualInput(n){
  if(n==null || n==="") return "";
  return String(n).replace(".",",");
}

// Filtros da tela. Situação "PENDENTE"/"REALIZADO" só considera registros
// ATIVO — um abatimento cancelado não é nem pendente nem realizado.
export function filtrarAbatimentos(lista, f){
  const contem = (txt,q)=>String(txt||"").toLowerCase().includes(q.toLowerCase());
  return lista.filter(a=>{
    if(f.filial && f.filial!=="todas" && a.filial!==f.filial) return false;
    if(f.tipo && f.tipo!=="todos"){
      if(f.tipo==="sem_tipo"){ if(a.tipoAbatimento) return false; }
      else if(a.tipoAbatimento!==f.tipo) return false;
    }
    if(f.situacao && f.situacao!=="todas"){
      if(f.situacao==="CANCELADO"){ if(a.status!=="CANCELADO") return false; }
      else if(a.status!=="ATIVO" || a.situacao!==f.situacao) return false;
    }
    if(f.fornecedor && !contem(a.laboratorio,f.fornecedor)) return false;
    if(f.boleto && !contem(a.nf,f.boleto)) return false;
    if(f.de && a.data<f.de) return false;
    if(f.ate && a.data>f.ate) return false;
    if(f.busca && !(contem(a.laboratorio,f.busca) || contem(a.nf,f.busca) || contem(a.nfd,f.busca))) return false;
    return true;
  });
}

// Totais do topo. Soma em centavos (sem acumular erro de ponto flutuante).
// Só registros ATIVO entram: cancelado não é abatimento vigente.
// "Realizado" = efetivamente abatido; "Pendente" = solicitado, ainda não abatido
// (nunca entra no total de realizados).
export function calcularResumo(lista){
  let centRealizado = 0, centPendente = 0, qtdRealizado = 0, qtdPendente = 0;
  lista.forEach(a=>{
    if(a.status!=="ATIVO") return;
    const cent = Math.round((a.valorAbatimento||0)*100);
    if(a.situacao==="PENDENTE"){ centPendente += cent; qtdPendente++; }
    else { centRealizado += cent; qtdRealizado++; }
  });
  return {
    totalRealizado: centRealizado/100, qtdRealizado,
    totalPendente: centPendente/100, qtdPendente,
  };
}

// Colunas criadas pela migration 20261003000000. Se o banco ainda não as tem, a API
// recusa o salvamento com PGRST204 ("Could not find the 'x' column ... in the schema
// cache") ou 42703 ("column \"x\" ... does not exist").
const COLUNAS_NOVAS = ["nfd","tipo_abatimento","percentual","situacao"];

// true SOMENTE quando o erro é de fato "o banco ainda não tem os campos novos":
// código de coluna inexistente E mensagem citando uma das colunas novas. Qualquer outro
// erro (permissão, valor inválido, rede, coluna desconhecida que não é nossa...) não conta.
export function ehIncompatibilidadeDeBanco(error){
  if(!error || (error.code!=="PGRST204" && error.code!=="42703")) return false;
  const msg = String(error.message||"").toLowerCase();
  return COLUNAS_NOVAS.some(c=>new RegExp("(^|[^a-z_])"+c+"([^a-z_]|$)").test(msg));
}
