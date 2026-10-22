"use client"

import { Warehouse, Car } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { isWarehouseEligible, WAREHOUSE_PRODUCTS_LABEL } from "@/lib/warehouse"
import { WAREHOUSE_TARGET, type InvoiceVehicleOption } from "@/lib/manual-invoice"

export type { InvoiceVehicleOption }

interface InvoiceTargetSelectProps {
    value: string
    onChange: (value: string) => void
    itemName: string | null | undefined
    vehicles: InvoiceVehicleOption[]
    /** auto, z którego otwarto formularz: zawsze na liście, pierwsze, z dopiskiem „(to auto)” */
    currentVehicleId: string
    currentVehiclePlate: string
}

// Dokąd trafia jedna pozycja faktury: to auto, inne auto z listy albo magazyn. „Magazyn” da się wybrać
// tylko dla nazw z listy Artura (lib/warehouse.ts); gdy nazwa się zmieni i przestanie pasować, pokazujemy
// ostrzeżenie, a serwer i tak odrzuci zapis. Auto nieaktywne, na którym pozycja już leży, zostaje na
// liście z dopiskiem, żeby dało się je rozpoznać i do niego wrócić.
export function InvoiceTargetSelect({ value, onChange, itemName, vehicles, currentVehicleId, currentVehiclePlate }: InvoiceTargetSelectProps) {
    const eligible = isWarehouseEligible(itemName)
    const others = vehicles.filter(v => v.id !== currentVehicleId)
    const warehouseChosenButIneligible = value === WAREHOUSE_TARGET && !eligible
    // Auto, którego nie ma na liście (np. skasowane): pokazujemy, żeby pole nie wyglądało na puste
    const unknownVehicle = !!value && value !== WAREHOUSE_TARGET && value !== currentVehicleId && !vehicles.some(v => v.id === value)

    return (
        <div className="space-y-1">
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className={`h-8 ${value === WAREHOUSE_TARGET ? "border-indigo-300 bg-indigo-50" : ""}`}>
                    <SelectValue placeholder="Wybierz auto albo magazyn" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={WAREHOUSE_TARGET} disabled={!eligible}>
                        <span className="inline-flex items-center gap-1.5">
                            <Warehouse className="h-3.5 w-3.5 text-indigo-600" />
                            Magazyn{!eligible && <span className="text-xs text-muted-foreground">(tylko: {WAREHOUSE_PRODUCTS_LABEL})</span>}
                        </span>
                    </SelectItem>
                    <SelectItem value={currentVehicleId}>
                        <span className="inline-flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-teal-600" />
                            {currentVehiclePlate} <span className="text-xs text-muted-foreground">(to auto)</span>
                        </span>
                    </SelectItem>
                    {unknownVehicle && (
                        <SelectItem value={value}>
                            <span className="inline-flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 text-slate-500" />
                                Auto spoza listy
                            </span>
                        </SelectItem>
                    )}
                    {others.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                            <span className="inline-flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 text-slate-500" />
                                {v.plate_number}{v.is_active === false && <span className="text-xs text-muted-foreground">(nieaktywne)</span>}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {warehouseChosenButIneligible && (
                <p className="text-xs text-red-600">Tej nazwy nie ma na liście magazynowej ({WAREHOUSE_PRODUCTS_LABEL}). Wybierz auto albo popraw nazwę.</p>
            )}
        </div>
    )
}
