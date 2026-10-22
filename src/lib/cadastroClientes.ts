// Cadastro de Clientes — regras compartilhadas pela lista, pelo detalhe e pela ficha impressa.
// O banco é a proteção real (20261022000100_cadastro_clientes.sql); as funções de permissão
// abaixo só espelham cadastro_clientes_pode_ver/editar/administrar para esconder o que falharia.
import { fData, fDataHoraBR } from "./helpers";

const ID_BARBARA = "6db64d55-bca1-49d0-b789-dabdbc646463";
const ID_ARIANA = "95dd833e-db0e-4e65-b7fe-1188ed8ee5a3";

export function podeVerCadastroClientes(u){
  if(!u || (u.role!=="admin" && u.role!=="func")) return false;
  if(u.role==="func" && (u.setor==="Comercial" || u.setor==="Diretoria")) return false;
  return u.id===ID_BARBARA || u.role==="admin" || ["Supervisão","RH","Cadastro","Financeiro"].includes(u.setor) || u.id===ID_ARIANA;
}
export function podeEditarCadastroClientes(u){
  return !!u && (u.id===ID_BARBARA || (u.role==="func" && (u.setor==="RH" || u.setor==="Cadastro")));
}
export function podeAdministrarCadastroClientes(u){
  return !!u && u.id===ID_BARBARA;
}

export const SITUACOES = ["PENDENTE","EM_ANALISE","AGUARDANDO_CLIENTE","EFETIVADO"];
export function situacaoInfo(s, D){
  return ({
    PENDENTE: {label:"Pendente", bg:D.redSoft, c:D.redText, dot:D.red},
    EM_ANALISE: {label:"Em análise", bg:D.blueSoft, c:D.blueText, dot:D.blue},
    AGUARDANDO_CLIENTE: {label:"Aguardando cliente", bg:D.purpleSoft, c:D.purpleText, dot:D.purple},
    EFETIVADO: {label:"Efetivado", bg:D.greenSoft, c:D.greenText, dot:D.green},
  })[s] || {label:s, bg:D.bg, c:D.muted, dot:D.muted};
}

// Documentos OK/PENDENTE — a ordem é a da ficha.
export const DOCS_OK_PENDENTE = [
  {campo:"docContratoSocial", coluna:"doc_contrato_social", label:"Contrato social"},
  {campo:"docCnpj", coluna:"doc_cnpj", label:"CNPJ"},
  {campo:"docCrf", coluna:"doc_crf", label:"CRF"},
  {campo:"docFotos", coluna:"doc_fotos", label:"Fotos"},
  {campo:"docNotas", coluna:"doc_notas", label:"Notas"},
];
export const ALVARAS = [
  {campo:"alvaraPrefeituraVencimento", coluna:"alvara_prefeitura_vencimento", label:"Alvará da Prefeitura"},
  {campo:"alvaraSanitarioVencimento", coluna:"alvara_sanitario_vencimento", label:"Alvará Sanitário"},
];
export const OPCOES_CONTROLADOS = [{v:"",l:"Não informado"},{v:"OK",l:"OK"},{v:"NAO_CADASTRADO",l:"Não cadastrado"}];
export const OPCOES_SINTEGRA = [{v:"",l:"Não verificado"},{v:"HABILITADO",l:"Habilitado"},{v:"NAO_HABILITADO",l:"Não habilitado"}];
export const OPCOES_SERASA = [{v:"",l:"Não verificado"},{v:"SEM_PENDENCIAS",l:"Sem pendências"},{v:"COM_PENDENCIAS",l:"Com pendências"}];

