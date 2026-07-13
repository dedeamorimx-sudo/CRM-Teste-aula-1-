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
