import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Save, AlertCircle, History, Send, CheckCircle2, XCircle, Ban, PackageCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fBRL, fData, fDataHoraBR, parseMoedaInput, fMoedaInput, mapAvariaSolicitacaoRow, mapAvariaConcessaoRow, mapAvariaAplicacaoRow, mapAvariaHistoricoRow, nomeVisivel } from "../lib/helpers";
import { hoje } from "../constants";
import CampoValor from "./CampoValor";

const CANAIS = ["E-mail","WhatsApp","Sistema","Telefone","Portal do laboratório","Outro"];

const SOL_FORM_VAZIO = {dataSolicitacao:hoje,laboratorio:"",canal:"E-mail",protocolo:"",referenciaComunicacao:"",valorSolicitado:"",observacoes:""};
const CON_FORM_VAZIO = {dataConcessao:hoje,valorConcedido:"",protocolo:"",comprovanteReferencia:"",observacoes:""};
const NEG_FORM_VAZIO = {motivo:""};
const CANC_FORM_VAZIO = {motivo:""};
const APL_FORM_VAZIO = {nfOrigem:"",nfAplicacao:"",dataAplicacao:hoje,valorAplicado:"",observacoes:""};

// Cor/rótulo por status — mesma lista usada em Avarias.tsx (duplicada de
// propósito, igual corSituacaoExame em FuncionarioPerfil.tsx: é um mapa
// pequeno, específico de cada tela, não vale a pena compartilhar).
function statusInfo(s, D){
  return ({
    ABERTA: {label:"Aberta", bg:D.bg, c:D.muted},
    SOLICITADO: {label:"Solicitado", bg:D.blueSoft, c:D.blueText},
    EM_ANALISE: {label:"Em análise", bg:D.orangeSoft, c:D.orangeText},
    CONCEDIDO: {label:"Concedido", bg:D.greenSoft, c:D.greenText},
    NEGADO: {label:"Negado", bg:D.redSoft, c:D.redText},
    APLICADO: {label:"Aplicado", bg:D.purpleSoft, c:D.purpleText},
    CANCELADO: {label:"Cancelado", bg:D.bg, c:D.muted},
  })[s] || {label:s, bg:D.bg, c:D.muted};
}

const rowStyle = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",gap:10};

