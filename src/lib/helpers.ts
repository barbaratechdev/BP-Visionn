import { hoje, TIPOS_IMG_PERMITIDOS, TAMANHO_MAX_IMG } from "../constants";
import type { User, Tarefa, Contrato, AuditEntry } from "../types";

export function getIn(n){ return n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
// Nome a mostrar na tela/relatórios: a versão curta (nomeExibicao), quando
// a pessoa tiver uma cadastrada, senão o nome completo. Nunca o contrário.
export function nomeVisivel(u){ return (u&&u.nomeExibicao)||(u&&u.name)||""; }
// Texto exibido pra situação de uma NF em Prorrogação de Boletos — só
// traduz o rótulo na tela; o valor salvo em pendencias.situacao NUNCA
// muda por causa disso — continua exatamente "Aguardando retorno" /
// "Em negociação" / "Prorrogação Aprovada" / "Recusado". Só 3 rótulos
// aparecem pro usuário: "Em negociação" funde visualmente em
// "Aguardando" (mesmo texto, mesma cor, mesmo filtro/contagem — decisão
// explícita, pra não ter uma 4ª categoria confusa na tela nem duplicar
// "Aguardando" com dois valores internos diferentes por baixo).
const SITUACAO_LABEL = { "Aguardando retorno":"Aguardando", "Em negociação":"Aguardando", "Prorrogação Aprovada":"Aprovado" };
export function situacaoLabel(s){ return SITUACAO_LABEL[s]||s; }
// Situações que devem contar/filtrar junto de "Aguardando" (ver acima).
export function ehAguardando(s){ return s==="Aguardando retorno"||s==="Em negociação"; }
// Prioridade de exibição da listagem/relatório de Prorrogação de Boletos:
// Aguardando (0) → Recusado (1) → Aprovado (2), nunca por fornecedor/NF/
// data. Um valor de situação fora dos 4 conhecidos vai pro fim (3) em vez
// de cair silenciosamente num dos 3 baldes existentes.
export function ordemSituacao(s){ return ehAguardando(s)?0:s==="Recusado"?1:s==="Prorrogação Aprovada"?2:3; }
export function fBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

// Converte o texto de um campo de valor (ex.: "10.543,33", "10543,33" ou
// "10000") num number pronto pra salvar no banco. Aceita ponto de milhar
// (ignorado) e vírgula decimal (vira ponto). Nunca retorna a máscara.
export function parseMoedaInput(v){
  if(v==null||v==="") return null;
  if(typeof v==="number") return isNaN(v)?null:v;
  const limpo = String(v).replace(/\./g,"").replace(",",".");
  if(limpo==="") return null;
  const n = Number(limpo);
  return isNaN(n) ? null : n;
}
// Formata um valor (number ou texto já digitado) pro padrão brasileiro
// "10.000,00", sempre com 2 casas decimais. Usado pra exibir o campo de
// valor formatado (ao carregar e ao sair do campo).
export function fMoedaInput(v){
  const n = typeof v==="number" ? v : parseMoedaInput(v);
  if(n==null||isNaN(n)) return "";
  return n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
}
// Sanitiza o que foi digitado num campo de valor enquanto o usuário ainda
// está digitando: só dígitos e uma vírgula, no máximo 2 casas depois dela.
// Não insere separador de milhar aqui (isso só acontece em fMoedaInput, ao
// sair do campo) pra não brigar com a posição do cursor durante a digitação.
export function sanitizarMoedaInput(v){
  let s = String(v||"").replace(/[^\d,]/g,"");
  const i = s.indexOf(",");
  if(i!==-1) s = s.slice(0,i+1) + s.slice(i+1).replace(/,/g,"").slice(0,2);
  return s;
}
export function fillTpl(tpl, d){
  return tpl
    .replace(/\{\{nome\}\}/g, d.representante||"")
    .replace(/\{\{cpfCnpj\}\}/g, d.cpfCnpj||"")
    .replace(/\{\{email\}\}/g, d.email||"")
    .replace(/\{\{telefone\}\}/g, d.telefone||"")
    .replace(/\{\{dataInicio\}\}/g, d.dataInicio||"")
    .replace(/\{\{porcentagem\}\}/g, d.porcentagem||"");
}
export function nowT(){ return new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }
export function nowF(){ return new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
export function fmtData(iso){ return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
// Formata uma data "YYYY-MM-DD" (coluna date, sem hora) pra "DD/MM/YYYY".
// Não usa o construtor Date: "YYYY-MM-DD" é interpretado como UTC meia-noite,
// e num fuso atrás de UTC (Brasil) isso pode voltar um dia no display.
export function fData(iso){
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  return d+"/"+m+"/"+y;
}

// Converte uma linha da tabela profiles (Supabase) para o formato usado pela UI.
export function mapProfileRow(row): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    setor: row.setor,
    initials: row.initials || getIn(row.name),
    color: row.color || "#2563EB",
    senha: "",
    photo: row.photo_url,
    email: row.email,
    status: row.status,
    lastAccess: row.last_access ? fmtData(row.last_access) : undefined,
    nomeExibicao: row.nome_exibicao || "",
  };
}

// Diretório público (função profiles_publico, sem exigir login) — só os campos
// exibidos na tela de login (nome/setor/avatar). Usado antes de autenticar.
export function mapDiretorioRow(row): User {
  return { id:row.id, name:row.name, role:"func", setor:row.setor, initials:row.initials || getIn(row.name), color:row.color || "#2563EB", senha:"", email:row.email, status:"offline" };
}

// Fallback só usado se o profile ainda não existir (ex.: trigger não processou a tempo).
export function fallbackProfile(authUser: { id:string; email?:string }): User {
  const nome = (authUser.email||"Usuário").split("@")[0];
  return { id:authUser.id, name:nome, role:"func", setor:"—", initials:getIn(nome), color:"#2563EB", senha:"", email:authUser.email, status:"online" };
}

// Converte uma linha da tabela tarefas (+ tarefas_historico aninhado) para o formato usado pela UI.
export function mapTarefaRow(row): Tarefa {
  return {
    id: row.id,
    fornecedor: row.fornecedor,
    valor: row.valor==null ? "" : row.valor,
    vencimento: row.vencimento,
    status: row.status,
    responsavel: row.responsavel_id,
    obs: row.observacao || "",
    historico: (row.tarefas_historico||[]).map(h=>({
      data: h.created_at ? h.created_at.split("T")[0] : hoje,
      novoVencimento: h.novo_vencimento,
      motivo: h.motivo || "",
    })),
  };
}

// Converte uma linha da tabela pendencias (NFs em negociação com fornecedores) para a UI.
export function mapPendenciaRow(row){
  return { id: row.id, fornecedor: row.fornecedor, nf: row.numero_nf, vencimento: row.vencimento || "", estado: row.estado, situacao: row.situacao, valor: row.valor, criadoPor: row.created_by, dataAprovacao: row.data_aprovacao_prorrogacao || "", criadoEm: row.created_at ? row.created_at.split("T")[0] : "" };
}

// Converte uma linha da tabela contratos (+ representantes aninhado, via representante_id) para a UI.
export function mapContratoRow(row): Contrato {
  return {
    id: row.id,
    representante: row.representantes ? row.representantes.nome : "",
    cpfCnpj: row.cpf_cnpj || "",
    porcentagem: row.porcentagem==null ? "" : String(row.porcentagem),
    email: row.email || "",
    telefone: row.telefone || "",
    dataInicio: row.data_inicio,
    tipo: row.tipo,
    status: row.status,
    documentoTexto: row.documento_texto || "",
  };
}

// Converte uma linha da tabela auditoria (append-only) para a UI.
// "referencia" guarda o nome do que a ação descreve (fornecedor da tarefa,
// nome do representante etc.); "usuario_nome" é a cópia do nome de quem
// agiu, preservada mesmo que o profile seja excluído depois.
export function mapAuditoriaRow(row): AuditEntry {
  return {
    id: row.id,
    tipo: row.tipo,
    tarefa: row.referencia || "",
    usuario: row.usuario_nome || "",
    hora: row.created_at ? fmtData(row.created_at) : "",
    detalhe: row.detalhe || "",
  };
}

// Converte uma linha da tabela representantes para a UI.
export function mapRepresentanteRow(row){
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf || "",
    regiao: row.regiao,
    supervisorId: row.supervisor_id || "",
    status: row.status,
    dataEntrada: row.data_entrada,
    dataSaida: row.data_saida || "",
    motivoSaida: row.motivo_saida || "",
    numeroCore: row.numero_core || "",
    tipoVinculo: row.tipo_vinculo || "",
    vinculoDataInicio: row.vinculo_data_inicio || "",
    vinculoDataTerminoPrevisto: row.vinculo_data_termino_previsto || "",
    statusContrato: row.status_contrato || "",
    contratoDataEnvio: row.contrato_data_envio || "",
    contratoDataConclusao: row.contrato_data_conclusao || "",
  };
}

