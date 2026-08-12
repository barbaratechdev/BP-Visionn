import { hoje, TIPOS_IMG_PERMITIDOS, TAMANHO_MAX_IMG } from "../constants";
import type { User, Tarefa, Contrato, AuditEntry } from "../types";

export function getIn(n){ return n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
export function fBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
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
  return { id: row.id, fornecedor: row.fornecedor, nf: row.numero_nf, vencimento: row.vencimento || "", estado: row.estado, situacao: row.situacao };
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
