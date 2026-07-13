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