// Converte uma linha de supervisores_lista() (já mascarada pra Demonstração
// pelo próprio banco) para a UI.
export function mapSupervisorRow(row){
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf || "",
    email: row.email || "",
    telefone: row.telefone || "",
    dataNascimento: row.data_nascimento || "",
    cargo: row.cargo || "",
    regiao: row.regiao,
    dataInicio: row.data_inicio || "",
    dataFim: row.data_fim || "",
    status: row.status,
    observacoes: row.observacoes || "",
    foto: row.foto_url || "",
  };
}

// Converte uma linha da tabela funcionarios (cadastro do RH) para a UI.
export function mapFuncionarioRow(row){
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone || "",
    dataEntrada: row.data_entrada || "",
    tipoVinculo: row.tipo_vinculo,
    valeTransporte: !!row.vale_transporte,
    valeRefeicao: !!row.vale_refeicao,
    observacoes: row.observacoes || "",
    status: row.status,
    dataSaida: row.data_saida || "",
  };
}

export function validarImagem(file){
  if(!TIPOS_IMG_PERMITIDOS.includes(file.type)) return {ok:false, erro:"Formato não suportado. Envie uma imagem PNG, JPG ou JPEG."};
  if(file.size>TAMANHO_MAX_IMG) return {ok:false, erro:"Arquivo muito grande. O limite é 5MB."};
  return {ok:true};
}
export function lerComoDataURL(file){
  return new Promise<string>((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result as string);
    reader.onerror = ()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
}
