# B-Visionn



B-Visionn
Sistema web interno desenvolvido para gestão de boletos, pendências e contratos de representantes comerciais. Projeto real criado para resolver problemas do dia a dia em ambiente corporativo.
 
 ![Tela Inicial](images/tela-inicial.png)
 ![Tela Inicial](images/tela-inicio.png)


📋 Sobre o projeto
Este sistema nasceu de uma necessidade real: melhorar a supervisão do setor financeiro de uma empresa, centralizando o controle de boletos a pagar, prorrogações e distribuição de tarefas entre a equipe.
Antes do sistema, o controle era feito manualmente em planilhas, sem visibilidade em tempo real e sem rastreamento de responsabilidades.


✨ Funcionalidades
•	Dashboard com indicadores em tempo real 
•	Prorrogação de boletos com registro de motivo e data
•	Aba de pendências com atribuição por funcionária
•	Controle de acesso por perfil (Supervisora e Funcionárias)
•	Gerador de contratos de representantes comerciais
•	Calendário de vencimentos
•	Alertas de boletos próximos do vencimento
•	Exportação para em PDF
•	Modo escuro
•	Design responsivo (desktop, tablet e mobile)



🚀 Tecnologias utilizadas
Tecnologia	    Uso
React 18	    Interface e componentes
Recharts	    Gráficos interativos
SheetJS	        Exportação para Excel
jsPDF	        Exportação para PDF
Lucide Icons	Ícones modernos
CSS Variables	Tema claro/escuro
LocalStorage	Persistência de dados


🔐 Perfis de acesso (RBAC)
O sistema implementa controle de acesso baseado em papéis:
Perfil	Permissões
Supervisora	Acesso total: cadastro, prorrogação, atribuição, contratos
Funcionária 1	Visualiza e atualiza apenas suas pendências
Funcionária 2	Visualiza e atualiza apenas suas pendências


![Tela Inicial](images/tela-auditoria.png)
![Tela Inicial](images/tela-pendencias.png)
![Tela Inicial](images/tela-tarefas.png)
![Tela Inicial](images/tela-calendario.png)
![Tela Inicial](images/tela-modelodecontratosupervisor.png)
![Tela Inicial](images/tela-impressao.png)
![Tela Inicial](images/tela-configuracoes.png)


⚙️ Como rodar localmente
# Clone o repositório
git clone https://github.com/barbaratechdev/B-Visionn.git

# Acesse a pasta
cd B-Visionn

# Instale as dependências
npm install

# Rode o projeto
npm run dev
Acesse em http://localhost:5173


📁 Estrutura do projeto
src/
├── assets/
├── App.css
├── App.tsx
├── index.css
└── main.tsx

public/

images/

package.json
vite.config.ts
tsconfig.json
README.md



🧠 Conceitos aplicados
Este projeto foi desenvolvido como parte da minha jornada em Engenharia de Software e aplica na prática os seguintes conceitos:
•	RBAC (Role-Based Access Control) — controle de permissões por perfil
•	Audit log — histórico de alterações em boletos
•	Component-driven development — interface construída em componentes reutilizáveis
•	Estado global — gerenciamento de dados entre telas
•	UX/UI — design orientado à experiência do usuário real


👩💻 Autora
Desenvolvido por Barbára Pinon 
Estudante de Engenharia de Software.


"Esse projeto resolve um problema real — e foi isso que me motivou a construí-lo."

