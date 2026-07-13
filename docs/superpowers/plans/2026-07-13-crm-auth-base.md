# CRM — Base de Autenticação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a base de autenticação de um CRM — tela de login (e-mail/senha via Supabase) que dá acesso a um dashboard protegido com casca visual (sidebar + topbar + boas-vindas) e logout.

**Architecture:** App Next.js (App Router) com autenticação Supabase na nuvem. Sessão gerenciada por cookies via `@supabase/ssr`. Proteção de rotas feita no servidor por middleware. Deploy do app via Docker no EasyPanel; Supabase permanece na nuvem.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, @supabase/ssr, Vitest (testes), Docker.

## Global Constraints

- Idioma da interface: **português (Brasil)**. Todos os textos visíveis ao usuário em pt-BR.
- Login: **e-mail + senha** apenas. Sem cadastro público, sem "esqueci minha senha".
- Contas criadas manualmente pelo admin no painel do Supabase.
- Erro de login genérico: **"E-mail ou senha inválidos"** (nunca revelar qual campo falhou).
- Erro de campos vazios: **"Preencha e-mail e senha"**.
- Import alias: `@/*` → `src/*`.
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nunca commitar segredos.
- `next.config` deve usar `output: 'standalone'` (necessário para a imagem Docker do EasyPanel).
- Commits frequentes, mensagens em português, com trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Scaffold do projeto Next.js

