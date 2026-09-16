// Paleta clara: bg passou de #F8FAFC (quase idêntico ao branco dos cards)
// pra um cinza-azulado perceptível (#EDF1F7), pra dar profundidade real
// entre o fundo da página e os cards brancos — sem escurecer nada. muted e
// as variantes *Text (usadas em números/textos coloridos, nunca em
// ícone/badge/fundo) ficaram mais escuras/intensas pra melhorar legibilidade
// de labels, textos secundários e indicadores — mesmo tom de cor, mais
// contraste. Cores de identidade (blue/green/red/orange/purple e seus
// *Soft) não mudaram.
export const LIGHT = { bg:"#EDF1F7",white:"#FFFFFF",text:"#111827",muted:"#475569",border:"#DCE3EC",blue:"#2563EB",blueSoft:"#EFF6FF",blueText:"#1E40AF",green:"#22C55E",greenSoft:"#F0FDF4",greenText:"#166534",red:"#EF4444",redSoft:"#FEF2F2",redText:"#991B1B",orange:"#F59E0B",orangeSoft:"#FFFBEB",orangeText:"#92400E",gray:"#DCE3EC",purple:"#8B5CF6",purpleSoft:"#F5F3FF",purpleText:"#5B21B6" };
export const DARK  = { bg:"#070A13",white:"#0F1526",text:"#F5F7FA",muted:"#8D99AE",border:"#212B42",blue:"#3E93FF",blueSoft:"#132B54",blueText:"#7EB8FF",green:"#22C55E",greenSoft:"#0F3D28",greenText:"#4ADE80",red:"#F0585F",redSoft:"#3A171A",redText:"#F79A9E",orange:"#EFA857",orangeSoft:"#3D2A12",orangeText:"#F7C888",gray:"#212B42",purple:"#A78BFA",purpleSoft:"#2A2059",purpleText:"#D3C2FB" };

// Paleta fixa do menu lateral: identidade própria, independente do toggle
// "Modo escuro" (que continua controlando só header/conteúdo, via
// LIGHT/DARK acima) — o sidebar é sempre azul-marinho, por decisão de
// marca, mesmo com a área principal clara. bgSolid existe porque
// `background` aceita gradiente, mas `border-color` (ex.: o anel do status
// online do avatar) não.
export const SIDEBAR = { bg:"linear-gradient(180deg, #0B2A54 0%, #071A3A 100%)",bgSolid:"#081B3D",border:"rgba(255,255,255,0.08)",hover:"rgba(255,255,255,0.06)",text:"#FFFFFF",textMuted:"#93A9CC",active:"#1264E8",activeShadow:"0 8px 20px rgba(18,100,232,0.35)",danger:"#FCA5A5" };

export const hoje = new Date().toISOString().split("T")[0];
export const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const DSEM  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
export const TIPO_EV = { tarefa:{label:"Tarefa",cor:"#2563EB",bg:"#EFF6FF"}, vencimento:{label:"Vencimento",cor:"#EF4444",bg:"#FEF2F2"}, reuniao:{label:"Reunião",cor:"#8B5CF6",bg:"#F5F3FF"}, lembrete:{label:"Lembrete",cor:"#F59E0B",bg:"#FFFBEB"} };

export const MODELOS_INIT = {
  supervisor:"CONTRATO DE SUPERVISÃO COMERCIAL\n\nSupervisor: {{nome}}\nCPF/CNPJ: {{cpfCnpj}}\nE-mail: {{email}}\nTelefone: {{telefone}}\nData de Início: {{dataInicio}}\nComissão: {{porcentagem}}%\n\nCLÁUSULA 1 — DO OBJETO\nO Supervisor coordenará e supervisionará a equipe de vendas.\n\nCLÁUSULA 2 — DA REMUNERAÇÃO\nReceberá {{porcentagem}}% sobre as vendas totais da equipe, pagos mensalmente.\n\nCLÁUSULA 3 — DA VIGÊNCIA\nPrazo indeterminado, rescindível com aviso prévio de 30 dias.\n\n___________________________     ___________________________\nContratante                       Supervisor",
  vendedor:"CONTRATO DE REPRESENTAÇÃO COMERCIAL\n\nRepresentante: {{nome}}\nCPF/CNPJ: {{cpfCnpj}}\nE-mail: {{email}}\nTelefone: {{telefone}}\nData de Início: {{dataInicio}}\nComissão: {{porcentagem}}%\n\nCLÁUSULA 1 — DO OBJETO\nAtuará como agente comercial autônomo.\n\nCLÁUSULA 2 — DA REMUNERAÇÃO\nReceberá {{porcentagem}}% sobre vendas concretizadas, pagos mensalmente.\n\nCLÁUSULA 3 — DA VIGÊNCIA\nPrazo indeterminado, rescindível com aviso prévio de 30 dias.\n\n___________________________     ___________________________\nContratante                       Representante",
  recibo:"RECIBO DE PAGAMENTO\n\nNome: {{nome}}\nCPF/CNPJ: {{cpfCnpj}}\nComissão: {{porcentagem}}%\nData: {{dataInicio}}\n\nDeclaro ter recebido o valor referente à comissão sobre vendas realizadas no período.\n\n___________________________     ___________________________\nContratante                       Representante",
};
export const TIPO_MOD = { supervisor:{label:"Contrato de Supervisor",emoji:"📄"}, vendedor:{label:"Contrato de Vendedor",emoji:"📄"}, recibo:{label:"Recibo",emoji:"🧾"} };
export const AUDIT_IC = { "Tarefa criada":"✅","Status alterado":"🔄","Responsável alterado":"👤","Prorrogação":"📅","NF incluída":"📋","Contrato criado":"📄","Tarefa concluída":"✔️","Edição de informações":"✏️","Exportação PDF":"📥","Usuário criado":"🧑‍💼","Representante criado":"🪪" };

export const TIPOS_IMG_PERMITIDOS = ["image/png","image/jpeg"];
export const TAMANHO_MAX_IMG = 5*1024*1024;

// Localidades/filiais onde a empresa tem funcionários (RH > Funcionários).
// Lista fechada — mesmos valores checados no banco (ver
// 20260821000020_funcionarios_estado_filial.sql), então o seletor nunca
// grava algo fora do que o check constraint aceita.
export const ESTADOS_FILIAL = ["PA — Benevides","PA — Ananindeua (Filial)","MA","PI"];
