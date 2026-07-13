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