// Painel de detalhe de uma avaria — espelha FuncionarioPerfil.tsx: cabeçalho
// com voltar/editar, cartões de dados e uma linha do tempo. Diferente de
// FuncionarioPerfil (que usa abas), aqui o fluxo é sequencial e guiado por
// avaria.status (ver ctaPrincipal), então tudo fica visível numa rolagem só
// — é mais importante conseguir ver de relance "essa avaria já teve
// desconto concedido?" do que navegar entre abas.
export default function AvariaDetalhe(p) {
  const D = p.D, st = p.st, addA = p.addA, addN = p.addN, user = p.user, avaria = p.avaria;
  const onVoltar = p.onVoltar, onEditar = p.onEditar;
  const isDemo = !!p.isDemo;
  const podeEditar = !isDemo;
  const usuarioNome = nomeVisivel(user);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(avaria.status);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [concessoes, setConcessoes] = useState([]);
  const [aplicacoes, setAplicacoes] = useState([]);
  const [historico, setHistorico] = useState([]);

  useEffect(()=>{
    let ativo = true;
    async function carregarTudo(){
      setLoading(true);
      const [sol, con, apl, hist] = await Promise.all([
        supabase.from("avaria_solicitacoes").select("*").eq("avaria_id",avaria.id).order("created_at",{ascending:false}),
        supabase.from("avaria_concessoes").select("*").eq("avaria_id",avaria.id).order("created_at",{ascending:false}),
        supabase.from("avaria_aplicacoes").select("*").eq("avaria_id",avaria.id).order("created_at",{ascending:false}),
        supabase.from("avaria_historico").select("*").eq("avaria_id",avaria.id).order("created_at",{ascending:false}),
      ]);
      if(!ativo) return;
      if(sol.data) setSolicitacoes(sol.data.map(mapAvariaSolicitacaoRow));
      if(con.data) setConcessoes(con.data.map(mapAvariaConcessaoRow));
      if(apl.data) setAplicacoes(apl.data.map(mapAvariaAplicacaoRow));
      if(hist.data) setHistorico(hist.data.map(mapAvariaHistoricoRow));
      setStatus(avaria.status);
      setLoading(false);
    }
    carregarTudo();
    return ()=>{ ativo = false; };
  },[avaria.id]);

  // "Atual" é sempre solicitacoes[0] (lista já ordenada por created_at
  // desc) — mesmo raciocínio de avaria_solicitacoes_atual no banco, nunca
  // uma coluna "ativa" separada.
  const solicitacaoAtual = solicitacoes.length ? solicitacoes[0] : null;
  const concessaoAtual = solicitacaoAtual ? (concessoes.find(c=>c.solicitacaoId===solicitacaoAtual.id) || null) : null;

  // Insere na linha do tempo desta avaria — além de (não em vez de) addA,
  // que alimenta o feed global de auditoria do sistema.
  async function registrarHistorico(tipo, descricao, valorAnterior=null, valorNovo=null){
    const { data } = await supabase.from("avaria_historico").insert({
      avaria_id: avaria.id, tipo, descricao,
      valor_anterior: valorAnterior, valor_novo: valorNovo,
      created_by: user?user.id:null, criado_por_nome: usuarioNome||null,
    }).select().single();
    if(data) setHistorico(prev=>[mapAvariaHistoricoRow(data),...prev]);
  }

  // .select().single() é o que permite distinguir "RLS bloqueou/id não
  // bateu" (0 linhas afetadas) de sucesso — um .update() puro sem select
  // não gera erro nenhum quando 0 linhas casam, só devolve sucesso vazio,
  // o que faria o status local avançar mesmo sem a avaria ter mudado de
  // verdade no banco (achado da auditoria: todo caller precisa checar o
  // retorno antes de seguir, não só chamar e ignorar).
  async function atualizarStatusAvaria(novoStatus){
    const { data, error } = await supabase.from("avarias").update({status:novoStatus}).eq("id",avaria.id).select().single();
    if(!error&&data) setStatus(novoStatus);
    return !error&&!!data;
  }

  // Mesmo raciocínio de atualizarStatusAvaria, genérico pras tabelas
  // filhas (solicitação/concessão/aplicação) — usado em toda ação rápida
  // que não tem formulário próprio de erro dedicado.
  async function atualizarLinha(tabela, id, patch){
    const { data, error } = await supabase.from(tabela).update(patch).eq("id",id).select().single();
    return { ok:!error&&!!data, data, error };
  }

  const referencia = avaria.numeroNf+" — "+avaria.produtoNome;

  // --- Solicitar desconto (também usada pra "Nova solicitação", depois de
  // NEGADO/CANCELADO — mesma função, uma nova linha em avaria_solicitacoes) ---
  const [showSolForm, setShowSolForm] = useState(false);
  const [solForm, setSolForm] = useState(SOL_FORM_VAZIO);
  const [solErr, setSolErr] = useState("");
  const [solSalvando, setSolSalvando] = useState(false);

  // Pré-preenche com o laboratório informado no cadastro da avaria — o
  // usuário pode trocar aqui sem alterar o laboratório original da
  // avaria: são dois campos distintos (avarias.laboratorio vs
  // avaria_solicitacoes.laboratorio), este formulário só grava o segundo.
  function abrirSolicitar(){ setSolForm({...SOL_FORM_VAZIO, laboratorio:avaria.laboratorio||""}); setSolErr(""); setShowSolForm(true); }

  async function salvarSolicitacao(){
    if(!solForm.laboratorio.trim()){ setSolErr("Informe o laboratório."); return; }
    setSolSalvando(true); setSolErr("");
    const payload = {
      avaria_id: avaria.id,
      data_solicitacao: solForm.dataSolicitacao||hoje,
      solicitante_id: user?user.id:null,
      solicitante_nome: usuarioNome||null,
      laboratorio: solForm.laboratorio.trim(),
      canal: solForm.canal,
      protocolo: solForm.protocolo.trim()||null,
      referencia_comunicacao: solForm.referenciaComunicacao.trim()||null,
      valor_solicitado: parseMoedaInput(solForm.valorSolicitado),
      observacoes: solForm.observacoes.trim()||null,
    };
    const { data, error } = await supabase.from("avaria_solicitacoes").insert(payload).select().single();
    setSolSalvando(false);
    if(error||!data){ setSolErr("Não foi possível salvar. Verifique os dados e tente novamente."); return; }
    const linha = mapAvariaSolicitacaoRow(data);
    setSolicitacoes(prev=>[linha,...prev]);
    await atualizarStatusAvaria("SOLICITADO");
    await registrarHistorico("SOLICITACAO_CRIADA","Desconto solicitado ao laboratório "+linha.laboratorio+" via "+linha.canal+".");
    addA("Desconto solicitado", referencia, "Laboratório: "+linha.laboratorio+(linha.valorSolicitado?", valor "+fBRL(linha.valorSolicitado):""));
    addN("Solicitação de desconto enviada: NF "+avaria.numeroNf);
    setShowSolForm(false);
  }

  // --- Marcar em análise --- único botão de ação rápida sem modal
  // próprio — usa acaoRapidaErr pra ter onde mostrar falha.
  const [acaoRapidaErr, setAcaoRapidaErr] = useState("");

  async function marcarEmAnalise(){
    if(!solicitacaoAtual) return;
    setAcaoRapidaErr("");
    const { ok, data } = await atualizarLinha("avaria_solicitacoes", solicitacaoAtual.id, {status:"EM_ANALISE"});
    if(!ok){ setAcaoRapidaErr("Não foi possível marcar como em análise. Tente novamente."); return; }
    setSolicitacoes(prev=>prev.map(s=>s.id===solicitacaoAtual.id?mapAvariaSolicitacaoRow(data):s));
    const okAvaria = await atualizarStatusAvaria("EM_ANALISE");
    if(!okAvaria){ setAcaoRapidaErr("Solicitação atualizada, mas não foi possível atualizar o status da avaria. Recarregue a página."); return; }
    await registrarHistorico("STATUS_ALTERADO","Solicitação em análise pelo laboratório.",solicitacaoAtual.status,"EM_ANALISE");
    addA("Status alterado", referencia, "Em análise");
  }

  // --- Registrar concessão ---
  const [showConForm, setShowConForm] = useState(false);
  const [conForm, setConForm] = useState(CON_FORM_VAZIO);
  const [conErr, setConErr] = useState("");
  const [conSalvando, setConSalvando] = useState(false);

  function abrirConceder(){ setConForm(CON_FORM_VAZIO); setConErr(""); setShowConForm(true); }

  async function salvarConcessao(){
    if(!solicitacaoAtual) return;
    const valor = parseMoedaInput(conForm.valorConcedido);
    if(valor==null||valor<0){ setConErr("Informe o valor concedido."); return; }
    setConSalvando(true); setConErr("");
    const payload = {
      solicitacao_id: solicitacaoAtual.id,
      avaria_id: avaria.id,
      data_concessao: conForm.dataConcessao||hoje,
      valor_solicitado: solicitacaoAtual.valorSolicitado,
      valor_concedido: valor,
      confirmado_por_id: user?user.id:null,
      confirmado_por_nome: usuarioNome||null,
      protocolo: conForm.protocolo.trim()||null,
      comprovante_referencia: conForm.comprovanteReferencia.trim()||null,
      observacoes: conForm.observacoes.trim()||null,
    };
    const { data, error } = await supabase.from("avaria_concessoes").insert(payload).select().single();
    setConSalvando(false);
    if(error||!data){ setConErr(error&&error.code==="23505"?"Essa solicitação já tem uma concessão registrada.":"Não foi possível salvar."); return; }
    const linha = mapAvariaConcessaoRow(data);
    setConcessoes(prev=>[linha,...prev]);
    const solRes = await atualizarLinha("avaria_solicitacoes", solicitacaoAtual.id, {status:"CONCEDIDO"});
    if(!solRes.ok){ setConErr("Concessão registrada, mas não foi possível atualizar a solicitação. Recarregue a página."); return; }
    setSolicitacoes(prev=>prev.map(s=>s.id===solicitacaoAtual.id?mapAvariaSolicitacaoRow(solRes.data):s));
    const okAvaria = await atualizarStatusAvaria("CONCEDIDO");
    if(!okAvaria){ setConErr("Concessão registrada, mas não foi possível atualizar o status da avaria. Recarregue a página."); return; }
    await registrarHistorico("DESCONTO_CONCEDIDO","Desconto concedido: "+fBRL(valor)+(linha.percentual!=null?" ("+linha.percentual+"%)":"")+".", null, fBRL(valor));
    addA("Desconto concedido", referencia, fBRL(valor));
    addN("Desconto concedido: NF "+avaria.numeroNf+" — "+fBRL(valor));
    setShowConForm(false);
  }

  // --- Registrar negativa ---
  const [showNegForm, setShowNegForm] = useState(false);
  const [negForm, setNegForm] = useState(NEG_FORM_VAZIO);
  const [negErr, setNegErr] = useState("");
  const [negSalvando, setNegSalvando] = useState(false);

  async function registrarNegativa(){
    if(!solicitacaoAtual) return;
    if(!negForm.motivo.trim()){ setNegErr("Informe o motivo da negativa."); return; }
    setNegSalvando(true); setNegErr("");
    const { ok, data } = await atualizarLinha("avaria_solicitacoes", solicitacaoAtual.id, {status:"NEGADO",motivo:negForm.motivo.trim()});
    if(!ok){ setNegSalvando(false); setNegErr("Não foi possível salvar."); return; }
    setSolicitacoes(prev=>prev.map(s=>s.id===solicitacaoAtual.id?mapAvariaSolicitacaoRow(data):s));
    const okAvaria = await atualizarStatusAvaria("NEGADO");
    setNegSalvando(false);
    if(!okAvaria){ setNegErr("Negativa registrada, mas não foi possível atualizar o status da avaria. Recarregue a página."); return; }
    await registrarHistorico("DESCONTO_NEGADO","Desconto negado pelo laboratório — "+negForm.motivo.trim()+".");
    addA("Desconto negado", referencia, negForm.motivo.trim());
    setShowNegForm(false);
  }

  // --- Cancelar solicitação ---
  const [showCancForm, setShowCancForm] = useState(false);
  const [cancForm, setCancForm] = useState(CANC_FORM_VAZIO);
  const [cancErr, setCancErr] = useState("");
  const [cancSalvando, setCancSalvando] = useState(false);

  async function cancelarSolicitacao(){
    if(!solicitacaoAtual) return;
    setCancSalvando(true); setCancErr("");
    const { ok, data } = await atualizarLinha("avaria_solicitacoes", solicitacaoAtual.id, {status:"CANCELADO",motivo:cancForm.motivo.trim()||null});
    if(!ok){ setCancSalvando(false); setCancErr("Não foi possível cancelar. Tente novamente."); return; }
    setSolicitacoes(prev=>prev.map(s=>s.id===solicitacaoAtual.id?mapAvariaSolicitacaoRow(data):s));
    const okAvaria = await atualizarStatusAvaria("CANCELADO");
    setCancSalvando(false);
    if(!okAvaria){ setCancErr("Solicitação cancelada, mas não foi possível atualizar o status da avaria. Recarregue a página."); return; }
    await registrarHistorico("SOLICITACAO_CANCELADA","Solicitação cancelada"+(cancForm.motivo.trim()?" — "+cancForm.motivo.trim():"")+".");
    addA("Solicitação cancelada", referencia, cancForm.motivo.trim()||"—");
    setShowCancForm(false);
  }

  // --- Registrar aplicação ---
  const [showAplForm, setShowAplForm] = useState(false);
  const [aplForm, setAplForm] = useState(APL_FORM_VAZIO);
  const [aplErr, setAplErr] = useState("");
  const [aplSalvando, setAplSalvando] = useState(false);

  function abrirAplicar(){
    setAplForm({...APL_FORM_VAZIO, nfOrigem:avaria.numeroNf, valorAplicado:concessaoAtual?fMoedaInput(concessaoAtual.valorConcedido):""});
    setAplErr(""); setShowAplForm(true);
  }

  async function salvarAplicacao(){
    if(!concessaoAtual) return;
    if(!aplForm.nfAplicacao.trim()){ setAplErr("Informe a NF onde o desconto foi aplicado."); return; }
    const valor = parseMoedaInput(aplForm.valorAplicado);
    if(valor==null||valor<0){ setAplErr("Informe o valor aplicado."); return; }
    setAplSalvando(true); setAplErr("");
    const payload = {
      concessao_id: concessaoAtual.id,
      avaria_id: avaria.id,
      nf_origem: aplForm.nfOrigem.trim()||avaria.numeroNf,
      nf_aplicacao: aplForm.nfAplicacao.trim(),
      data_aplicacao: aplForm.dataAplicacao||hoje,
      valor_aplicado: valor,
      responsavel_id: user?user.id:null,
      responsavel_nome: usuarioNome||null,
      observacoes: aplForm.observacoes.trim()||null,
    };
    const { data, error } = await supabase.from("avaria_aplicacoes").insert(payload).select().single();
    setAplSalvando(false);
    if(error||!data){ setAplErr("Não foi possível salvar."); return; }
    const linha = mapAvariaAplicacaoRow(data);
    setAplicacoes(prev=>[linha,...prev]);
    const okAvaria = await atualizarStatusAvaria("APLICADO");
    if(!okAvaria){ setAplErr("Aplicação registrada, mas não foi possível atualizar o status da avaria. Recarregue a página."); return; }
    await registrarHistorico("DESCONTO_APLICADO","Desconto de "+fBRL(valor)+" aplicado na NF "+linha.nfAplicacao+".");
    addA("Desconto aplicado", referencia, "NF "+linha.nfAplicacao+" — "+fBRL(valor));
    addN("Desconto aplicado: NF "+linha.nfAplicacao);
    setShowAplForm(false);
  }

  // --- Cancelar avaria (exclusão física foi removida do módulo — corrigir
  // um cadastro errado é sempre por cancelamento, nunca DELETE) — só faz
  // sentido enquanto não existe nenhuma solicitação ainda (status ABERTA);
  // depois disso, "Cancelar solicitação" já cuida de encerrar a tentativa
  // em andamento sem precisar de uma ação separada pra avaria em si. ---
  const [showCancAvariaForm, setShowCancAvariaForm] = useState(false);
  const [cancAvariaForm, setCancAvariaForm] = useState(CANC_FORM_VAZIO);
  const [cancAvariaErr, setCancAvariaErr] = useState("");
  const [cancAvariaSalvando, setCancAvariaSalvando] = useState(false);

  async function cancelarAvaria(){
    setCancAvariaSalvando(true); setCancAvariaErr("");
    const ok = await atualizarStatusAvaria("CANCELADO");
    setCancAvariaSalvando(false);
    if(!ok){ setCancAvariaErr("Não foi possível cancelar. Tente novamente."); return; }
    await registrarHistorico("AVARIA_CANCELADA","Avaria cancelada"+(cancAvariaForm.motivo.trim()?" — "+cancAvariaForm.motivo.trim():"")+".","ABERTA","CANCELADO");
    addA("Avaria cancelada", referencia, cancAvariaForm.motivo.trim()||"—");
    setShowCancAvariaForm(false);
  }

  // --- Cancelar concessão — bloqueado pelo banco (trigger
  // avaria_concessoes_check_cancelamento) se existir aplicação ATIVA
  // vinculada; aqui a checagem é só pra já não oferecer o botão nesse
  // caso (a trava de verdade é a do banco, isso é só melhor experiência).
  // Cancelar também reabre a solicitação pra CANCELADO (permite nova
  // tentativa) e a avaria volta pra CANCELADO — mesmo raciocínio de
  // "Cancelar solicitação", só que a concessão já tinha sido registrada. ---
  const [showCancConForm, setShowCancConForm] = useState(false);
  const [cancConForm, setCancConForm] = useState(CANC_FORM_VAZIO);
  const [cancConErr, setCancConErr] = useState("");
  const [cancConSalvando, setCancConSalvando] = useState(false);

  const aplicacaoAtivaDaConcessaoAtual = concessaoAtual ? aplicacoes.find(a=>a.concessaoId===concessaoAtual.id && a.status==="ATIVA") : null;

  async function cancelarConcessao(){
    if(!concessaoAtual||!solicitacaoAtual) return;
    if(!cancConForm.motivo.trim()){ setCancConErr("Informe o motivo do cancelamento."); return; }
    setCancConSalvando(true); setCancConErr("");
    const { ok, data, error } = await atualizarLinha("avaria_concessoes", concessaoAtual.id, {
      status:"CANCELADA", motivo_cancelamento:cancConForm.motivo.trim(),
      cancelado_em:new Date().toISOString(), cancelado_por:user?user.id:null, cancelado_por_nome:usuarioNome||null,
    });
    if(!ok){
      setCancConSalvando(false);
      setCancConErr(error&&error.message&&error.message.includes("aplicação ativa")?error.message:"Não foi possível cancelar. Verifique se não existe uma aplicação ativa vinculada.");
      return;
    }
    setConcessoes(prev=>prev.map(c=>c.id===concessaoAtual.id?mapAvariaConcessaoRow(data):c));
    const solRes = await atualizarLinha("avaria_solicitacoes", solicitacaoAtual.id, {status:"CANCELADO",motivo:"Concessão cancelada — "+cancConForm.motivo.trim()});
    if(!solRes.ok){ setCancConSalvando(false); setCancConErr("Concessão cancelada, mas não foi possível atualizar a solicitação. Recarregue a página."); return; }
    setSolicitacoes(prev=>prev.map(s=>s.id===solicitacaoAtual.id?mapAvariaSolicitacaoRow(solRes.data):s));
    const okAvaria = await atualizarStatusAvaria("CANCELADO");
    setCancConSalvando(false);
    if(!okAvaria){ setCancConErr("Concessão cancelada, mas não foi possível atualizar o status da avaria. Recarregue a página."); return; }
    await registrarHistorico("CONCESSAO_CANCELADA","Concessão de "+fBRL(concessaoAtual.valorConcedido)+" cancelada — "+cancConForm.motivo.trim()+".","ATIVA","CANCELADA");
    addA("Concessão cancelada", referencia, cancConForm.motivo.trim());
    setShowCancConForm(false);
  }

  // --- Cancelar aplicação — cada aplicação cancela individualmente (pode
  // haver mais de uma NF de aplicação por concessão). Se não sobrar
  // nenhuma aplicação ATIVA depois, a avaria volta de APLICADO pra
  // CONCEDIDO (o desconto continua concedido, só não está mais aplicado
  // em NF nenhuma) — reabre "Registrar aplicação" no fluxo guiado. ---
  const [cancelandoAplicacaoId, setCancelandoAplicacaoId] = useState(null);
  const [cancAplForm, setCancAplForm] = useState(CANC_FORM_VAZIO);
  const [cancAplErr, setCancAplErr] = useState("");
  const [cancAplSalvando, setCancAplSalvando] = useState(false);

  async function cancelarAplicacao(){
    if(!cancelandoAplicacaoId) return;
    const aplicacao = aplicacoes.find(a=>a.id===cancelandoAplicacaoId);
    if(!aplicacao) return;
    setCancAplSalvando(true); setCancAplErr("");
    const { ok, data } = await atualizarLinha("avaria_aplicacoes", cancelandoAplicacaoId, {
      status:"CANCELADA", motivo_cancelamento:cancAplForm.motivo.trim()||null,
      cancelado_em:new Date().toISOString(), cancelado_por:user?user.id:null, cancelado_por_nome:usuarioNome||null,
    });
    if(!ok){ setCancAplSalvando(false); setCancAplErr("Não foi possível cancelar. Tente novamente."); return; }
    const linhaAtualizada = mapAvariaAplicacaoRow(data);
    const aplicacoesAtualizadas = aplicacoes.map(a=>a.id===cancelandoAplicacaoId?linhaAtualizada:a);
    setAplicacoes(aplicacoesAtualizadas);
    const aindaTemAtiva = aplicacoesAtualizadas.some(a=>a.status==="ATIVA");
    if(!aindaTemAtiva && status==="APLICADO"){
      const okAvaria = await atualizarStatusAvaria("CONCEDIDO");
      setCancAplSalvando(false);
      if(!okAvaria){ setCancAplErr("Aplicação cancelada, mas não foi possível atualizar o status da avaria. Recarregue a página."); return; }
    } else {
      setCancAplSalvando(false);
    }
    await registrarHistorico("APLICACAO_CANCELADA","Aplicação de "+fBRL(aplicacao.valorAplicado)+" na NF "+aplicacao.nfAplicacao+" cancelada"+(cancAplForm.motivo.trim()?" — "+cancAplForm.motivo.trim():"")+".","ATIVA","CANCELADA");
    addA("Aplicação cancelada", referencia, "NF "+aplicacao.nfAplicacao);
    setCancelandoAplicacaoId(null);
  }

  // Botão principal, conforme o status atual — é isso que guia o fluxo
  // Nova Avaria -> Solicitar -> Em análise/Conceder/Negar -> Aplicar sem o
  // usuário precisar lembrar sozinho qual é o próximo passo. Escondido
  // enquanto loading=true: as ações dependem de solicitacaoAtual/
  // concessaoAtual, que só existem depois que os dados chegam — clicar
  // antes disso levaria a um formulário que salva silenciosamente nada
  // (achado da auditoria: "loading" liberava botões cedo demais).
  function ctaPrincipal(){
    if(!podeEditar||loading) return null;
    if(status==="ABERTA") return {label:"Solicitar desconto", Icon:Send, onClick:abrirSolicitar};
    if(status==="SOLICITADO"||status==="EM_ANALISE") return {label:"Registrar concessão", Icon:CheckCircle2, onClick:abrirConceder};
    if(status==="CONCEDIDO") return {label:"Registrar aplicação do desconto", Icon:PackageCheck, onClick:abrirAplicar};
    if(status==="NEGADO"||status==="CANCELADO") return {label:"Nova solicitação", Icon:Send, onClick:abrirSolicitar};
    return null;
  }
  const cta = ctaPrincipal();
  const rInp = st.inp, rLbl = st.lbl;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onVoltar} style={{...st.btn,padding:"8px 10px"}} title="Voltar"><ArrowLeft size={16}/></button>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:D.text}}>NF {avaria.numeroNf} — {avaria.produtoNome}</div>
            <div style={{fontSize:12.5,color:D.muted}}>{avaria.filial}{avaria.produtoCodigo?" — Código "+avaria.produtoCodigo:""}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:600,background:statusInfo(status,D).bg,color:statusInfo(status,D).c,borderRadius:20,padding:"4px 12px"}}>{statusInfo(status,D).label}</span>
          {podeEditar&&onEditar&&<button style={st.btn} onClick={onEditar}><Pencil size={13}/>Editar dados</button>}
          {cta&&<button style={st.btnBlue} onClick={cta.onClick}><cta.Icon size={14}/>{cta.label}</button>}
        </div>
      </div>

      {!loading&&(status==="SOLICITADO"||status==="EM_ANALISE")&&podeEditar&&(
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {status==="SOLICITADO"&&<button style={{...st.btn,fontSize:12}} onClick={marcarEmAnalise}>Marcar em análise</button>}
            <button style={{...st.btn,fontSize:12,color:D.redText,borderColor:D.red+"44"}} onClick={()=>{setNegForm(NEG_FORM_VAZIO);setNegErr("");setShowNegForm(true);}}><XCircle size={13}/>Registrar negativa</button>
            <button style={{...st.btn,fontSize:12}} onClick={()=>{setCancForm(CANC_FORM_VAZIO);setCancErr("");setShowCancForm(true);}}><Ban size={13}/>Cancelar solicitação</button>
          </div>
          {acaoRapidaErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:10,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{acaoRapidaErr}</div>}
        </div>
      )}

      {!loading&&status==="ABERTA"&&podeEditar&&(
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          <button style={{...st.btn,fontSize:12,color:D.redText,borderColor:D.red+"44"}} onClick={()=>{setCancAvariaForm(CANC_FORM_VAZIO);setCancAvariaErr("");setShowCancAvariaForm(true);}}><Ban size={13}/>Cancelar avaria</button>
        </div>
      )}

      {loading?(
        <div style={{textAlign:"center",padding:"2rem",color:D.muted,fontSize:13}}>Carregando avaria...</div>
      ):(<>

      {/* DADOS DA AVARIA */}
      <div className="bv-card" style={st.card}>
        <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Dados da avaria</div>
        <div style={{background:D.bg,borderRadius:10,padding:"4px 14px"}}>
          {[
            {label:"Laboratório", value:avaria.laboratorio||"—"},
            {label:"Filial", value:avaria.filial},
            {label:"Número da NF", value:avaria.numeroNf},
            {label:"Data da NF", value:avaria.dataNf?fData(avaria.dataNf):"—"},
            {label:"Produto", value:avaria.produtoNome},
            {label:"Código do produto", value:avaria.produtoCodigo||"—"},
            {label:"Quantidade", value:avaria.quantidade},
            {label:"Tipo de avaria", value:avaria.tipoAvaria},
            {label:"Descrição", value:avaria.descricao||"—"},
            {label:"Valor do produto", value:avaria.valorProduto!=null?fBRL(avaria.valorProduto):"—"},
            {label:"Valor da avaria", value:avaria.valorAvaria!=null?fBRL(avaria.valorAvaria):"—"},
            {label:"Data da identificação", value:avaria.dataIdentificacao?fData(avaria.dataIdentificacao):"—"},
            {label:"Identificado por", value:avaria.identificadoPor},
            {label:"Observações", value:avaria.observacoes||"—"},
            {label:"Registrado por", value:avaria.createdByNome||"—"},
          ].map((r,i)=>(
            <div key={r.label} style={{...rowStyle,borderTop:i>0?"1px solid "+D.border:"none"}}>
              <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
              <span style={{fontSize:13,color:D.text,fontWeight:600,textAlign:"right"}}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SOLICITAÇÃO ATUAL */}
      <div className="bv-card" style={st.card}>
        <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Solicitação de desconto</div>
        {!solicitacaoAtual?(
          <div style={{fontSize:13,color:D.muted}}>Nenhuma solicitação registrada ainda.</div>
        ):(<>
          <div style={{background:D.bg,borderRadius:10,padding:"4px 14px"}}>
            {[
              {label:"Data da solicitação", value:fData(solicitacaoAtual.dataSolicitacao)},
              {label:"Solicitante", value:solicitacaoAtual.solicitanteNome||"—"},
              {label:"Laboratório", value:solicitacaoAtual.laboratorio},
              {label:"Canal", value:solicitacaoAtual.canal},
              {label:"Protocolo", value:solicitacaoAtual.protocolo||"—"},
              {label:"Referência da comunicação", value:solicitacaoAtual.referenciaComunicacao||"—"},
              {label:"Valor solicitado", value:solicitacaoAtual.valorSolicitado!=null?fBRL(solicitacaoAtual.valorSolicitado):"—"},
              {label:"Status", value:statusInfo(solicitacaoAtual.status,D).label},
              ...(solicitacaoAtual.motivo?[{label:"Motivo", value:solicitacaoAtual.motivo}]:[]),
              {label:"Observações", value:solicitacaoAtual.observacoes||"—"},
            ].map((r,i)=>(
              <div key={r.label} style={{...rowStyle,borderTop:i>0?"1px solid "+D.border:"none"}}>
                <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
                <span style={{fontSize:13,color:D.text,fontWeight:600,textAlign:"right"}}>{r.value}</span>
              </div>
            ))}
          </div>
          {solicitacoes.length>1&&(
            <div style={{fontSize:11,color:D.muted,marginTop:8}}>{solicitacoes.length-1} solicitação(ões) anterior(es) — ver linha do tempo abaixo.</div>
          )}
        </>)}
      </div>

      {/* CONCESSÃO */}
      {concessaoAtual&&(
        <div className="bv-card" style={st.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,display:"flex",alignItems:"center",gap:8}}>
              Concessão
              <span style={{fontSize:11,fontWeight:600,background:concessaoAtual.status==="CANCELADA"?D.redSoft:D.greenSoft,color:concessaoAtual.status==="CANCELADA"?D.redText:D.greenText,borderRadius:20,padding:"2px 9px",textTransform:"none",letterSpacing:0}}>{concessaoAtual.status==="CANCELADA"?"Cancelada":"Ativa"}</span>
            </div>
            {podeEditar&&concessaoAtual.status==="ATIVA"&&!aplicacaoAtivaDaConcessaoAtual&&(
              <button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} onClick={()=>{setCancConForm(CANC_FORM_VAZIO);setCancConErr("");setShowCancConForm(true);}}><Ban size={12}/>Cancelar concessão</button>
            )}
          </div>
          <div style={{background:D.bg,borderRadius:10,padding:"4px 14px"}}>
            {[
              {label:"Data da concessão", value:fData(concessaoAtual.dataConcessao)},
              {label:"Valor solicitado", value:concessaoAtual.valorSolicitado!=null?fBRL(concessaoAtual.valorSolicitado):"—"},
              {label:"Valor concedido", value:fBRL(concessaoAtual.valorConcedido)},
              {label:"Percentual concedido", value:concessaoAtual.percentual!=null?concessaoAtual.percentual+"%":"—"},
              {label:"Laboratório", value:solicitacaoAtual?solicitacaoAtual.laboratorio:"—"},
              {label:"Confirmado por", value:concessaoAtual.confirmadoPorNome||"—"},
              {label:"Protocolo", value:concessaoAtual.protocolo||"—"},
              {label:"Comprovante", value:concessaoAtual.comprovanteReferencia||"—"},
              {label:"Observações", value:concessaoAtual.observacoes||"—"},
              ...(concessaoAtual.status==="CANCELADA"?[
                {label:"Motivo do cancelamento", value:concessaoAtual.motivoCancelamento||"—"},
                {label:"Cancelada em", value:concessaoAtual.canceladoEm?fDataHoraBR(concessaoAtual.canceladoEm):"—"},
                {label:"Cancelada por", value:concessaoAtual.canceladoPorNome||"—"},
              ]:[]),
            ].map((r,i)=>(
              <div key={r.label} style={{...rowStyle,borderTop:i>0?"1px solid "+D.border:"none"}}>
                <span style={{fontSize:12.5,color:D.muted}}>{r.label}</span>
                <span style={{fontSize:13,color:D.text,fontWeight:600,textAlign:"right"}}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* APLICAÇÃO */}
      {aplicacoes.length>0&&(
        <div className="bv-card" style={st.card}>
          <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Aplicação do desconto</div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {aplicacoes.map((a,i)=>(
              <div key={a.id} style={{padding:"10px 0",borderTop:i>0?"1px solid "+D.border:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:13,color:D.text,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                    NF {a.nfAplicacao}
                    {a.status==="CANCELADA"&&<span style={{fontSize:10,fontWeight:600,background:D.redSoft,color:D.redText,borderRadius:20,padding:"2px 8px"}}>Cancelada</span>}
                  </span>
                  <span style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,color:D.text,fontWeight:700}}>{fBRL(a.valorAplicado)}</span>
                    {podeEditar&&a.status==="ATIVA"&&<button style={{...st.btn,padding:"4px 8px",fontSize:11,color:D.redText,borderColor:D.red+"44"}} onClick={()=>{setCancAplForm(CANC_FORM_VAZIO);setCancAplErr("");setCancelandoAplicacaoId(a.id);}}><Ban size={12}/>Cancelar</button>}
                  </span>
                </div>
                <div style={{fontSize:12,color:D.muted,marginTop:2}}>Aplicado em {fData(a.dataAplicacao)} por {a.responsavelNome||"—"} — origem NF {a.nfOrigem}</div>
                {a.observacoes&&<div style={{fontSize:12,color:D.muted,marginTop:2,fontStyle:"italic"}}>{a.observacoes}</div>}
                {a.status==="CANCELADA"&&<div style={{fontSize:12,color:D.redText,marginTop:2}}>Cancelada em {a.canceladoEm?fDataHoraBR(a.canceladoEm):"—"} por {a.canceladoPorNome||"—"}{a.motivoCancelamento?" — "+a.motivoCancelamento:""}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTÓRICO / LINHA DO TEMPO */}
      <div className="bv-card" style={st.card}>
        <div style={{fontSize:11,fontWeight:600,color:D.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><History size={13}/>Histórico</div>
        {historico.length===0?<div style={{fontSize:13,color:D.muted}}>Nenhum evento registrado ainda.</div>:(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {historico.map(h=>(
              <div key={h.id} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:h.tipo==="TENTATIVA_DUPLICIDADE"?D.orange:D.blue,marginTop:6,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:600,color:D.text}}>{h.descricao}</span>
                    <span style={{fontSize:11,color:D.muted,whiteSpace:"nowrap"}}>{fDataHoraBR(h.createdAt)}</span>
                  </div>
                  {h.criadoPorNome&&<div style={{fontSize:11,color:D.muted,marginTop:3}}>Registrado por {h.criadoPorNome}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>)}

      {/* MODAL: solicitar desconto / nova solicitação */}
      {showSolForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!solSalvando&&setShowSolForm(false)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:560,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.blueSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Send size={20} color={D.blue}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:20}}>{status==="NEGADO"||status==="CANCELADO"?"Nova solicitação de desconto":"Solicitar desconto ao laboratório"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              <div><label style={rLbl}>Data da solicitação</label><input type="date" style={rInp} value={solForm.dataSolicitacao} onChange={e=>setSolForm(f=>({...f,dataSolicitacao:e.target.value}))}/></div>
              <div><label style={rLbl}>Laboratório</label><input autoFocus style={rInp} value={solForm.laboratorio} onChange={e=>{setSolForm(f=>({...f,laboratorio:e.target.value}));setSolErr("");}}/></div>
              <div><label style={rLbl}>Canal</label>
                <select style={rInp} value={solForm.canal} onChange={e=>setSolForm(f=>({...f,canal:e.target.value}))}>
                  {CANAIS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={rLbl}>Protocolo</label><input style={rInp} value={solForm.protocolo} onChange={e=>setSolForm(f=>({...f,protocolo:e.target.value}))}/></div>
              <div><label style={rLbl}>Valor solicitado (R$)</label><CampoValor style={rInp} value={solForm.valorSolicitado} onChange={v=>setSolForm(f=>({...f,valorSolicitado:v}))} onBlur={()=>setSolForm(f=>({...f,valorSolicitado:fMoedaInput(f.valorSolicitado)}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>E-mail/identificação da comunicação</label><input style={rInp} value={solForm.referenciaComunicacao} onChange={e=>setSolForm(f=>({...f,referenciaComunicacao:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Observações</label><textarea rows={2} style={{...rInp,resize:"vertical"}} value={solForm.observacoes} onChange={e=>setSolForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>
            {solErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{solErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowSolForm(false)} disabled={solSalvando}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvarSolicitacao} disabled={solSalvando}>{solSalvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: registrar concessão */}
      {showConForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!conSalvando&&setShowConForm(false)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:520,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><CheckCircle2 size={20} color={D.green}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:20}}>Registrar concessão</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              <div><label style={rLbl}>Data da concessão</label><input type="date" style={rInp} value={conForm.dataConcessao} onChange={e=>setConForm(f=>({...f,dataConcessao:e.target.value}))}/></div>
              <div><label style={rLbl}>Valor concedido (R$)</label><CampoValor style={rInp} value={conForm.valorConcedido} onChange={v=>{setConForm(f=>({...f,valorConcedido:v}));setConErr("");}} onBlur={()=>setConForm(f=>({...f,valorConcedido:fMoedaInput(f.valorConcedido)}))}/></div>
              <div><label style={rLbl}>Protocolo</label><input style={rInp} value={conForm.protocolo} onChange={e=>setConForm(f=>({...f,protocolo:e.target.value}))}/></div>
              <div><label style={rLbl}>Comprovante</label><input style={rInp} placeholder="Referência do comprovante" value={conForm.comprovanteReferencia} onChange={e=>setConForm(f=>({...f,comprovanteReferencia:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Observações</label><textarea rows={2} style={{...rInp,resize:"vertical"}} value={conForm.observacoes} onChange={e=>setConForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>
            {conErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{conErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowConForm(false)} disabled={conSalvando}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvarConcessao} disabled={conSalvando}>{conSalvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: registrar negativa */}
      {showNegForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!negSalvando&&setShowNegForm(false)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><XCircle size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:20}}>Registrar negativa do laboratório</div>
            <label style={rLbl}>Motivo</label>
            <textarea rows={3} style={{...rInp,resize:"vertical"}} value={negForm.motivo} onChange={e=>{setNegForm({motivo:e.target.value});setNegErr("");}}/>
            {negErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{negErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowNegForm(false)} disabled={negSalvando}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={registrarNegativa} disabled={negSalvando}>{negSalvando?"Salvando...":"Confirmar negativa"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: cancelar solicitação */}
      {showCancForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!cancSalvando&&setShowCancForm(false)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.bg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Ban size={20} color={D.muted}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:6}}>Cancelar solicitação?</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:16}}>A solicitação atual será marcada como cancelada. Você poderá abrir uma nova solicitação depois.</div>
            <label style={rLbl}>Motivo (opcional)</label>
            <textarea rows={2} style={{...rInp,resize:"vertical"}} value={cancForm.motivo} onChange={e=>setCancForm({motivo:e.target.value})}/>
            {cancErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{cancErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowCancForm(false)} disabled={cancSalvando}>Voltar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={cancelarSolicitacao} disabled={cancSalvando}>{cancSalvando?"Salvando...":"Confirmar cancelamento"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: registrar aplicação */}
      {showAplForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!aplSalvando&&setShowAplForm(false)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:520,width:"100%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.purpleSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><PackageCheck size={20} color={D.purple}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:20}}>Registrar aplicação do desconto</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              <div><label style={rLbl}>NF de origem</label><input style={rInp} value={aplForm.nfOrigem} onChange={e=>setAplForm(f=>({...f,nfOrigem:e.target.value}))}/></div>
              <div><label style={rLbl}>NF onde foi aplicado</label><input autoFocus style={rInp} value={aplForm.nfAplicacao} onChange={e=>{setAplForm(f=>({...f,nfAplicacao:e.target.value}));setAplErr("");}}/></div>
              <div><label style={rLbl}>Data da aplicação</label><input type="date" style={rInp} value={aplForm.dataAplicacao} onChange={e=>setAplForm(f=>({...f,dataAplicacao:e.target.value}))}/></div>
              <div><label style={rLbl}>Valor aplicado (R$)</label><CampoValor style={rInp} value={aplForm.valorAplicado} onChange={v=>{setAplForm(f=>({...f,valorAplicado:v}));setAplErr("");}} onBlur={()=>setAplForm(f=>({...f,valorAplicado:fMoedaInput(f.valorAplicado)}))}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={rLbl}>Observações</label><textarea rows={2} style={{...rInp,resize:"vertical"}} value={aplForm.observacoes} onChange={e=>setAplForm(f=>({...f,observacoes:e.target.value}))}/></div>
            </div>
            {aplErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{aplErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowAplForm(false)} disabled={aplSalvando}>Cancelar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.blue,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={salvarAplicacao} disabled={aplSalvando}>{aplSalvando?"Salvando...":<><Save size={14}/>Salvar</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: cancelar avaria */}
      {showCancAvariaForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!cancAvariaSalvando&&setShowCancAvariaForm(false)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Ban size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:6}}>Cancelar avaria?</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:16}}>O registro continua existindo, só muda de status. Isso não apaga nada — é a forma correta de corrigir uma avaria cadastrada por engano.</div>
            <label style={rLbl}>Motivo (opcional)</label>
            <textarea rows={2} style={{...rInp,resize:"vertical"}} value={cancAvariaForm.motivo} onChange={e=>setCancAvariaForm({motivo:e.target.value})}/>
            {cancAvariaErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{cancAvariaErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowCancAvariaForm(false)} disabled={cancAvariaSalvando}>Voltar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={cancelarAvaria} disabled={cancAvariaSalvando}>{cancAvariaSalvando?"Salvando...":"Confirmar cancelamento"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: cancelar concessão */}
      {showCancConForm&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!cancConSalvando&&setShowCancConForm(false)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Ban size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:6}}>Cancelar concessão?</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:16}}>O registro de {concessaoAtual?fBRL(concessaoAtual.valorConcedido):""} continua existindo, marcado como cancelado. A solicitação volta a poder ser refeita.</div>
            <label style={rLbl}>Motivo do cancelamento</label>
            <textarea rows={2} style={{...rInp,resize:"vertical"}} value={cancConForm.motivo} onChange={e=>{setCancConForm({motivo:e.target.value});setCancConErr("");}}/>
            {cancConErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{cancConErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setShowCancConForm(false)} disabled={cancConSalvando}>Voltar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={cancelarConcessao} disabled={cancConSalvando}>{cancConSalvando?"Salvando...":"Confirmar cancelamento"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: cancelar aplicação */}
      {cancelandoAplicacaoId&&(
        <div className="bv-modal-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}} onClick={()=>!cancAplSalvando&&setCancelandoAplicacaoId(null)}>
          <div className="bv-modal-card" style={{background:D.white,borderRadius:18,padding:"2rem",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:48,height:48,borderRadius:12,background:D.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Ban size={20} color={D.red}/></div>
            <div style={{fontWeight:700,fontSize:17,color:D.text,textAlign:"center",marginBottom:6}}>Cancelar aplicação?</div>
            <div style={{fontSize:13,color:D.muted,textAlign:"center",marginBottom:16}}>O registro continua existindo, marcado como cancelado. Se não sobrar nenhuma aplicação ativa, a avaria volta pro status Concedido.</div>
            <label style={rLbl}>Motivo (opcional)</label>
            <textarea rows={2} style={{...rInp,resize:"vertical"}} value={cancAplForm.motivo} onChange={e=>setCancAplForm({motivo:e.target.value})}/>
            {cancAplErr&&<div style={{fontSize:12,color:D.redText,background:D.redSoft,borderRadius:8,padding:"7px 10px",marginTop:14,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/>{cancAplErr}</div>}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+D.border,background:D.white,cursor:"pointer",fontSize:14,color:D.text,fontWeight:500}} onClick={()=>setCancelandoAplicacaoId(null)} disabled={cancAplSalvando}>Voltar</button>
              <button style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:D.red,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}} onClick={cancelarAplicacao} disabled={cancAplSalvando}>{cancAplSalvando?"Salvando...":"Confirmar cancelamento"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
