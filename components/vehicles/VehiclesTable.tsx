"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/utils/format"
import { differenceInDays, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Car, Calendar, Shield, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface Vehicle {
    id: string
    plate_number: string
    brand: string | null
    model: string | null
    production_year: number | null
    branch_id?: string | null
    next_inspection_date: string | null
    next_insurance_date: string | null
    is_active: boolean | null
    is_leasing?: boolean | null
    financing_type?: string | null
    leasing_end_date?: string | null
    vehicle_category?: string | null
    is_subcontractor?: boolean | null
    branches?: { name: string } | { name: string }[] | null
}

export function VehiclesTable({
    vehicles,
    emptyMessage = "Brak pojazdów spełniających kryteria.",
}: {
    vehicles: Vehicle[]
    emptyMessage?: string
}) {
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
            params.set("dir", "asc")
        }
        router.push(`?${params.toString()}`)
    }

    const getExpiryColor = (dateStr: string | null) => {
        if (!dateStr) return ""
        const days = differenceInDays(parseISO(dateStr), new Date())
        if (days < 0) return "bg-red-100 text-red-700 border-red-200"
        if (days < 30) return "bg-orange-100 text-orange-700 border-orange-200"
        if (days < 60) return "bg-yellow-100 text-yellow-700 border-yellow-200"
        return "text-gray-600"
    }

    const getExpiryBadgeColor = (dateStr: string | null) => {
        if (!dateStr) return "bg-gray-100 text-gray-500"
        const days = differenceInDays(parseISO(dateStr), new Date())
        if (days < 0) return "bg-red-100 text-red-700"
        if (days < 30) return "bg-orange-100 text-orange-700"
        if (days < 60) return "bg-yellow-100 text-yellow-700"
        return "bg-green-100 text-green-700"
    }

    // Mobile Card View
    const MobileCards = () => (
        <div className="space-y-3 md:hidden">
            {vehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    {emptyMessage}
                </div>
            ) : (
                vehicles.map((vehicle) => {
                    const branchName = Array.isArray(vehicle.branches)
                        ? vehicle.branches[0]?.name
                        : vehicle.branches?.name

                    return (
                        <Link
                            key={vehicle.id}
                            href={`/vehicles/${vehicle.id}`}
                            className={cn(
                                "block p-4 rounded-xl bg-white/80 border border-white/50 shadow-sm hover:shadow-md transition-all",
                                !vehicle.is_active && "opacity-60"
                            )}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                        <Car className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{vehicle.plate_number}</p>
                                        <p className="text-sm text-slate-500">
                                            {vehicle.brand} {vehicle.model}
                                            {vehicle.production_year && ` (${vehicle.production_year})`}
                                        </p>
                                        {vehicle.vehicle_category === 'truck' && (
                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700 w-fit">
                                                Ciężarówka
                                            </span>
                                        )}
                                        {vehicle.vehicle_category === 'car' && (
                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 w-fit">
                                                Osobówka
                                            </span>
                                        )}
                                        {vehicle.is_subcontractor && (
                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-700 w-fit">
                                                Podwykonawca
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400" />
                            </div>

                            {branchName && (
                                <div className="mb-3">
                                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                        {branchName}
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs",
                                    getExpiryBadgeColor(vehicle.next_inspection_date)
                                )}>
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Przegląd: {formatDate(vehicle.next_inspection_date)}</span>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs",
                                    getExpiryBadgeColor(vehicle.next_insurance_date)
                                )}>
                                    <Shield className="h-3.5 w-3.5" />
                                    <span>OC: {formatDate(vehicle.next_insurance_date)}</span>
                                </div>
                            </div>
                            {(vehicle.financing_type === 'leasing' || vehicle.financing_type === 'rental') && (
                                <div className={cn(
                                    "mt-2 text-xs border px-2 py-1.5 rounded-lg inline-flex items-center gap-1.5",
                                    vehicle.financing_type === 'leasing'
                                        ? "text-blue-700 bg-blue-50 border-blue-100"
                                        : "text-purple-700 bg-purple-50 border-purple-100"
                                )}>
                                    <span className="font-medium">
                                        {vehicle.financing_type === 'leasing' ? 'Leasing' : 'Wynajem'}
                                    </span>
                                    {vehicle.leasing_end_date && (
                                        <span className="opacity-80">
                                            do {formatDate(vehicle.leasing_end_date)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Link>
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
                        <TableHead className="w-[100px]">
                            <Button variant="ghost" onClick={() => handleSort('plate_number')} className="-ml-4 h-8">
                                Nr Rej. <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>Marka</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Rocznik</TableHead>
                        <TableHead>Oddział</TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => handleSort('next_inspection_date')} className="-ml-4 h-8">
                                Przegląd <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => handleSort('next_insurance_date')} className="-ml-4 h-8">
                                Ubezpieczenie <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => handleSort('financing_type')} className="-ml-4 h-8">
                                Finansowanie <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {vehicles.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center h-24 text-gray-500">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        vehicles.map((vehicle) => {
                            const branchName = Array.isArray(vehicle.branches)
                                ? vehicle.branches[0]?.name
                                : vehicle.branches?.name

                            return (
                                <TableRow key={vehicle.id} className={cn(!vehicle.is_active && "text-gray-500 bg-gray-50")}>
                                    <TableCell className="font-medium">{vehicle.plate_number}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            {vehicle.brand}
                                            {vehicle.vehicle_category === 'truck' && (
                                                <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700">
                                                    Ciężarówka
                                                </span>
                                            )}
                                            {vehicle.vehicle_category === 'car' && (
                                                <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600">
                                                    Osobówka
                                                </span>
                                            )}
                                            {vehicle.is_subcontractor && (
                                                <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-700">
                                                    Podwykonawca
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{vehicle.model}</TableCell>
                                    <TableCell>{vehicle.production_year}</TableCell>
                                    <TableCell>{branchName}</TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-transparent",
                                            getExpiryColor(vehicle.next_inspection_date)
                                        )}>
                                            {formatDate(vehicle.next_inspection_date)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-transparent",
                                            getExpiryColor(vehicle.next_insurance_date)
                                        )}>
                                            {formatDate(vehicle.next_insurance_date)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {vehicle.financing_type === 'leasing' || vehicle.financing_type === 'rental' ? (
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "font-medium",
                                                    vehicle.financing_type === 'leasing' ? "text-blue-700" : "text-purple-700"
                                                )}>
                                                    {vehicle.financing_type === 'leasing' ? 'Leasing' : 'Wynajem'}
                                                </span>
                                                {vehicle.leasing_end_date && (
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        do {formatDate(vehicle.leasing_end_date)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Nie</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/vehicles/${vehicle.id}`}>Szczegóły</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
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