**Files:**
- Create: projeto Next.js completo (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/*`, `tailwind`, etc.)

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: projeto Next.js rodável com `npm run dev` e `npm run build`; alias `@/*` → `src/*`; Tailwind configurado.

- [ ] **Step 1: Mover `docs` temporariamente (create-next-app exige diretório sem arquivos conflitantes)**

```bash
mv docs ../__crm_docs_tmp
```

- [ ] **Step 2: Rodar o scaffold do Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm --yes
```

Expected: cria `package.json`, `src/app/`, `next.config.ts`, `tsconfig.json`, dependências instaladas.

- [ ] **Step 3: Restaurar `docs`**

```bash
mv ../__crm_docs_tmp docs
```

- [ ] **Step 4: Verificar que o build funciona**

Run: `npm run build`
Expected: build conclui sem erros ("Compiled successfully" / rotas listadas).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold do projeto Next.js (TypeScript + Tailwind)"
```

---

### Task 2: Clientes Supabase e variáveis de ambiente

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `.env.example`
- Create: `.env.local` (não versionado — já coberto pelo `.gitignore`)

**Interfaces:**
- Consumes: variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces:
  - `createClient()` (browser) — `src/lib/supabase/client.ts` → retorna `SupabaseClient` para uso em Client Components.
  - `createClient()` (server, async) — `src/lib/supabase/server.ts` → `Promise<SupabaseClient>` para Server Components / Server Actions, integrado aos cookies.

- [ ] **Step 1: Instalar o pacote de integração**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 2: Criar o cliente para o navegador**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 3: Criar o cliente para o servidor**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Chamado a partir de um Server Component — pode ser ignorado;
            // a atualização da sessão é feita pelo middleware.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 4: Criar `.env.example`**

Create `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

- [ ] **Step 5: Criar `.env.local` com os valores reais do projeto Supabase**

Create `.env.local` (copiar de `.env.example` e preencher com os valores do painel Supabase → Project Settings → API):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

- [ ] **Step 6: Verificar que `.env.local` NÃO será commitado**

Run: `git status --porcelain`
Expected: `.env.local` NÃO aparece na lista (está no `.gitignore`). `.env.example`, `client.ts`, `server.ts` aparecem.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/client.ts src/lib/supabase/server.ts .env.example
git commit -m "feat: clientes Supabase (browser e servidor) e variáveis de ambiente"
```

---

### Task 3: Middleware de sessão e proteção de rotas

**Files:**
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces: `updateSession(request: NextRequest): Promise<NextResponse>` — atualiza a sessão e aplica as regras de redirecionamento (deslogado em `/dashboard` → `/login`; logado em `/login` → `/dashboard`).

- [ ] **Step 1: Criar o helper de sessão do middleware**

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && path.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Criar o middleware raiz**

Create `src/middleware.ts`:

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros; middleware compilado (aparece "ƒ Middleware" na saída).

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/middleware.ts src/middleware.ts
git commit -m "feat: middleware de sessao e protecao de rotas"
```

---

### Task 4: Validador de credenciais (TDD) e Server Action de login

**Files:**
- Create: `src/lib/validateCredentials.ts`
- Create: `src/lib/validateCredentials.test.ts`
- Create: `vitest.config.ts`
- Create: `src/app/login/actions.ts`
- Modify: `package.json` (script `test`)

**Interfaces:**
- Consumes: `createClient()` de `src/lib/supabase/server.ts`.
- Produces:
  - `validateCredentials(email: string, password: string): string | null` — retorna mensagem de erro ou `null`.
  - `login(prevState: LoginState, formData: FormData): Promise<LoginState>` onde `type LoginState = { error?: string } | undefined`. Em sucesso, redireciona para `/dashboard` (lança `redirect`, não retorna).

- [ ] **Step 1: Instalar o Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Criar a configuração do Vitest (com alias `@`)**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Adicionar o script `test` ao `package.json`**

Modify `package.json` — no objeto `"scripts"`, adicionar:

```json
    "test": "vitest run"
```

- [ ] **Step 4: Escrever o teste que falha**

Create `src/lib/validateCredentials.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateCredentials } from '@/lib/validateCredentials'

describe('validateCredentials', () => {
  it('retorna erro quando o e-mail está vazio', () => {
    expect(validateCredentials('', 'senha123')).toBe('Preencha e-mail e senha')
  })

  it('retorna erro quando o e-mail é só espaços', () => {
    expect(validateCredentials('   ', 'senha123')).toBe('Preencha e-mail e senha')
  })

  it('retorna erro quando a senha está vazia', () => {
    expect(validateCredentials('a@b.com', '')).toBe('Preencha e-mail e senha')
  })

  it('retorna null quando ambos estão preenchidos', () => {
    expect(validateCredentials('a@b.com', 'senha123')).toBeNull()
  })
})
```

- [ ] **Step 5: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FALHA com erro de importação/módulo não encontrado (`validateCredentials` não existe).

- [ ] **Step 6: Implementar o validador**

Create `src/lib/validateCredentials.ts`:

```ts
export function validateCredentials(
  email: string,
  password: string,
): string | null {
  if (!email.trim() || !password) {
    return 'Preencha e-mail e senha'
  }
  return null
}
```

- [ ] **Step 7: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS (4 testes verdes).

- [ ] **Step 8: Criar a Server Action de login**

Create `src/app/login/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateCredentials } from '@/lib/validateCredentials'

export type LoginState = { error?: string } | undefined

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const validationError = validateCredentials(email, password)
  if (validationError) {
    return { error: validationError }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: 'E-mail ou senha inválidos' }
    }
  } catch {
    return { error: 'Algo deu errado, tente novamente' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

> Nota: `redirect('/dashboard')` fica **fora** do `try/catch` de propósito — internamente ele lança uma exceção de controle de fluxo do Next.js que não deve ser capturada.

- [ ] **Step 9: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 10: Commit**

```bash
git add src/lib/validateCredentials.ts src/lib/validateCredentials.test.ts vitest.config.ts src/app/login/actions.ts package.json package-lock.json
git commit -m "feat: validador de credenciais (TDD) e server action de login"
```

---

### Task 5: Componente LoginForm e página de login

**Files:**
- Create: `src/components/LoginForm.tsx`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `login`, `LoginState` de `src/app/login/actions.ts`.
- Produces: componente `<LoginForm />` (Client Component) e a rota `/login`.

- [ ] **Step 1: Criar o componente LoginForm**

Create `src/components/LoginForm.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, type LoginState } from '@/app/login/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
    >
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(
    login,
    undefined,
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="voce@empresa.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
```

- [ ] **Step 2: Criar a página de login**

Create `src/app/login/page.tsx`:

```tsx
import { LoginForm } from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="mt-1 text-sm text-slate-500">
            Entre para acessar o painel
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros; rota `/login` listada na saída.

- [ ] **Step 4: Commit**

```bash
git add src/components/LoginForm.tsx src/app/login/page.tsx
git commit -m "feat: componente LoginForm e pagina de login"
```

---

### Task 6: Casca do dashboard (Sidebar, Topbar, DashboardLayout) e logout

**Files:**
- Create: `src/app/logout/actions.ts`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/Topbar.tsx`
- Create: `src/components/DashboardLayout.tsx`
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient()` de `src/lib/supabase/server.ts`.
- Produces:
  - `signOut(): Promise<void>` — encerra a sessão e redireciona para `/login`.
  - `<Sidebar />`, `<Topbar userEmail={string} />`, `<DashboardLayout userEmail={string}>{children}</DashboardLayout>`.
  - Rota protegida `/dashboard`.

- [ ] **Step 1: Criar a Server Action de logout**

Create `src/app/logout/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Criar a Sidebar**

Create `src/components/Sidebar.tsx`:

```tsx
const NAV_ITEMS = ['Início', 'Contatos', 'Negócios', 'Configurações']

export function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <span className="text-xl font-bold text-indigo-600">CRM</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item, index) => (
          <span
            key={item}
            className={`cursor-default rounded-lg px-3 py-2 text-sm font-medium ${
              index === 0
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600'
            }`}
          >
            {item}
          </span>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Criar a Topbar (com botão Sair)**

Create `src/components/Topbar.tsx`:

```tsx
import { signOut } from '@/app/logout/actions'

export function Topbar({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <span className="text-sm text-slate-500">{userEmail}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Sair
        </button>
      </form>
    </header>
  )
}
```

- [ ] **Step 4: Criar o DashboardLayout**

Create `src/components/DashboardLayout.tsx`:

```tsx
import { type ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'

export function DashboardLayout({
  userEmail,
  children,
}: {
  userEmail: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Criar o layout do dashboard (busca o usuário logado)**

Create `src/app/dashboard/layout.tsx`:

```tsx
import { type ReactNode } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/server'

export default async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <DashboardLayout userEmail={user?.email ?? ''}>{children}</DashboardLayout>
  )
}
```

- [ ] **Step 6: Criar a página de boas-vindas do dashboard**

Create `src/app/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Bem-vindo! 👋</h1>
      <p className="mt-1 text-slate-500">
        Este é o seu painel. As telas do CRM chegam em breve.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-32 rounded-2xl border border-dashed border-slate-300 bg-white"
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros; rota `/dashboard` listada.

- [ ] **Step 8: Commit**

```bash
git add src/app/logout/actions.ts src/components/Sidebar.tsx src/components/Topbar.tsx src/components/DashboardLayout.tsx src/app/dashboard/layout.tsx src/app/dashboard/page.tsx
git commit -m "feat: casca do dashboard (sidebar, topbar, layout) e logout"
```

---

### Task 7: Redirecionamento da raiz

**Files:**
- Modify: `src/app/page.tsx` (substituir a home padrão do Next.js)

**Interfaces:**
- Consumes: nada.
- Produces: rota `/` que redireciona para `/dashboard` (o middleware então decide login vs dashboard conforme a sessão).

- [ ] **Step 1: Substituir a página raiz por um redirecionamento**

Replace `src/app/page.tsx` (conteúdo inteiro):

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 2: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redireciona a raiz para o dashboard"
```

---

### Task 8: Empacotamento Docker para o EasyPanel

**Files:**
- Modify: `next.config.ts` (adicionar `output: 'standalone'`)
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (definidas no painel do EasyPanel).
- Produces: imagem Docker que serve o app na porta `3000`.

- [ ] **Step 1: Ativar o modo standalone**

Modify `next.config.ts` — garantir que a config exporta `output: 'standalone'`. O arquivo deve ficar assim:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 2: Criar o `.dockerignore`**

Create `.dockerignore`:

```
node_modules
.next
.git
.env.local
npm-debug.log
docs
```

- [ ] **Step 3: Criar o `Dockerfile`**

Create `Dockerfile`:

```dockerfile
# ---- Dependências ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Verificar que o build local ainda funciona com standalone**

Run: `npm run build`
Expected: build conclui; a pasta `.next/standalone` é gerada.

- [ ] **Step 5: (Opcional, se o Docker estiver instalado) Testar a imagem localmente**

Run:
```bash
docker build -t crm-auth .
```
Expected: imagem construída sem erros. (Se o Docker não estiver disponível na máquina, pular — o EasyPanel fará o build no deploy.)

- [ ] **Step 6: Commit**

```bash
git add next.config.ts Dockerfile .dockerignore
git commit -m "chore: empacotamento Docker (standalone) para deploy no EasyPanel"
```

---

### Task 9: Criar usuário admin e verificação ponta a ponta

**Files:** nenhum (verificação manual + configuração de deploy).

**Interfaces:**
- Consumes: app completo das tasks anteriores.
- Produces: fluxo validado ponta a ponta (login → dashboard → logout) e app no ar no EasyPanel.

- [ ] **Step 1: Criar o primeiro usuário admin no Supabase**

No painel do Supabase → **Authentication → Users → Add user → Create new user**. Informar e-mail e senha e marcar **Auto Confirm User** (para não exigir confirmação por e-mail). Salvar.

- [ ] **Step 2: Rodar o app localmente**

Run: `npm run dev`
Expected: servidor sobe em `http://localhost:3000`.

- [ ] **Step 3: Verificação manual do fluxo (checklist)**

Abrir `http://localhost:3000` e confirmar:
- [ ] Acessar `/` redireciona para `/login` (pois não há sessão).
- [ ] Acessar `/dashboard` direto (sem login) redireciona para `/login`.
- [ ] Login com credenciais **erradas** mostra "E-mail ou senha inválidos".
- [ ] Enviar formulário com campos **vazios** mostra "Preencha e-mail e senha".
- [ ] Login com as credenciais do admin criado leva ao `/dashboard`.
- [ ] O dashboard mostra sidebar, o e-mail do usuário na topbar e a mensagem de boas-vindas.
- [ ] Tentar acessar `/login` já logado redireciona para `/dashboard`.
- [ ] Clicar em **Sair** encerra a sessão e volta para `/login`.

- [ ] **Step 4: Deploy no EasyPanel**

No EasyPanel: criar um novo serviço do tipo **App**, apontando para o repositório Git. Definir as variáveis de ambiente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

O EasyPanel detecta o `Dockerfile` e faz o build. Configurar a porta `3000` e o domínio. Fazer o deploy.

- [ ] **Step 5: Verificação em produção**

Abrir o domínio do EasyPanel e repetir o checklist do Step 3 no ambiente publicado.

- [ ] **Step 6: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "docs: verificacao ponta a ponta e notas de deploy"
```

---

## Notas finais

- Não há testes automatizados de UI/integração neste plano — o fluxo de auth depende do Supabase e do navegador, então é verificado manualmente (Task 9). A lógica pura testável (`validateCredentials`) é coberta por Vitest (Task 4).
- O `DashboardLayout` é o ponto de reaproveitamento para as futuras telas do CRM: novas rotas dentro de `/dashboard` herdam automaticamente sidebar + topbar via `src/app/dashboard/layout.tsx`.
