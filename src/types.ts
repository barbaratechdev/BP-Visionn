import type { CSSProperties } from "react";

export type User = { id:string; name:string; role:string; setor:string; initials:string; color:string; senha:string; photo?:string|null; email?:string; status?:"online"|"away"|"offline"; lastAccess?:string; nomeExibicao?:string; };
export type Tarefa = { id:string; fornecedor:string; valor:number | string; vencimento:string; status:string; responsavel:string; obs:string; historico:Array<{data:string; novoVencimento:string; motivo:string}>; };
export type Contrato = { id:string; representante:string; cpfCnpj:string; porcentagem:string; email:string; telefone:string; dataInicio:string; tipo:string; status?:string; documentoTexto?:string; };
export type AuditEntry = { id:number; tipo:string; tarefa:string; usuario:string; hora:string; detalhe:string; };

// Controle de Avarias — ver 20260924000000_create_avarias.sql e seguintes.
// status resume o ciclo de vida da avaria (avaria -> solicitação ->
// concessão -> aplicação), sincronizado pelo cliente a cada transição.
export type AvariaStatus = "ABERTA"|"SOLICITADO"|"EM_ANALISE"|"CONCEDIDO"|"NEGADO"|"APLICADO"|"CANCELADO";
export type Avaria = {
  id:string; filial:string; numeroNf:string; dataNf:string; produtoNome:string; produtoCodigo:string;
  quantidade:number|string; tipoAvaria:string; descricao:string; valorProduto:number|null; valorAvaria:number|null;
  dataIdentificacao:string; identificadoPor:string; observacoes:string; status:AvariaStatus;
  createdBy:string; createdByNome:string; createdAt:string; updatedAt:string;
};
export type AvariaSolicitacaoStatus = "SOLICITADO"|"EM_ANALISE"|"CONCEDIDO"|"NEGADO"|"CANCELADO";
export type AvariaSolicitacao = {
  id:string; avariaId:string; dataSolicitacao:string; solicitanteId:string; solicitanteNome:string;
  laboratorio:string; canal:string; protocolo:string; referenciaComunicacao:string; valorSolicitado:number|null;
  observacoes:string; status:AvariaSolicitacaoStatus; motivo:string; createdAt:string;
};
export type AvariaCancelavelStatus = "ATIVA"|"CANCELADA";
export type AvariaConcessao = {
  id:string; solicitacaoId:string; avariaId:string; dataConcessao:string; valorSolicitado:number|null;
  valorConcedido:number; percentual:number|null; confirmadoPorId:string; confirmadoPorNome:string;
  protocolo:string; comprovanteReferencia:string; observacoes:string; status:AvariaCancelavelStatus;
  motivoCancelamento:string; canceladoEm:string; canceladoPorNome:string; createdAt:string;
};
export type AvariaAplicacao = {
  id:string; concessaoId:string; avariaId:string; nfOrigem:string; nfAplicacao:string; dataAplicacao:string;
  valorAplicado:number; responsavelId:string; responsavelNome:string; observacoes:string; status:AvariaCancelavelStatus;
  motivoCancelamento:string; canceladoEm:string; canceladoPorNome:string; createdAt:string;
};
export type AvariaHistoricoEntry = {
  id:number; avariaId:string; tipo:string; descricao:string; valorAnterior:string; valorNovo:string;
  referenciaAvariaId:string; createdBy:string; criadoPorNome:string; createdAt:string;
};

export type AppStyles = {
  inp: CSSProperties;
  lbl: CSSProperties;
  btn: CSSProperties;
  btnBlue: CSSProperties;
  card: CSSProperties;
};