export function mapClienteRow(r){
  return {
    id:r.id, razaoSocial:r.razao_social||"", codigoRazaoSocial:r.codigo_razao_social||"", cnpj:r.cnpj||"",
    grupo:r.grupo||"", televendas:r.televendas||"", responsavelNome:r.responsavel_nome||"", telefone:r.telefone||"", email:r.email||"",
    representanteId:r.representante_id||"", representanteNome:r.representante_nome||"", representanteCodigo:r.representante_codigo||"",
    supervisorId:r.supervisor_id||"", supervisorNome:r.supervisor_nome||"",
    dataInclusaoTarget:r.data_inclusao_target||"", observacoes:r.observacoes||"", situacao:r.situacao||"PENDENTE",
    docContratoSocial:r.doc_contrato_social||"PENDENTE", docCnpj:r.doc_cnpj||"PENDENTE", docCrf:r.doc_crf||"PENDENTE",
    docFotos:r.doc_fotos||"PENDENTE", docNotas:r.doc_notas||"PENDENTE", docControlados:r.doc_controlados||"",
    alvaraPrefeituraVencimento:r.alvara_prefeitura_vencimento||"", alvaraSanitarioVencimento:r.alvara_sanitario_vencimento||"",
    sintegra:r.sintegra||"", serasa:r.serasa||"",
    createdByNome:r.created_by_nome||"", createdAt:r.created_at||"", updatedByNome:r.updated_by_nome||"", updatedAt:r.updated_at||"",
    excluidoEm:r.excluido_em||"", excluidoPorNome:r.excluido_por_nome||"",
  };
}

// Só os campos que a tela pode gravar — autoria, datas, situação inicial e exclusão o banco decide.
export function payloadCliente(f, incluirSituacao){
  const vazio = v => (v===""||v==null) ? null : v;
  const p: Record<string, unknown> = {
    razao_social:f.razaoSocial, codigo_razao_social:vazio(f.codigoRazaoSocial), cnpj:vazio(soDigitos(f.cnpj)),
    grupo:vazio(f.grupo), televendas:vazio(f.televendas), responsavel_nome:vazio(f.responsavelNome),
    telefone:vazio(f.telefone), email:vazio(f.email), representante_id:vazio(f.representanteId), supervisor_id:vazio(f.supervisorId),
    data_inclusao_target:vazio(f.dataInclusaoTarget), observacoes:vazio(f.observacoes),
    doc_controlados:vazio(f.docControlados), sintegra:vazio(f.sintegra), serasa:vazio(f.serasa),
  };
  DOCS_OK_PENDENTE.forEach(d=>{ p[d.coluna]=f[d.campo]||"PENDENTE"; });
  ALVARAS.forEach(a=>{ p[a.coluna]=vazio(f[a.campo]); });
  if(incluirSituacao) p.situacao = f.situacao;
  return p;
}

// Data de hoje no fuso da empresa (Belém), em AAAA-MM-DD — a mesma referência do banco.
export function hojeBelem(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Belem",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function diasEntre(deIso, ateIso){
  return Math.round((Date.UTC(+ateIso.slice(0,4), +ateIso.slice(5,7)-1, +ateIso.slice(8,10)) - Date.UTC(+deIso.slice(0,4), +deIso.slice(5,7)-1, +deIso.slice(8,10))) / 86400000);
}
export const DIAS_A_VENCER = 30;
// SEM_DATA = pendência; VENCIDO = vermelho; A_VENCER (de hoje até 30 dias) = amarelo; EM_DIA = verde.
export function statusAlvara(vencimento, hoje){
  if(!vencimento) return "SEM_DATA";
  const d = diasEntre(hoje, vencimento);
  if(d<0) return "VENCIDO";
  if(d<=DIAS_A_VENCER) return "A_VENCER";
  return "EM_DIA";
}
export function alvaraInfo(s, D){
  return ({
    SEM_DATA: {label:"Sem data — pendente", bg:D.bg, c:D.muted, dot:D.muted},
    VENCIDO: {label:"Vencido", bg:D.redSoft, c:D.redText, dot:D.red},
    // Amarelo do sistema (âmbar): mesmos tokens do modo claro/escuro usados no resto do app.
    A_VENCER: {label:"A vencer", bg:D.orangeSoft, c:D.orangeText, dot:D.orange},
    EM_DIA: {label:"Em dia", bg:D.greenSoft, c:D.greenText, dot:D.green},
  })[s];
}

