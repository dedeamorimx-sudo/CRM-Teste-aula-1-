const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const STATUS_LABELS: Record<string, string> = {
  open: 'Em aberto',
  won: 'Ganho',
  lost: 'Perdido',
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  won: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-rose-50 text-rose-700',
}

export type RecentDeal = {
  id: string
  title: string
  value: number
  status: string
  clientName: string | null
  createdAt: string
}

export function RecentDeals({ deals }: { deals: RecentDeal[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Deals Recentes</h2>

      {deals.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">Nenhum deal ainda.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {deals.map((deal) => (
            <li
              key={deal.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {deal.title}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {deal.clientName ?? 'Sem cliente'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-900">
                  {currency.format(deal.value)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[deal.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {STATUS_LABELS[deal.status] ?? deal.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
