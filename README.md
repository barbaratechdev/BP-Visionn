# BP-Visionn

Sistema web interno desenvolvido para gestão de tarefas, pendências, contratos e acompanhamento operacional de representantes comerciais.

O projeto nasceu de uma necessidade real de melhorar a supervisão do setor financeiro e operacional da empresa, centralizando informações que antes eram controladas manualmente em planilhas e documentos separados.

Além do desenvolvimento do sistema, o projeto também foi utilizado para aplicação prática de conceitos de Git, GitHub, documentação técnica e práticas de Quality Assurance (QA).

---

## 🚀 Demonstração

Em constante evolução.

| Versão | Status | Última atualização |
|--------|--------|---------------------|
| 1.0 | Em desenvolvimento | Julho/2026 |

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

- Autenticação real por e-mail e senha (Supabase Auth), com sessão persistente e recuperação de senha por e-mail;
- Dashboard com métricas em tempo real e gráfico de tarefas por status;
- Calendário de vencimentos e eventos, com versão resumida na tela inicial de cada funcionária;
- Gestão de tarefas: criação, edição, exclusão, conclusão, reabertura e prorrogação (com histórico);
- Aba de pendências com atribuição e troca de responsável;
- Controle operacional dos contratos, com representante vinculado, edição do documento e histórico da última revisão;
- Módulo de representantes: cadastro, edição, pesquisa e filtros (região, status, supervisor);
- Histórico das alterações realizadas (auditoria);
- Controle de acesso por perfil de usuário (Supervisora e Funcionárias), reforçado no banco de dados via Row Level Security;
- Cadastro e edição dos dados da equipe pela Supervisora, direto em Configurações;
- Impressão e exportação de documentos em PDF via navegador;
- Modo escuro;
- Interface responsiva;
- Dados sincronizados em tempo real com o banco (Supabase).

---

## 🚀 Tecnologias Utilizadas

| Tecnologia | Utilização |
|------------|-----------|
| React 19 | Interface e componentes |
| TypeScript | Tipagem do projeto |
| Vite | Ambiente de desenvolvimento |
| Supabase | Autenticação, banco de dados (Postgres) e Row Level Security |
| Git | Versionamento do código |
| GitHub | Hospedagem do código-fonte |
| Vercel | Deploy e hospedagem da aplicação |
| Impressão do navegador | Geração e exportação de documentos em PDF |
| CSS Variables | Tema claro e escuro |
| Lucide Icons | Ícones da aplicação |

---

## 🗄️ Banco de Dados

O schema (tabelas, políticas de segurança e funções) fica versionado como código em [`supabase/migrations`](supabase/migrations), aplicado via SQL Editor do Supabase ou `supabase db push`.

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfil de cada usuário (nome, cargo, setor, avatar) — 1:1 com a autenticação |
| `representantes` | Representantes comerciais (nome, CPF, região, supervisor, status, entrada/saída) |
| `contratos` | Contratos vinculados a um representante, com histórico da última revisão do documento |
| `tarefas` / `tarefas_historico` | Boletos a pagar e o histórico de prorrogações de cada um |
| `pendencias` | Notas fiscais em negociação com fornecedores |
| `auditoria` | Trilha de auditoria (append-only) |

---

## 🔐 Controle de Acesso

O sistema utiliza controle de permissões baseado em perfis de usuários, aplicado tanto na interface quanto no banco de dados (Row Level Security).

| Perfil | Permissões |
|--------|------------|
| Supervisora (admin) | Acesso completo ao sistema |
| Financeiro | Cria e edita contratos, representantes e pendências; não exclui |
| Funcionárias | Visualização e gerenciamento das suas próprias tarefas |

---

## 🛡️ Segurança

- **Autenticação real** via Supabase Auth — login por e-mail/senha, sessão persistente e recuperação de senha por e-mail (sem revelar se um e-mail está cadastrado).
- **Row Level Security** habilitado em todas as tabelas: cada consulta ao banco já é filtrada pelo perfil de quem está logado, e não apenas escondida na tela.
- **Restrições em nível de coluna:** gatilhos no banco impedem que uma conta altere o próprio cargo/setor (autopromoção) ou edite campos fora do que a interface permite para o seu perfil.
- **XSS corrigido** na exportação de documentos (Contratos → Exportar PDF): o conteúdo é montado via `document.createElement`/`textContent`, que nunca interpreta HTML, em vez de concatenar strings.
- **Variáveis de ambiente** nunca commitadas — apenas a chave pública (`anon key`) do Supabase é exposta no navegador, como esperado nesse modelo; o acesso real aos dados é controlado pelas políticas do banco, não pela chave.
- **Cabeçalhos de segurança** (`vercel.json`): CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Strict-Transport-Security` aplicados em produção.

---

## ⚙️ Como Executar Localmente

```bash
# Clone o repositório
git clone https://github.com/barbaratechdev/BP-Visionn.git

# Acesse a pasta do projeto
cd BP-Visionn

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase
# (Project Settings > API no painel do Supabase)

# Execute o projeto
npm run dev
```

Antes de logar, aplique as migrações em [`supabase/migrations`](supabase/migrations) no seu projeto Supabase (SQL Editor ou `supabase db push`) e crie os usuários em Authentication > Users.

Acesse:

```
http://localhost:5173
```

---

## ☁️ Deploy (Vercel)

O projeto é uma SPA estática (Vite + React), compatível com o preset "Vite" da Vercel sem configuração adicional. Um `vercel.json` já define os cabeçalhos de segurança da aplicação.

1. Acesse [vercel.com](https://vercel.com) e importe o repositório `BP-Visionn` do GitHub;
2. A Vercel detecta o framework automaticamente (Build Command: `npm run build`, Output Directory: `dist`);
3. Em **Settings > Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do seu projeto Supabase;
4. Clique em **Deploy**.

Para gerar o build de produção localmente:

```bash
npm run build
npm run preview
```

---

## 📁 Estrutura do Projeto

```text
src/
├── components/      # Componentes de apresentação (Av, Badge, Calendario, ...)
├── lib/
│   ├── supabase.ts  # Cliente Supabase
│   └── helpers.ts   # Funções utilitárias e conversão de dados do banco
├── App.tsx          # Componente principal (telas e regras de negócio)
├── constants.ts     # Temas, listas e modelos de contrato
├── types.ts         # Tipos TypeScript compartilhados
├── index.css
├── main.tsx
└── vite-env.d.ts

supabase/
└── migrations/      # Schema, RLS e funções do banco (versionado como código)

public/
images/

.env.example
package.json
vite.config.ts
vercel.json
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
- Navegação lateral responsiva para telas pequenas;
- Divisão do componente principal em telas menores, uma por rota/aba;
- Conectar a trilha de auditoria ao Supabase (hoje ainda é local ao navegador);
- Fluxo de convite/criação de conta real para novos usuários da equipe;
- Evolução do Dashboard;
- Implementação de automação de testes;
- Melhorias na acessibilidade;
- Novas funcionalidades operacionais;
- Evolução contínua da documentação técnica.

---

## 👩‍💻 Autora

**Bárbara Pinon**

- Estudante de Engenharia de Software;
- Desenvolvedora Front-end em formação;
- Interessada em Desenvolvimento Web e Quality Assurance (QA).

> "Este projeto representa não apenas um sistema funcional, mas também a minha evolução prática em desenvolvimento de software, documentação técnica e resolução de problemas reais."
