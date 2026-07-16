import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}))

const { updateSession } = await import('@/lib/supabase/middleware')

function request(path: string) {
  return new NextRequest(new URL(`http://localhost:3000${path}`))
}

function asLoggedIn() {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
}

function asAnonymous() {
  getUser.mockResolvedValue({ data: { user: null } })
}

describe('updateSession', () => {
  beforeEach(() => {
    getUser.mockReset()
  })

  it('redireciona visitante anônimo de /dashboard para /login', async () => {
    asAnonymous()
    const res = await updateSession(request('/dashboard'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })

  it('redireciona visitante anônimo de subrotas de /dashboard para /login', async () => {
    asAnonymous()
    const res = await updateSession(request('/dashboard/clientes'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })

  it('deixa visitante anônimo acessar /login', async () => {
    asAnonymous()
    const res = await updateSession(request('/login'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('redireciona usuário logado de /login para /dashboard', async () => {
    asLoggedIn()
    const res = await updateSession(request('/login'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard')
  })

  it('deixa usuário logado acessar /dashboard', async () => {
    asLoggedIn()
    const res = await updateSession(request('/dashboard'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('preserva a query string ao mandar visitante anônimo para /login', async () => {
    asAnonymous()
    const res = await updateSession(request('/dashboard?aba=deals'))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('aba')).toBe('deals')
  })
})
