# BP-Visionn

Sistema web interno desenvolvido para gestão de tarefas, pendências, contratos e acompanhamento operacional de representantes comerciais.

O projeto nasceu de uma necessidade real de melhorar a supervisão do setor financeiro e operacional da empresa, centralizando informações que antes eram controladas manualmente em planilhas e documentos separados.

Além do desenvolvimento do sistema, o projeto também foi utilizado para aplicação prática de conceitos de Git, GitHub, documentação técnica e práticas de Quality Assurance (QA).

---

## 🚀 Demonstração

Em constante evolução.

> Versão atual: 1.0

---

## 📸 Telas do Sistema

![Login (modo claro)](images/tela-login-modoclaro.png)

![Login (modo escuro)](images/tela-login-modoescuro.png)

![Dashboard](images/tela-inicial.png)

![Tela Inicial](images/tela-inicio.png)

![Auditoria](images/tela-auditoria.png)

![Pendências](images/tela-pendencias.png)

![Tarefas](images/tela-tarefas.png)

![Calendário](images/tela-calendario.png)

![Contratos](images/tela-modelodecontratosupervisor.png)

![Impressão PDF](images/tela-impressao.png)

![Configurações](images/tela-configuracoes.png)

---

## 📋 Sobre o Projeto

Antes do sistema, o acompanhamento das tarefas era realizado manualmente, dificultando o rastreamento das atividades, a distribuição das demandas e a visualização das informações em tempo real.

O BP-Visionn foi desenvolvido para oferecer maior organização, produtividade e controle operacional, permitindo que a supervisão acompanhe indicadores importantes do setor em um único ambiente.

---

## ✨ Funcionalidades

- Dashboard com métricas em tempo real e gráfico de tarefas por status;
- Calendário de vencimentos e eventos, com versão resumida na tela inicial de cada funcionária;
- Gestão de tarefas: criação, edição, exclusão, conclusão, reabertura e prorrogação;
- Aba de pendências com atribuição e troca de responsável;
- Controle operacional dos contratos e geração de documentos a partir de modelos;
- Histórico das alterações realizadas (auditoria);
- Controle de acesso por perfil de usuário (Supervisora e Funcionárias);
- Impressão e exportação de documentos em PDF via navegador;
- Modo escuro;
- Interface responsiva;
- Organização das informações em tempo real.

---

## 🚀 Tecnologias Utilizadas

| Tecnologia | Utilização |
|------------|-----------|
| React 19 | Interface e componentes |
| TypeScript | Tipagem do projeto |
| Vite | Ambiente de desenvolvimento |
| Git | Versionamento do código |
| GitHub | Hospedagem do projeto |
| Impressão do navegador | Geração e exportação de documentos em PDF |
| LocalStorage | Persistência da foto de perfil do usuário |
| CSS Variables | Tema claro e escuro |
| Lucide Icons | Ícones da aplicação |

---

## 🔐 Controle de Acesso

O sistema utiliza controle de permissões baseado em perfis de usuários.

| Perfil | Permissões |
|--------|------------|
| Supervisora | Acesso completo ao sistema |
| Funcionárias | Visualização e gerenciamento das suas atividades |

---

## ⚙️ Como Executar Localmente

```bash
# Clone o repositório
git clone https://github.com/barbaratechdev/BP-Visionn.git

# Acesse a pasta do projeto
cd BP-Visionn

# Instale as dependências
npm install

# Execute o projeto
npm run dev
```

Acesse:

```
http://localhost:5173
```

---

## 📁 Estrutura do Projeto

```text
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
```

---

## 🧪 Quality Assurance (QA)

Durante o desenvolvimento do projeto foram realizadas atividades relacionadas à validação das funcionalidades do sistema, incluindo:

- Testes funcionais;
- Identificação e correção de bugs;
- Validação das regras de negócio;
- Testes das funcionalidades implementadas;
- Testes realizados em ambiente local (localhost);
- Validação das correções aplicadas;
- Documentação das melhorias implementadas.

O projeto continua sendo utilizado como ambiente prático para evolução dos conhecimentos em desenvolvimento Front-end e Quality Assurance (QA).

---

## 🧠 Conceitos Aplicados

- Component-Based Development;
- Git e GitHub;
- Versionamento de código;
- Responsividade;
- UX/UI;
- Controle de permissões por perfil;
- Documentação técnica;
- Quality Assurance (QA);
- Organização e evolução contínua do produto.

---

## 🔄 Melhorias Futuras

As próximas versões do projeto contemplam:

- Melhorias na experiência do usuário (UX/UI);
- Evolução do Dashboard;
- Implementação de automação de testes;
- Melhorias na acessibilidade;
- Novas funcionalidades operacionais;
- Deploy da aplicação;
- Evolução contínua da documentação técnica.

---

## 👩‍💻 Autora

**Bárbara Pinon**

- Estudante de Engenharia de Software;
- Desenvolvedora Front-end em formação;
- Interessada em Desenvolvimento Web e Quality Assurance (QA).

> "Este projeto representa não apenas um sistema funcional, mas também a minha evolução prática em desenvolvimento de software, documentação técnica e resolução de problemas reais."