// Documentos faltantes: os OK/PENDENTE marcados como Pendente e os alvarás sem data.
// Controlados "Não cadastrado", Sintegra e Serasa nunca entram aqui (Sintegra/Serasa são alertas).
export function documentosPendentes(c){
  const lista = DOCS_OK_PENDENTE.filter(d=>c[d.campo]!=="OK").map(d=>({campo:d.campo, label:d.label}));
  ALVARAS.forEach(a=>{ if(!c[a.campo]) lista.push({campo:a.campo, label:a.label+" (sem data)"}); });
  return lista;
}
export function alertasCliente(c, hoje){
  const lista = [];
  ALVARAS.forEach(a=>{
    const s = statusAlvara(c[a.campo], hoje);
    if(s==="VENCIDO") lista.push({tipo:"VENCIDO", texto:a.label+" vencido em "+fData(c[a.campo])});
    if(s==="A_VENCER") lista.push({tipo:"A_VENCER", texto:a.label+" vence em "+fData(c[a.campo])});
  });
  // Alternativa C (22/10/2026): Sintegra/Serasa vazios = "não verificado" e também viram alerta, para
  // ninguém esquecer de verificar. Continuam sem contar como documento faltante; Controlados vazio é neutro.
  if(c.sintegra==="NAO_HABILITADO") lista.push({tipo:"ALERTA", texto:"Sintegra não habilitado"});
  if(!c.sintegra) lista.push({tipo:"ALERTA", texto:"Sintegra não verificado"});
  if(c.serasa==="COM_PENDENCIAS") lista.push({tipo:"ALERTA", texto:"Serasa com pendências"});
  if(!c.serasa) lista.push({tipo:"ALERTA", texto:"Serasa não verificado"});
  if(c.situacao==="EFETIVADO" && documentosPendentes(c).length>0) lista.push({tipo:"ALERTA", texto:"Efetivado com documento pendente"});
  return lista;
}

