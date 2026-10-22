"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate, pluralPl } from "@/utils/format"
import { ItemResolver } from "./ItemResolver"
import { AlertCircle, Calendar, Receipt, Package, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface PendingItem {
    item_id: string
    item_name: string | null
    sku: string | null
    item_total: number | null
    order_id: string
    intercars_id: string
    order_date: string
    order_total: number | null
    raw_comment: string | null
    branch_code: string | null
}

interface VehicleOption {
    id: string
    plate_number: string
}

// Group items by order
function groupItemsByOrder(items: PendingItem[]) {
    const grouped = new Map<string, { order: Pick<PendingItem, 'order_id' | 'intercars_id' | 'order_date' | 'order_total' | 'raw_comment' | 'branch_code'>, items: PendingItem[] }>()

    for (const item of items) {
        const existing = grouped.get(item.order_id)
        if (existing) {
            existing.items.push(item)
        } else {
            grouped.set(item.order_id, {
                order: {
                    order_id: item.order_id,
                    intercars_id: item.intercars_id,
                    order_date: item.order_date,
                    order_total: item.order_total,
                    raw_comment: item.raw_comment,
                    branch_code: item.branch_code,
                },
                items: [item]
            })
        }
    }

    return Array.from(grouped.values())
}

function OrderItemsGroup({
    order,
    items,
    vehicles
}: {
    order: Pick<PendingItem, 'order_id' | 'intercars_id' | 'order_date' | 'order_total' | 'raw_comment' | 'branch_code'>
    items: PendingItem[]
    vehicles: VehicleOption[]
}) {
    const [expanded, setExpanded] = useState(items.length <= 3)

    return (
        <div className="rounded-xl bg-gradient-to-br from-white/90 to-teal-50/50 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
            {/* Order Header */}
            <div className="p-4 border-b border-teal-100/50 bg-gradient-to-r from-teal-50/50 to-transparent">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4 text-teal-500" />
                            <span className="font-medium">{formatDate(order.order_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">{order.intercars_id}</span>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            {items.length} {pluralPl(items.length, ['pozycja', 'pozycje', 'pozycji'])} do przypisania
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-emerald-600">{formatCurrency(order.order_total)}</span>
                        {items.length > 1 && (
                            <ItemResolver
                                itemId={items[0].item_id}
                                orderId={order.order_id}
                                allItems={items.map(i => ({ id: i.item_id, name: i.item_name, sku: i.sku, total_gross: i.item_total }))}
                                vehicles={vehicles}
                            />
                        )}
                    </div>
                </div>
                {order.raw_comment && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg p-2 line-clamp-2">
                        {order.raw_comment}
                    </p>
                )}
            </div>

            {/* Items List */}
            <div className="divide-y divide-teal-100/30">
                {(expanded ? items : items.slice(0, 2)).map((item) => (
                    <div key={item.item_id} className="p-3 flex items-center justify-between gap-3 hover:bg-teal-50/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Package className="h-4 w-4 text-teal-400 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                    {item.item_name || 'Brak nazwy'}
                                </p>
                                {item.sku && (
                                    <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Brak pojazdu
                            </span>
                            <span className="text-sm font-semibold text-slate-600">
                                {formatCurrency(item.item_total)}
                            </span>
                            <ItemResolver
                                itemId={item.item_id}
                                orderId={order.order_id}
                                itemName={item.item_name}
                                allItems={items.map(i => ({ id: i.item_id, name: i.item_name, sku: i.sku, total_gross: i.item_total }))}
                                vehicles={vehicles}
                            />
                        </div>
                    </div>
                ))}

                {items.length > 2 && !expanded && (
                    <Button
                        variant="ghost"
                        className="w-full py-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        onClick={() => setExpanded(true)}
                    >
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Pokaż pozostałe {items.length - 2} pozycji
                    </Button>
                )}

                {items.length > 3 && expanded && (
                    <Button
                        variant="ghost"
                        className="w-full py-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        onClick={() => setExpanded(false)}
                    >
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Zwiń
                    </Button>
                )}
            </div>
        </div>
    )
}

export function PendingItemsTable({ items, vehicles }: { items: PendingItem[], vehicles: VehicleOption[] }) {
    if (items.length === 0) {
        return (
            <div className="rounded-xl md:rounded-2xl bg-gradient-to-br from-white/80 to-teal-50/50 backdrop-blur-xl border border-white/50 shadow-lg p-8 text-center">
                <p className="text-slate-500">Brak pozycji wymagających weryfikacji.</p>
            </div>
        )
    }

    const groupedOrders = groupItemsByOrder(items)

    return (
        <div className="space-y-4">
            {/* Mobile & Tablet: Card Layout */}
            <div className="lg:hidden space-y-4">
                {groupedOrders.map(({ order, items: orderItems }) => (
                    <OrderItemsGroup
                        key={order.order_id}
                        order={order}
                        items={orderItems}
                        vehicles={vehicles}
                    />
                ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block rounded-xl md:rounded-2xl bg-gradient-to-br from-white/80 to-teal-50/50 backdrop-blur-xl border border-white/50 shadow-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Nr Zamówienia</TableHead>
                            <TableHead>Pozycja</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Kwota</TableHead>
                            <TableHead className="text-right">Akcje</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.item_id}>
                                <TableCell className="font-medium">{formatDate(item.order_date)}</TableCell>
                                <TableCell>{item.intercars_id}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={item.item_name || ""}>
                                    {item.item_name || "-"}
                                </TableCell>
                                <TableCell className="text-slate-500">{item.sku || "-"}</TableCell>
                                <TableCell>
                                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                        Brak pojazdu
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(item.item_total)}</TableCell>
                                <TableCell className="text-right">
                                    <ItemResolver
                                        itemId={item.item_id}
                                        orderId={item.order_id}
                                        itemName={item.item_name}
                                        allItems={items
                                            .filter(i => i.order_id === item.order_id)
                                            .map(i => ({ id: i.item_id, name: i.item_name, sku: i.sku, total_gross: i.item_total }))}
                                        vehicles={vehicles}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
