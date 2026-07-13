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
