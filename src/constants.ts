export const LIGHT = { bg:"#F8FAFC",white:"#FFFFFF",text:"#111827",muted:"#6B7280",border:"#E5E7EB",blue:"#2563EB",blueSoft:"#EFF6FF",blueText:"#1D4ED8",green:"#22C55E",greenSoft:"#F0FDF4",greenText:"#15803D",red:"#EF4444",redSoft:"#FEF2F2",redText:"#B91C1C",orange:"#F59E0B",orangeSoft:"#FFFBEB",orangeText:"#B45309",gray:"#E5E7EB",purple:"#8B5CF6",purpleSoft:"#F5F3FF",purpleText:"#6D28D9" };
export const DARK  = { bg:"#070A13",white:"#0F1526",text:"#F5F7FA",muted:"#8D99AE",border:"#212B42",blue:"#3E93FF",blueSoft:"#132B54",blueText:"#7EB8FF",green:"#22C55E",greenSoft:"#0F3D28",greenText:"#4ADE80",red:"#F0585F",redSoft:"#3A171A",redText:"#F79A9E",orange:"#EFA857",orangeSoft:"#3D2A12",orangeText:"#F7C888",gray:"#212B42",purple:"#A78BFA",purpleSoft:"#2A2059",purpleText:"#D3C2FB" };

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
