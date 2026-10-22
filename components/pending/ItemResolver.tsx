"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { resolvePendingItem, resolvePendingItemToWarehouse, resolvePendingOrderItems, resolvePendingOrderItemsToWarehouse } from "@/app/actions/resolve-pending-item"
import { pluralPl } from "@/utils/format"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Car, Package, Warehouse } from "lucide-react"
import { isWarehouseEligible, WAREHOUSE_LABEL } from "@/lib/warehouse"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface VehicleOption {
    id: string
    plate_number: string
}

interface PendingItem {
    id: string
    name: string | null
    sku: string | null
    total_gross: number | null
}

interface ItemResolverProps {
    itemId: string
    orderId: string
    itemName?: string | null
    allItems?: PendingItem[]
    vehicles: VehicleOption[]
    fullWidth?: boolean
    currentPlate?: string | null  // If provided, shows edit mode
    isWarehouse?: boolean         // If true, the item currently sits on the warehouse (edit mode)
}

export function ItemResolver({
    itemId,
    orderId,
    itemName,
    allItems = [],
    vehicles,
    fullWidth = false,
    currentPlate = null,
    isWarehouse = false
}: ItemResolverProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [plate, setPlate] = useState(currentPlate || "")
    const [applyToAll, setApplyToAll] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const { toast } = useToast()

    const hasMultipleItems = allItems.length > 1
    const isEditMode = !!currentPlate || isWarehouse
    // Na magazyn idą tylko produkty z listy w lib/warehouse.ts (olej silnikowy, AdBlue, opony)
    const warehouseEligible = isWarehouseEligible(itemName)
    const eligibleInOrder = allItems.filter(i => isWarehouseEligible(i.name)).length
    const currentLabel = isWarehouse ? WAREHOUSE_LABEL : currentPlate

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            let result

            if (applyToAll && hasMultipleItems) {
                // Resolve all items in the order
                result = await resolvePendingOrderItems(orderId, plate)
            } else {
                // Resolve just this item
                result = await resolvePendingItem(itemId, plate)
            }

            if (result.error) {
                setError(result.error)
            } else {
                setOpen(false)
                setPlate("")
                setApplyToAll(false)
                toast({
                    title: "Sukces",
                    description: isEditMode
                        ? "Przypisanie pojazdu zostało zmienione."
                        : applyToAll && hasMultipleItems
                            ? `Przypisano ${allItems.length} pozycji do pojazdu.`
                            : "Pozycja została przypisana do pojazdu.",
                })
                // Refresh page to re-fetch data and remove resolved item from list
                router.refresh()
            }
        } catch {
            setError("Wystąpił nieoczekiwany błąd.")
        } finally {
            setLoading(false)
        }
    }

    const handleWarehouse = async () => {
        setLoading(true)
        setError("")
        try {
            const bulk = applyToAll && hasMultipleItems
            const result = bulk
                ? await resolvePendingOrderItemsToWarehouse(orderId)
                : await resolvePendingItemToWarehouse(itemId)
            if ("error" in result && result.error) {
                setError(result.error)
            } else {
                setOpen(false)
                setPlate("")
                setApplyToAll(false)
                const warning = "warning" in result ? result.warning : undefined
                const updated = "updated" in result ? result.updated : 0
                const skipped = "skipped" in result ? result.skipped : 0
                const bulkText = `Przypisano na magazyn ${updated} ${pluralPl(updated, ['pozycję', 'pozycje', 'pozycji'])}`
                    + (skipped > 0 ? `, ${skipped} ${pluralPl(skipped, ['pozycja została', 'pozycje zostały', 'pozycji zostało'])} w kolejce (nie z listy magazynowej).` : '.')
                toast({
                    title: warning ? "Uwaga" : "Sukces",
                    description: warning
                        ? warning
                        : bulk
                            ? bulkText
                            : isEditMode
                                ? "Pozycja została przeniesiona na magazyn."
                                : "Pozycja została przypisana na magazyn.",
                    variant: warning ? "destructive" : undefined,
                })
                router.refresh()
            }
        } catch {
            setError("Wystąpił nieoczekiwany błąd.")
        } finally {
            setLoading(false)
        }
    }

    // Pojedyncza pozycja: przycisk tylko dla produktów z listy magazynowej.
    // "Zastosuj do wszystkich": przycisk dla całego zamówienia, gdy choć jedna otwarta pozycja się kwalifikuje.
    const bulkMode = applyToAll && hasMultipleItems
    const showWarehouseButton = !isWarehouse && (bulkMode ? eligibleInOrder > 0 : warehouseEligible)
    const warehouseButton = showWarehouseButton ? (
        <Button type="button" variant="outline" disabled={loading} onClick={handleWarehouse}>
            <Warehouse className="h-4 w-4 mr-1" />
            {bulkMode
                ? `Na magazyn (${eligibleInOrder} z ${allItems.length})`
                : isEditMode ? "Przenieś na magazyn" : "Na magazyn"}
        </Button>
    ) : null

    // Edit mode: show assigned plate (or warehouse) as clickable badge
    if (isEditMode && !fullWidth) {
        return (
            <Dialog open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen)
                if (isOpen) setPlate(currentPlate || "")
            }}>
                <DialogTrigger asChild>
                    <button
                        className={isWarehouse
                            ? "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-200 transition-colors cursor-pointer"
                            : "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors cursor-pointer"}
                        title="Kliknij, aby zmienić przypisanie"
                    >
                        {isWarehouse ? <Warehouse className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                        {currentLabel}
                    </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-teal-500" />
                            Zmień przypisanie pojazdu
                        </DialogTitle>
                        <DialogDescription>
                            {itemName ? (
                                <span>Aktualnie: <strong>{currentLabel}</strong> dla pozycji: <strong>{itemName}</strong></span>
                            ) : (
                                <span>Aktualnie przypisany: <strong>{currentLabel}</strong></span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plate" className="text-right">
                                    Pojazd
                                </Label>
                                <div className="col-span-3">
                                    <Select value={plate} onValueChange={setPlate}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Wybierz pojazd..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.map((v) => (
                                                <SelectItem key={v.id} value={v.plate_number}>
                                                    {v.plate_number}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {hasMultipleItems && (
                                <div className="flex items-center space-x-2 px-4 py-3 bg-teal-50 rounded-lg border border-teal-100">
                                    <Checkbox
                                        id="applyToAll"
                                        checked={applyToAll}
                                        onCheckedChange={(checked) => setApplyToAll(checked === true)}
                                    />
                                    <label
                                        htmlFor="applyToAll"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Zastosuj do wszystkich {allItems.length} pozycji w zamówieniu
                                    </label>
                                </div>
                            )}

                            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                        </div>
                        <DialogFooter>
                            {warehouseButton}
                            <Button type="submit" disabled={loading || !plate || plate === currentPlate}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {applyToAll && hasMultipleItems ? "Zmień wszystkie" : "Zmień przypisanie"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={fullWidth ? "default" : "outline"}
                    size={fullWidth ? "default" : "sm"}
                    className={fullWidth ? "w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold shadow-md" : ""}
                >
                    <Car className="h-4 w-4 mr-1" />
                    {fullWidth ? "Przypisz pojazd" : "Przypisz"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-teal-500" />
                        Przypisz pojazd do pozycji
                    </DialogTitle>
                    <DialogDescription>
                        {itemName ? (
                            <span>Przypisz pojazd dla: <strong>{itemName}</strong></span>
                        ) : (
                            "Wybierz pojazd z listy, aby przypisać pozycję."
                        )}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="plate" className="text-right">
                                Pojazd
                            </Label>
                            <div className="col-span-3">
                                <Select value={plate} onValueChange={setPlate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wybierz pojazd..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map((v) => (
                                            <SelectItem key={v.id} value={v.plate_number}>
                                                {v.plate_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {hasMultipleItems && (
                            <div className="flex items-center space-x-2 px-4 py-3 bg-teal-50 rounded-lg border border-teal-100">
                                <Checkbox
                                    id="applyToAll"
                                    checked={applyToAll}
                                    onCheckedChange={(checked) => setApplyToAll(checked === true)}
                                />
                                <label
                                    htmlFor="applyToAll"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Zastosuj do wszystkich {allItems.length} pozycji w zamówieniu
                                </label>
                            </div>
                        )}

                        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    </div>
                    <DialogFooter>
                        {warehouseButton}
                        <Button type="submit" disabled={loading || !plate}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {applyToAll && hasMultipleItems ? "Przypisz wszystkie" : "Przypisz"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
