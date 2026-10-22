import { TrendingUp, TrendingDown, ShoppingCart, Car, Clock, Warehouse } from "lucide-react"
import { formatCurrency, pluralPl } from "@/utils/format"

interface StatsSummaryCardsProps {
    totalPurchases: number      // nagłówki zamówień z miesiąca = karta „Zakupy (ten miesiąc)” na dashboardzie
    totalOrders: number
    momChange: number | null    // zmiana zakupów razem wobec poprzedniego miesiąca
    assignedTotal: number       // pozycje przypisane do aut
    vehiclesWithOrders: number
    avgPerVehicle: number
    queueTotal: number          // pozycje bez auta, czekające na weryfikację
    queueItems: number
    queueOrders: number
    warehouseTotal: number      // pozycje odłożone na magazyn
    warehouseItems: number
    headerVsItems: number       // nagłówki − (auta + kolejka + magazyn); normalnie 0
}

export function StatsSummaryCards({
    totalPurchases,
    totalOrders,
    momChange,
    assignedTotal,
    vehiclesWithOrders,
    avgPerVehicle,
    queueTotal,
    queueItems,
    queueOrders,
    warehouseTotal,
    warehouseItems,
    headerVsItems,
}: StatsSummaryCardsProps) {
    const momLabel = momChange !== null
        ? `${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}% m/m`
        : 'brak poprzedniego miesiąca'
    const MomIcon = momChange !== null && momChange < 0 ? TrendingDown : TrendingUp

    const cards = [
        {
            title: "Zakupy razem",
            value: formatCurrency(totalPurchases),
            subtitle: `${totalOrders} ${pluralPl(totalOrders, ['zamówienie', 'zamówienia', 'zamówień'])} · ${momLabel}`,
            icon: MomIcon,
            gradient: "from-emerald-500 to-teal-500",
            bgGradient: "from-emerald-50 to-teal-50",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            highlight: false,
        },
        {
            title: "Przypisane do aut",
            value: formatCurrency(assignedTotal),
            subtitle: `${vehiclesWithOrders} ${pluralPl(vehiclesWithOrders, ['pojazd', 'pojazdy', 'pojazdów'])} · śr. ${formatCurrency(avgPerVehicle)}`,
            icon: Car,
            gradient: "from-blue-500 to-cyan-500",
            bgGradient: "from-blue-50 to-cyan-50",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            highlight: false,
        },
        {
            title: "W kolejce do weryfikacji",
            value: formatCurrency(queueTotal),
            subtitle: queueItems > 0
                ? `${queueItems} ${pluralPl(queueItems, ['pozycja', 'pozycje', 'pozycji'])} w ${queueOrders} ${pluralPl(queueOrders, ['zamówieniu', 'zamówieniach', 'zamówieniach'])}`
                : 'wszystko przypisane',
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
            bgGradient: "from-amber-50 to-orange-50",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            highlight: queueTotal > 0,
        },
        {
            title: "Magazyn",
            value: formatCurrency(warehouseTotal),
            subtitle: warehouseItems > 0
                ? `${warehouseItems} ${pluralPl(warehouseItems, ['pozycja', 'pozycje', 'pozycji'])}`
                : 'brak pozycji magazynowych',
            icon: Warehouse,
            gradient: "from-indigo-500 to-violet-500",
            bgGradient: "from-indigo-50 to-violet-50",
            iconBg: "bg-indigo-100",
            iconColor: "text-indigo-600",
            highlight: false,
        },
    ]

    return (
        <div className="space-y-2">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {cards.map((card, index) => (
                    <div
                        key={card.title}
                        className={`
                            relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-6
                            bg-gradient-to-br ${card.bgGradient}
                            border border-white/50 backdrop-blur-sm
                            shadow-lg shadow-slate-200/50
                            transition-all duration-300
                            hover:shadow-xl hover:-translate-y-1
                            animate-fade-in
                            ${card.highlight ? 'ring-2 ring-offset-2 ring-amber-200' : ''}
                        `}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Background Decoration */}
                        <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-20 blur-2xl`} />

                        <div className="relative flex items-start justify-between">
                            <div className="space-y-1 min-w-0">
                                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                                <p className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                                    {card.value}
                                </p>
                                <p className="text-xs text-slate-500">{card.subtitle}</p>
                            </div>
                            <div className={`${card.iconBg} p-3 rounded-xl shrink-0`}>
                                <card.icon className={`h-5 w-5 md:h-6 md:w-6 ${card.iconColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-slate-500 px-1">
                Zakupy razem = przypisane do aut + w kolejce + magazyn. Ta sama liczba, co „Zakupy (ten miesiąc)” na dashboardzie.
                {Math.abs(headerVsItems) >= 0.01 && (
                    <span className="text-amber-700"> Uwaga: nagłówki zamówień różnią się od sumy pozycji o {formatCurrency(headerVsItems)}.</span>
                )}
            </p>
        </div>
    )
}
