import { StatCard } from '@/components/StatCard'
import { RecentDeals, type RecentDeal } from '@/components/RecentDeals'
import { createClient } from '@/lib/supabase/server'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const integer = new Intl.NumberFormat('pt-BR')

// Primeiro dia do mês atual, em ISO, para filtrar "Ganhos no Mês".
function startOfMonthISO() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

async function getMetrics() {
  const supabase = await createClient()
  const monthStart = startOfMonthISO()

  const [
    clientsCount,
    openDeals,
    wonThisMonth,
    wonTotal,
    lostTotal,
    recentDealsRes,
  ] = await Promise.all([
    // Total de Clientes
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    // Deals em Aberto (nem "won" nem "lost")
    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("won","lost")'),
    // Ganhos no Mês: soma de value dos "won" criados neste mês
    supabase
      .from('deals')
      .select('value')
      .eq('status', 'won')
      .gte('created_at', monthStart),
    // Deals ganhos (total) — para taxa de conversão
    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'won'),
    // Deals perdidos (total) — para taxa de conversão
    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'lost'),
    // Deals Recentes (últimos 5)
    supabase
      .from('deals')
      .select('id, title, value, status, created_at, clients(name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalClients = clientsCount.count ?? 0
  const openDealsCount = openDeals.count ?? 0

  const wonThisMonthTotal = (wonThisMonth.data ?? []).reduce(
    (sum, deal) => sum + Number(deal.value ?? 0),
    0,
  )

  const won = wonTotal.count ?? 0
  const lost = lostTotal.count ?? 0
  const finalized = won + lost
  const conversionRate = finalized > 0 ? (won / finalized) * 100 : 0

  const recentDeals: RecentDeal[] = (recentDealsRes.data ?? []).map(
    (deal) => {
      // PostgREST retorna a relação "clients" como objeto (1:N) ou array,
      // dependendo da inferência — normalizamos para pegar o nome.
      const client = Array.isArray(deal.clients)
        ? deal.clients[0]
        : deal.clients
      return {
        id: deal.id as string,
        title: deal.title as string,
        value: Number(deal.value ?? 0),
        status: deal.status as string,
        clientName: (client as { name: string } | null)?.name ?? null,
        createdAt: deal.created_at as string,
      }
    },
  )

  return {
    totalClients,
    openDealsCount,
    wonThisMonthTotal,
    conversionRate,
    recentDeals,
  }
}

export default async function DashboardPage() {
  const {
    totalClients,
    openDealsCount,
    wonThisMonthTotal,
    conversionRate,
    recentDeals,
  } = await getMetrics()

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Clientes"
          value={integer.format(totalClients)}
          subtitle="Clientes cadastrados"
          icon={<UsersIcon />}
        />
        <StatCard
          title="Deals em Aberto"
          value={integer.format(openDealsCount)}
          subtitle="Negócios em andamento"
          icon={<BriefcaseIcon />}
        />
        <StatCard
          title="Ganhos no Mês"
          value={brl.format(wonThisMonthTotal)}
          subtitle="Receita fechada no mês"
          icon={<TrendingUpIcon />}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${conversionRate.toFixed(1)}%`}
          subtitle="Ganhos sobre finalizados"
          icon={<TargetIcon />}
        />
      </div>

      <div className="mt-6">
        <RecentDeals deals={recentDeals} />
      </div>
    </div>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
