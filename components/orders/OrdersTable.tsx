"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ArrowUpDown, ShoppingCart, Calendar, CheckCircle2, Clock, Ban } from "lucide-react"
import { useState, Fragment } from "react"
import { cn } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"
import { ItemResolver } from "@/components/pending/ItemResolver"

interface VehicleOption {
    id: string
    plate_number: string
}

interface OrderItem {
    id: string
    name: string | null
    sku: string | null
    required_quantity: number | null
    total_net: number | null
    vehicle_id: string | null
    is_warehouse?: boolean | null
    vehicles?: { id: string; plate_number: string } | null
}

interface Order {
    id: string
    order_date: string
    intercars_id: string | null
    total_gross: number
    status: string
    description: string | null
    branch_code: string | null
    branches?: { name: string } | { name: string }[] | null
    order_items?: OrderItem[]
}

// Status zamówienia: completed = wszystkie pozycje rozliczone, pending = coś czeka w kolejce,
// void = nieaktualne (InterCars wydał zamówienie pod nowym numerem albo je anulował; nie liczy się nigdzie)
function StatusBadge({ status }: { status: string }) {
    if (status === 'completed') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                Przypisane
            </span>
        )
    }
    if (status === 'void') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold" title="InterCars nie zwraca już tego numeru: wydane pod nowym numerem albo anulowane">
                <Ban className="h-3 w-3" />
                Nieaktualne
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
            <Clock className="h-3 w-3" />
            Do przypisania
        </span>
    )
}

export function OrdersTable({ orders, vehicles }: { orders: Order[]; vehicles: VehicleOption[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    const handleSort = (field: string) => {
        const params = new URLSearchParams(searchParams)
        const currentSort = params.get("sort")
        const currentDir = params.get("dir")

        if (currentSort === field) {
            params.set("dir", currentDir === "asc" ? "desc" : "asc")
        } else {
            params.set("sort", field)
            params.set("dir", "desc")
        }
        router.push(`?${params.toString()}`)
    }

    // Mobile Card View
    const MobileCards = () => (
        <div className="space-y-3 md:hidden">
            {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    Brak zamówień spełniających kryteria.
                </div>
            ) : (
                orders.map((order) => {
                    const branchName = Array.isArray(order.branches)
                        ? order.branches[0]?.name
                        : order.branches?.name || order.branch_code
                    const isExpanded = expandedRows.has(order.id)

                    return (
                        <div
                            key={order.id}
                            className="rounded-xl bg-white/80 border border-white/50 shadow-sm overflow-hidden"
                        >
                            <button
                                onClick={() => toggleRow(order.id)}
                                className="w-full p-4 text-left hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                            <ShoppingCart className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg text-emerald-600">
                                                {formatCurrency(order.total_gross)}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(order.order_date)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={order.status} />
                                        {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {branchName && (
                                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                                            {branchName}
                                        </span>
                                    )}
                                    {order.intercars_id && (
                                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 text-xs">
                                            #{order.intercars_id}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {isExpanded && order.order_items && order.order_items.length > 0 && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                                    <p className="text-xs font-semibold text-slate-500 mb-2">Pozycje zamówienia:</p>
                                    <div className="space-y-3">
                                        {order.order_items.map((item) => (
                                            <div key={item.id} className="bg-white rounded-lg p-3 border border-slate-200">
                                                <div className="flex justify-between text-sm mb-2">
                                                    <div className="flex-1 pr-2">
                                                        <p className="font-medium text-slate-700 truncate">{item.name}</p>
                                                        {item.sku && <p className="text-xs text-slate-400">{item.sku}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">{item.required_quantity}x</p>
                                                        <p className="text-xs text-slate-500">{formatCurrency(item.total_net || 0)}</p>
                                                    </div>
                                                </div>
                                                {/* Vehicle assignment section */}
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                    <ItemResolver
                                                        itemId={item.id}
                                                        orderId={order.id}
                                                        itemName={item.name}
                                                        allItems={order.order_items?.filter(i => !i.is_warehouse).map(i => ({ id: i.id, name: i.name, sku: i.sku, total_gross: i.total_net, assigned: !!i.vehicle_id })) || []}
                                                        vehicles={vehicles}
                                                        currentPlate={item.vehicles?.plate_number} isWarehouse={!!item.is_warehouse}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })
            )}
        </div>
    )

    // Desktop Table View
    const DesktopTable = () => (
        <div className="hidden md:block rounded-md border bg-card text-card-foreground">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead></TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => handleSort('order_date')} className="-ml-4 h-8">
                                Data <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>Nr Zamówienia</TableHead>
                        <TableHead>Oddział</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">
                            <Button variant="ghost" onClick={() => handleSort('total_gross')} className="-ml-4 h-8">
                                Kwota <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                Brak zamówień spełniających kryteria.
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => {
                            const branchName = Array.isArray(order.branches)
                                ? order.branches[0]?.name
                                : order.branches?.name || order.branch_code
                            const isExpanded = expandedRows.has(order.id)

                            return (
                                <Fragment key={order.id}>
                                    <TableRow className={cn("cursor-pointer hover:bg-muted/50", isExpanded && "bg-muted/50")} onClick={() => toggleRow(order.id)}>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="font-medium">{formatDate(order.order_date)}</TableCell>
                                        <TableCell>{order.intercars_id || "-"}</TableCell>
                                        <TableCell>{branchName || "-"}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={order.description || ""}>{order.description || "-"}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={order.status} />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(order.total_gross)}</TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="p-0 bg-muted/30">
                                                <div className="p-4">
                                                    <h4 className="font-semibold mb-2 text-sm">Pozycje zamówienia:</h4>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Nazwa</TableHead>
                                                                <TableHead>SKU</TableHead>
                                                                <TableHead className="text-right">Ilość</TableHead>
                                                                <TableHead className="text-right">Wartość Netto</TableHead>
                                                                <TableHead>Pojazd</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {order.order_items && order.order_items.length > 0 ? (
                                                                order.order_items.map((item) => (
                                                                    <TableRow key={item.id}>
                                                                        <TableCell>{item.name}</TableCell>
                                                                        <TableCell>{item.sku}</TableCell>
                                                                        <TableCell className="text-right">{item.required_quantity}</TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(item.total_net || 0)}</TableCell>
                                                                        <TableCell>
                                                                            <ItemResolver
                                                                                itemId={item.id}
                                                                                orderId={order.id}
                                                                                itemName={item.name}
                                                                                allItems={order.order_items?.filter(i => !i.is_warehouse).map(i => ({ id: i.id, name: i.name, sku: i.sku, total_gross: i.total_net, assigned: !!i.vehicle_id })) || []}
                                                                                vehicles={vehicles}
                                                                                currentPlate={item.vehicles?.plate_number} isWarehouse={!!item.is_warehouse}
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">Brak pozycji</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )

    return (
        <>
            <MobileCards />
            <DesktopTable />
        </>
    )
}
