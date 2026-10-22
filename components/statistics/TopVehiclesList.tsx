import Link from "next/link"
import { formatCurrency, pluralPl } from "@/utils/format"
import { ExternalLink } from "lucide-react"

interface TopVehicle {
    id: string
    plate_number: string
    brand: string | null
    model: string | null
    spending: number
    order_count: number
}

interface TopVehiclesListProps {
    vehicles: TopVehicle[]
}

export function TopVehiclesList({ vehicles }: TopVehiclesListProps) {
    if (vehicles.length === 0) {
        return (
            <div className="rounded-xl md:rounded-2xl bg-white/80 border border-slate-200/60 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Pojazdów</h3>
                <div className="h-[200px] flex items-center justify-center text-slate-500">
                    Brak danych dla wybranego okresu
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-xl md:rounded-2xl bg-white/80 border border-slate-200/60 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Pojazdów</h3>
            <div className="space-y-3">
                {vehicles.map((vehicle, index) => (
                    <Link
                        key={vehicle.id}
                        href={`/vehicles/${vehicle.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100 transition-colors group"
                    >
                        {/* Rank Badge */}
                        <div className={`
                            h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm
                            ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                index === 1 ? 'bg-slate-200 text-slate-600' :
                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-100 text-slate-500'}
                        `}>
                            #{index + 1}
                        </div>

                        {/* Vehicle Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">
                                    {vehicle.plate_number}
                                </span>
                                <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                                {vehicle.brand} {vehicle.model}
                                <span className="mx-2">•</span>
                                {vehicle.order_count} {pluralPl(vehicle.order_count, ['zamówienie', 'zamówienia', 'zamówień'])}
                            </p>
                        </div>

                        {/* Spending */}
                        <div className="text-right">
                            <p className="font-semibold text-emerald-600">
                                {formatCurrency(vehicle.spending)}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
