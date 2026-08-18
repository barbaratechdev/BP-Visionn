import type { CSSProperties } from "react";

export type User = { id:string; name:string; role:string; setor:string; initials:string; color:string; senha:string; photo?:string|null; email?:string; status?:"online"|"away"|"offline"; lastAccess?:string; nomeExibicao?:string; };
export type Tarefa = { id:string; fornecedor:string; valor:number | string; vencimento:string; status:string; responsavel:string; obs:string; historico:Array<{data:string; novoVencimento:string; motivo:string}>; };
export type Contrato = { id:string; representante:string; cpfCnpj:string; porcentagem:string; email:string; telefone:string; dataInicio:string; tipo:string; status?:string; documentoTexto?:string; };
export type AuditEntry = { id:number; tipo:string; tarefa:string; usuario:string; hora:string; detalhe:string; };

export type AppStyles = {
  inp: CSSProperties;
  lbl: CSSProperties;
  btn: CSSProperties;
  btnBlue: CSSProperties;
  card: CSSProperties;
};
