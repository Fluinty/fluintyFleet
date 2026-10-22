"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/utils/format"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface VehicleSpending {
    vehicle_id: string
    plate_number: string
    branch_name: string | null
    branch_code: string | null
    brand: string | null
    model: string | null
    production_year: number | null
    month: string
    order_count: number
    item_count: number
    total_spent: number
}

export function SpendingTable({ items }: { items: VehicleSpending[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleSort = (field: string) => {
        const params = new URLSearchParams(searchParams)
        const currentSort = params.get("sort")
        const currentDir = params.get("dir")

        if (currentSort === field) {
            params.set("dir", currentDir === "asc" ? "desc" : "asc")
        } else {
            params.set("sort", field)
            params.set("dir", "desc") // Default to desc for spending
        }
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="rounded-md border bg-card text-card-foreground">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <Button variant="ghost" onClick={() => handleSort('plate_number')} className="-ml-4 h-8">
                                Nr Rej. <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>Marka / Model</TableHead>
                        <TableHead>Oddział</TableHead>
                        <TableHead className="text-right">
                            <Button variant="ghost" onClick={() => handleSort('order_count')} className="-ml-4 h-8">
                                Zamówienia <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">
                            <Button variant="ghost" onClick={() => handleSort('total_spent')} className="-ml-4 h-8">
                                Łączny Koszt <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                Brak danych o wydatkach dla wybranych kryteriów.
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => (
                            <TableRow key={item.vehicle_id}>
                                <TableCell className="font-medium">{item.plate_number}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{item.brand} {item.model}</span>
                                        <span className="text-xs text-muted-foreground">{item.production_year}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{item.branch_name || item.branch_code || "-"}</TableCell>
                                <TableCell className="text-right">{item.order_count}</TableCell>
                                <TableCell className="text-right font-bold">
                                    {formatCurrency(item.total_spent)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/vehicles/${item.vehicle_id}`}>Szczegóły</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
