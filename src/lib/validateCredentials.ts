export function validateCredentials(
  email: string,
  password: string,
): string | null {
  if (!email.trim() || !password) {
    return 'Preencha e-mail e senha'
  }
  return null
}
