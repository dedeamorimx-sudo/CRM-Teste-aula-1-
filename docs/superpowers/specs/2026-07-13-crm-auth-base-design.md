# Design — Base de Autenticação do CRM

**Data:** 2026-07-13
**Status:** Aprovado (aguardando revisão final do documento)

## Objetivo

Construir a base de autenticação de um CRM: uma **tela de login** que dá acesso a um **dashboard protegido** com estrutura visual pronta (casca), incluindo logout. As funcionalidades de CRM em si (contatos, negócios, funil) ficam para projetos seguintes.

## Escopo

**Dentro do escopo:**
- Tela de login (e-mail + senha) conectada ao Supabase.
- Dashboard protegido com casca visual: sidebar, topbar (usuário + botão Sair) e área central de boas-vindas.
- Logout funcional.
- Proteção de rotas no servidor (middleware): não-logado → login; logado tentando acessar login → dashboard.
- Visual moderno com Tailwind, em português.
- Base de código organizada para receber as telas de CRM depois.
- Deploy do app Next.js no EasyPanel (Docker), com Supabase na nuvem.

**Fora do escopo (fica para depois):**
- Cadastro público (sign up).
- "Esqueci minha senha" / redefinição por e-mail.
- Telas reais de CRM (contatos, negócios, métricas).
- Níveis de permissão / papéis de usuário.
- Supabase self-hosted (usaremos Supabase na nuvem).

## Decisões

- **Contas:** criadas manualmente pelo admin no painel do Supabase. Sem cadastro público.
- **Método de login:** e-mail + senha.
- **Hospedagem:** app Next.js no EasyPanel (VPS via Docker); Supabase permanece na nuvem (supabase.com).

## Stack / Tecnologias

| Tecnologia | Papel |
|---|---|
| Next.js 15 (App Router) | Framework React — páginas, rotas, renderização no servidor |
| React 19 | Componentes de interface |
| TypeScript | Tipagem estática |
| Supabase (nuvem) | Autenticação (e-mail/senha), sessão e banco |
| @supabase/ssr | Integração Supabase + Next.js (sessão via cookies no servidor) |
| Tailwind CSS 4 | Estilização |
| Middleware do Next.js | Proteção de rotas / gestão de sessão |
| Docker + EasyPanel | Build e deploy do app |

## Arquitetura e fluxo

1. Usuário acessa `/` → `middleware.ts` verifica a sessão → redireciona para `/login` (deslogado) ou `/dashboard` (logado).
2. Em `/login`, o `LoginForm` chama uma Server Action que usa o cliente Supabase do servidor para validar e-mail/senha.
3. Login válido → sessão criada em cookie seguro → redireciona para `/dashboard`.
4. `/dashboard` usa o `DashboardLayout` (Sidebar + Topbar). O botão "Sair" na Topbar encerra a sessão e volta ao login.

## Estrutura do projeto

```
crm/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx            → layout raiz (fontes, estilos globais)
│  │  ├─ page.tsx              → "/" redireciona p/ login ou dashboard
│  │  ├─ globals.css           → estilos base do Tailwind
│  │  ├─ login/
│  │  │  ├─ page.tsx           → tela de login
│  │  │  └─ actions.ts         → Server Action: valida login no Supabase
│  │  └─ dashboard/
│  │     ├─ layout.tsx         → aplica o DashboardLayout
│  │     └─ page.tsx           → área central "Bem-vindo"
│  ├─ components/
│  │  ├─ LoginForm.tsx         → formulário de login (campos + erros)
│  │  ├─ Sidebar.tsx           → menu lateral (itens placeholder)
│  │  ├─ Topbar.tsx            → barra superior (usuário + Sair)
│  │  └─ DashboardLayout.tsx   → sidebar + topbar + conteúdo
│  ├─ lib/
│  │  └─ supabase/
│  │     ├─ client.ts          → cliente Supabase (navegador)
│  │     └─ server.ts          → cliente Supabase (servidor/cookies)
│  └─ middleware.ts            → protege /dashboard, gerencia sessão
├─ Dockerfile                  → build do app p/ EasyPanel
├─ .dockerignore
├─ .env.local                  → chaves do Supabase (fora do git)
├─ .env.example                → modelo das variáveis
├─ .gitignore
├─ package.json
├─ tailwind.config.ts
├─ tsconfig.json
└─ next.config.ts              → output "standalone" p/ Docker
```

## Telas e componentes

### Tela de Login (`/login`)
- Card centralizado, visual limpo.
- Campos: e-mail e senha.
- Botão "Entrar" com estado de carregamento ("Entrando...").
- Mensagem de erro em caso de falha.

### Dashboard (`/dashboard`)
- **Sidebar:** nome do CRM + itens placeholder ("Início", "Contatos", "Negócios", "Configurações"), sem funcionalidade ainda.
- **Topbar:** nome/e-mail do usuário logado + botão "Sair".
- **Área central:** mensagem de boas-vindas + cards placeholder.

### Componentes (uma responsabilidade cada)
- `LoginForm`, `Sidebar`, `Topbar`, `DashboardLayout` — o `DashboardLayout` é reaproveitado nas futuras páginas do CRM.

## Tratamento de erros

- **Login inválido:** "E-mail ou senha inválidos" (sem revelar qual dos dois).
- **Campos vazios:** validação antes de enviar ("Preencha e-mail e senha").
- **Falha inesperada/conexão:** "Algo deu errado, tente novamente" em vez de tela quebrada.

## Segurança

- Senhas armazenadas com hash pelo Supabase (nunca no nosso código).
- Dashboard protegido no servidor (middleware) — não é possível burlar pela URL.
- Sessão em cookie seguro; logout encerra de verdade.
- Chaves do Supabase em variáveis de ambiente (`.env.local` / EasyPanel), fora do git.

## Deploy (EasyPanel)

- App empacotado com Docker (`next.config` em modo `standalone` para imagem enxuta).
- Variáveis de ambiente configuradas no painel do EasyPanel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase permanece na nuvem — nada de banco/auth self-hosted.

## Tarefa manual do usuário

Criar o primeiro usuário admin pelo painel do Supabase (Authentication → Users → Add user). Passo a passo será fornecido na implementação.

## Critérios de sucesso

1. Login funcional conectado ao Supabase.
2. Dashboard protegido com sidebar + topbar + boas-vindas.
3. Logout funcionando.
4. Redirecionamentos automáticos corretos.
5. Visual moderno em português.
6. App rodando no EasyPanel via Docker.
7. Base de código organizada para crescer.
