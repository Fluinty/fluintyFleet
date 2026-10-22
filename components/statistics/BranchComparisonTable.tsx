import { formatCurrency } from "@/utils/format"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface BranchStats {
    branch_code: string
    branch_name: string
    orders: number
    vehicles: number
    purchases: number   // nagłówki zamówień
    assigned: number    // pozycje przypisane do aut
    queue: number       // pozycje w kolejce do weryfikacji
    warehouse: number   // pozycje na magazynie
}

interface BranchComparisonTableProps {
    data: BranchStats[]
}

export function BranchComparisonTable({ data }: BranchComparisonTableProps) {
    if (data.length === 0) {
        return (
            <div className="rounded-xl md:rounded-2xl bg-white/80 border border-slate-200/60 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Porównanie Oddziałów</h3>
                <div className="h-[150px] flex items-center justify-center text-slate-500">
                    Brak danych dla wybranego okresu
                </div>
            </div>
        )
    }

    // Calculate totals
    const totals = data.reduce((acc, row) => ({
        orders: acc.orders + row.orders,
        vehicles: acc.vehicles + row.vehicles,
        purchases: acc.purchases + row.purchases,
        assigned: acc.assigned + row.assigned,
        queue: acc.queue + row.queue,
        warehouse: acc.warehouse + row.warehouse,
    }), { orders: 0, vehicles: 0, purchases: 0, assigned: 0, queue: 0, warehouse: 0 })

    return (
        <div className="rounded-xl md:rounded-2xl bg-white/80 border border-slate-200/60 p-6 shadow-lg overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Porównanie Oddziałów</h3>
            <p className="text-xs text-slate-500 mb-4">Oddział z nagłówka zamówienia. Zakupy = przypisane + w kolejce + magazyn.</p>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-200">
                            <TableHead className="text-slate-600">Oddział</TableHead>
                            <TableHead className="text-right text-slate-600">Zamówienia</TableHead>
                            <TableHead className="text-right text-slate-600">Pojazdy</TableHead>
                            <TableHead className="text-right text-slate-600">Zakupy</TableHead>
                            <TableHead className="text-right text-slate-600">Przypisane</TableHead>
                            <TableHead className="text-right text-slate-600">W kolejce</TableHead>
                            <TableHead className="text-right text-slate-600">Magazyn</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.branch_code} className="border-slate-100 hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-800">
                                    {row.branch_name}
                                    <span className="ml-2 text-xs text-slate-400">({row.branch_code})</span>
                                </TableCell>
                                <TableCell className="text-right text-slate-600">{row.orders}</TableCell>
                                <TableCell className="text-right text-slate-600">{row.vehicles}</TableCell>
                                <TableCell className="text-right font-medium text-slate-800">
                                    {formatCurrency(row.purchases)}
                                </TableCell>
                                <TableCell className="text-right text-emerald-600">
                                    {formatCurrency(row.assigned)}
                                </TableCell>
                                <TableCell className={`text-right ${row.queue > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
                                    {formatCurrency(row.queue)}
                                </TableCell>
                                <TableCell className={`text-right ${row.warehouse > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {formatCurrency(row.warehouse)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="border-t-2 border-slate-200 bg-slate-50/50 font-semibold">
                            <TableCell className="text-slate-800">Łącznie</TableCell>
                            <TableCell className="text-right text-slate-700">{totals.orders}</TableCell>
                            <TableCell className="text-right text-slate-700">{totals.vehicles}</TableCell>
                            <TableCell className="text-right text-slate-800">{formatCurrency(totals.purchases)}</TableCell>
                            <TableCell className="text-right text-emerald-700">{formatCurrency(totals.assigned)}</TableCell>
                            <TableCell className="text-right text-amber-700">{formatCurrency(totals.queue)}</TableCell>
                            <TableCell className="text-right text-indigo-700">{formatCurrency(totals.warehouse)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