export function soDigitos(v){ return (v||"").replace(/\D/g,""); }
export function formatarCnpj(v){
  const d = soDigitos(v).slice(0,14);
  if(d.length<=2) return d;
  if(d.length<=5) return d.slice(0,2)+"."+d.slice(2);
  if(d.length<=8) return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5);
  if(d.length<=12) return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5,8)+"/"+d.slice(8);
  return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5,8)+"/"+d.slice(8,12)+"-"+d.slice(12);
}
// Dígitos verificadores do CNPJ — só aviso na tela; o banco exige apenas 14 dígitos.
export function cnpjDigitosOk(v){
  const d = soDigitos(v);
  if(d.length!==14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = n => { const pesos = n===12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const s = pesos.reduce((acc,p,i)=>acc+(+d[i])*p,0); const r = s%11; return r<2?0:11-r; };
  return dv(12)===+d[12] && dv(13)===+d[13];
}

// Comparação de razão social sem acentos, maiúsculas, pontuação e sufixos societários comuns.
export function normalizarRazao(v){
  return (v||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
    .replace(/[^a-z0-9 ]/g," ").replace(/\b(ltda|me|epp|eireli|s a|sa|cia)\b/g," ").replace(/\s+/g," ").trim();
}
export function razoesParecidas(lista, razao, idAtual){
  const alvo = normalizarRazao(razao);
  if(alvo.length<4) return [];
  return lista.filter(c=>c.id!==idAtual && !c.excluidoEm && (()=>{
    const n = normalizarRazao(c.razaoSocial);
    return n===alvo || (alvo.length>=6 && (n.includes(alvo) || alvo.includes(n) && n.length>=6));
  })());
}

export function mensagemErroCliente(error){
  console.error("Erro no Cadastro de Clientes:", error);
  if(!error) return "Não foi possível salvar. Tente novamente.";
  const m = (error.message||"")+" "+(error.details||"");
  if(error.code==="42501") return error.message && !/row-level security|permission denied/i.test(error.message) ? error.message : "Você não tem permissão para esta ação no Cadastro de Clientes.";
  if(error.code==="23505") {
    if(/cnpj/i.test(m)) return "Já existe um cadastro ativo com este CNPJ.";
    if(/codigo/i.test(m)) return "Já existe um cadastro ativo com este código da razão social.";
    return error.message || "Já existe um cadastro ativo com estes dados.";
  }
  if(error.code==="23514") return /cnpj/i.test(m) ? "O CNPJ precisa ter 14 dígitos." : "Um dos valores informados não é válido.";
  if(error.code==="P0002") return error.message;
  return "Não foi possível concluir"+(error.code?" (código "+error.code+")":"")+". Se o problema continuar, informe esse código ao suporte.";
}

// Histórico: rótulos dos campos e valores legíveis.
export const ROTULO_CAMPO = {
  razao_social:"Razão social", codigo_razao_social:"Código da razão social", cnpj:"CNPJ", grupo:"Grupo", televendas:"Televendas",
  responsavel_nome:"Responsável pelo cliente", telefone:"Telefone", email:"E-mail", representante:"Representante", supervisor:"Supervisor",
  data_inclusao_target:"Data de inclusão na TARGET", observacoes:"Observações", situacao:"Situação",
  doc_contrato_social:"Contrato social", doc_cnpj:"CNPJ (documento)", doc_crf:"CRF", doc_fotos:"Fotos", doc_notas:"Notas",
  doc_controlados:"Controlados", alvara_prefeitura_vencimento:"Alvará da Prefeitura", alvara_sanitario_vencimento:"Alvará Sanitário",
  sintegra:"Sintegra", serasa:"Serasa",
};
const ROTULO_VALOR = {
  OK:"OK", PENDENTE:"Pendente", NAO_CADASTRADO:"Não cadastrado", HABILITADO:"Habilitado", NAO_HABILITADO:"Não habilitado",
  SEM_PENDENCIAS:"Sem pendências", COM_PENDENCIAS:"Com pendências", EM_ANALISE:"Em análise", AGUARDANDO_CLIENTE:"Aguardando cliente", EFETIVADO:"Efetivado",
};
export function valorLegivel(campo, v){
  if(v==null || v==="") return "—";
  if(campo==="situacao" && v==="PENDENTE") return "Pendente";
  if(ROTULO_VALOR[v]) return ROTULO_VALOR[v];
  if(campo==="cnpj") return formatarCnpj(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return fData(v);
  return v;
}

// --- Ficha para impressão (A4 retrato, janela própria, sem nada da interface) ---
function esc(v){
  return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
export function imprimirFicha(c, hoje, impressoPor){
  const w = window.open("", "_blank");
  if(!w) return false;
  const v = x => x ? esc(x) : "&nbsp;";
  const linha = (rotulo, valor, larg = 0) => `<td class="c"${larg?` colspan="${larg}"`:""}><div class="r">${esc(rotulo)}</div><div class="v">${valor}</div></td>`;
  const marca = (on, texto) => `<span class="op${on?" on":""}">${on?"&#9746;":"&#9744;"} ${esc(texto)}</span>`;
  const docsOk = DOCS_OK_PENDENTE.map(d=>`<tr><td class="dn">${esc(d.label)}</td><td>${marca(c[d.campo]==="OK","OK")} ${marca(c[d.campo]!=="OK","PENDENTE")}</td></tr>`).join("");
  const alv = ALVARAS.map(a=>{ const s = statusAlvara(c[a.campo], hoje); const t = ({SEM_DATA:"Sem data",VENCIDO:"VENCIDO",A_VENCER:"A vencer",EM_DIA:"Em dia"})[s];
    return `<tr><td class="dn">${esc(a.label)}</td><td>Vencimento: <b>${c[a.campo]?esc(fData(c[a.campo])):"____/____/______"}</b> <span class="st st-${s}">${t}</span></td></tr>`; }).join("");
  const pend = documentosPendentes(c);
  const alertas = alertasCliente(c, hoje);
  const sit = ({PENDENTE:"PENDENTE",EM_ANALISE:"EM ANÁLISE",AGUARDANDO_CLIENTE:"AGUARDANDO CLIENTE",EFETIVADO:"EFETIVADO"})[c.situacao] || c.situacao;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Ficha de cadastro — ${esc(c.razaoSocial)}</title><style>
@page{size:A4 portrait;margin:1.3cm}
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#111;margin:0}
.cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px}
h1{font-size:14pt;margin:0}.sub{font-size:8.5pt;color:#444}.sit{font-size:10pt;font-weight:700;border:1.5px solid #111;border-radius:4px;padding:4px 10px}
h2{font-size:9.5pt;text-transform:uppercase;letter-spacing:.04em;background:#eee;border:1px solid #999;margin:10px 0 0;padding:4px 6px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
td.c{border:1px solid #999;padding:4px 6px;vertical-align:top;height:34px}.r{font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.03em}.v{font-size:10pt;margin-top:2px;word-break:break-word}
.docs td{border:1px solid #999;padding:5px 6px}.docs td.dn{width:34%;font-weight:600}
.op{display:inline-block;margin-right:14px;color:#555}.op.on{color:#111;font-weight:700}
.st{display:inline-block;margin-left:8px;font-size:8pt;font-weight:700;border-radius:3px;padding:1px 6px;border:1px solid #999}
.st-VENCIDO{border-color:#B91C1C;color:#B91C1C}.st-A_VENCER{border-color:#A16207;color:#A16207}.st-EM_DIA{border-color:#15803D;color:#15803D}.st-SEM_DATA{border-color:#B45309;color:#B45309}
.box{border:1px solid #999;padding:6px 8px;margin-top:6px;min-height:28px}.box b{font-size:8pt;text-transform:uppercase;color:#555}
.rod{margin-top:14px;font-size:7.5pt;color:#555;border-top:1px solid #999;padding-top:6px;display:flex;justify-content:space-between}
tr{page-break-inside:avoid}
</style></head><body>
<div class="cab"><div><h1>Ficha de Cadastro de Cliente</h1><div class="sub">BP-Visionn · Cadastro de Clientes</div></div><div class="sit">${esc(sit)}</div></div>
<h2>Informações gerais</h2>
<table><tr>${linha("Cliente / Razão social", v(c.razaoSocial), 3)}${linha("Código da razão social", v(c.codigoRazaoSocial))}</tr>
<tr>${linha("CNPJ", v(c.cnpj?formatarCnpj(c.cnpj):""), 2)}${linha("Grupo", v(c.grupo), 2)}</tr>
<tr>${linha("Representante / Vendedor", v(c.representanteNome), 2)}${linha("Código do representante", v(c.representanteCodigo))}${linha("Supervisor", v(c.supervisorNome))}</tr>
<tr>${linha("Televendas", v(c.televendas), 2)}${linha("Responsável pelo cliente", v(c.responsavelNome), 2)}</tr>
<tr>${linha("Telefone", v(c.telefone), 2)}${linha("E-mail", v(c.email), 2)}</tr>
<tr>${linha("Data de inclusão na TARGET", v(c.dataInclusaoTarget?fData(c.dataInclusaoTarget):""), 2)}${linha("Registrado no BP-Visionn", v(c.createdAt?fDataHoraBR(c.createdAt)+(c.createdByNome?" — "+c.createdByNome:""):""), 2)}</tr></table>
<h2>Documentos</h2>
<table class="docs">${docsOk}
<tr><td class="dn">Controlados</td><td>${marca(c.docControlados==="OK","OK")} ${marca(c.docControlados==="NAO_CADASTRADO","NÃO CADASTRADO")}</td></tr>
${alv}
<tr><td class="dn">Sintegra</td><td>${marca(c.sintegra==="HABILITADO","HABILITADO")} ${marca(c.sintegra==="NAO_HABILITADO","NÃO HABILITADO")}</td></tr>
<tr><td class="dn">Serasa</td><td>${marca(c.serasa==="COM_PENDENCIAS","COM PENDÊNCIAS")} ${marca(c.serasa==="SEM_PENDENCIAS","SEM PENDÊNCIAS")}</td></tr></table>
<div class="box"><b>Documentos pendentes:</b> ${pend.length?pend.map(p=>esc(p.label)).join(" · "):"nenhum"}</div>
${alertas.length?`<div class="box"><b>Alertas:</b> ${alertas.map(a=>esc(a.texto)).join(" · ")}</div>`:""}
<div class="box"><b>Observações:</b> ${c.observacoes?esc(c.observacoes):""}</div>
<div class="rod"><span>Última atualização: ${c.updatedAt?esc(fDataHoraBR(c.updatedAt)+(c.updatedByNome?" — "+c.updatedByNome:"")):"—"}</span><span>Impresso em ${esc(fDataHoraBR(new Date().toISOString()))}${impressoPor?" por "+esc(impressoPor):""}</span></div>
</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
