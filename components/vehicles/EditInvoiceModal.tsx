"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2, FileText } from "lucide-react"
import { editManualInvoice } from "@/app/actions/edit-manual-invoice"
import { InvoiceTargetSelect, type InvoiceVehicleOption } from "./InvoiceTargetSelect"
import { describeInvoiceSummary, isWarehouseTarget, VAT_RATE_OPTIONS, WAREHOUSE_TARGET, type ManualInvoiceInput } from "@/lib/manual-invoice"
import { isWarehouseEligible, WAREHOUSE_PRODUCTS_LABEL } from "@/lib/warehouse"

type InvoiceFormData = ManualInvoiceInput

interface EditInvoiceModalProps {
    orderId: string
    vehicleId: string
    vehiclePlate: string
    vehicles: InvoiceVehicleOption[]
    open: boolean
    onOpenChange: (open: boolean) => void
    // Komplet pozycji faktury z ich celami (getManualInvoice), nie tylko pozycje tego auta
    initialData: ManualInvoiceInput
}

export function EditInvoiceModal({ orderId, vehicleId, vehiclePlate, vehicles, open, onOpenChange, initialData }: EditInvoiceModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<InvoiceFormData>({
        defaultValues: initialData,
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    })

    const watchItems = watch("items")

    const calculateItemTotals = (index: number) => {
        const item = watchItems[index]
        if (!item) return { unitGross: 0, totalNet: 0, totalGross: 0 }

        const unitGross = item.unitPriceNet * (1 + item.vatRate / 100)
        const totalNet = item.unitPriceNet * item.quantity
        const totalGross = unitGross * item.quantity

        return {
            unitGross: Math.round(unitGross * 100) / 100,
            totalNet: Math.round(totalNet * 100) / 100,
            totalGross: Math.round(totalGross * 100) / 100,
        }
    }

    const calculateInvoiceTotals = () => {
        let totalNet = 0
        let totalGross = 0

        watchItems.forEach((_item: unknown, index: number) => {
            const totals = calculateItemTotals(index)
            totalNet += totals.totalNet
            totalGross += totals.totalGross
        })

        return {
            totalNet: Math.round(totalNet * 100) / 100,
            totalGross: Math.round(totalGross * 100) / 100,
        }
    }

    const invoiceTotals = calculateInvoiceTotals()

    const onSubmit = async (data: InvoiceFormData) => {
        const badWarehouse = data.items.find(i => isWarehouseTarget(i.target) && !isWarehouseEligible(i.name))
        if (badWarehouse) {
            toast({
                title: "Pozycja nie może iść na magazyn",
                description: `„${badWarehouse.name}”: na magazyn idą tylko ${WAREHOUSE_PRODUCTS_LABEL}. Wybierz auto albo popraw nazwę.`,
                variant: "destructive",
            })
            return
        }
        setLoading(true)

        try {
            const result = await editManualInvoice(orderId, vehicleId, data)

            if (result.error) {
                toast({
                    title: "Błąd",
                    description: result.error,
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "Faktura zaktualizowana",
                    description: result.summary ? describeInvoiceSummary(result.summary, vehiclePlate) : "Faktura została zaktualizowana.",
                })
                onOpenChange(false)
                router.refresh()
            }
        } catch {
            toast({
                title: "Błąd",
                description: "Wystąpił nieoczekiwany błąd.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-amber-500" />
                        Edytuj fakturę - {initialData.invoiceNumber}
                    </DialogTitle>
                    <DialogDescription>
                        To wszystkie pozycje tej faktury, także te z innych aut i z magazynu. Po zapisie faktura będzie wyglądać dokładnie tak jak tutaj.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Invoice Header */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold">Nagłówek faktury</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="orderDate">Data *</Label>
                                <Input
                                    id="orderDate"
                                    type="date"
                                    {...register("orderDate", { required: true })}
                                />
                                {errors.orderDate && (
                                    <span className="text-xs text-red-500">Pole wymagane</span>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="supplier">Dostawca *</Label>
                                <Input
                                    id="supplier"
                                    {...register("supplier", { required: true })}
                                    placeholder="Nazwa dostawcy"
                                />
                                {errors.supplier && (
                                    <span className="text-xs text-red-500">Pole wymagane</span>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="invoiceNumber">Numer faktury *</Label>
                                <Input
                                    id="invoiceNumber"
                                    {...register("invoiceNumber", { required: true })}
                                    placeholder="np. FV/2025/03/001"
                                />
                                {errors.invoiceNumber && (
                                    <span className="text-xs text-red-500">Pole wymagane</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Pozycje faktury</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    append({
                                        name: "",
                                        sku: "",
                                        quantity: 1,
                                        unitPriceNet: 0,
                                        vatRate: 23,
                                        target: vehicleId,
                                    })
                                }
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                Dodaj pozycję
                            </Button>
                        </div>

                        {fields.map((field: { id: string }, index: number) => {
                            const totals = calculateItemTotals(index)
                            return (
                                <div key={field.id} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                                <div className="grid grid-cols-12 gap-2 items-start">
                                    <div className="col-span-3">
                                        <Label className="text-xs">Nazwa *</Label>
                                        <Input
                                            {...register(`items.${index}.name`, { required: true })}
                                            placeholder="Nazwa części"
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Label className="text-xs">SKU</Label>
                                        <Input
                                            {...register(`items.${index}.sku`)}
                                            placeholder="Opcjonalnie"
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Label className="text-xs">Ilość *</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            step="1"
                                            {...register(`items.${index}.quantity`, {
                                                required: true,
                                                valueAsNumber: true,
                                                min: 1,
                                            })}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Netto/szt *</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            {...register(`items.${index}.unitPriceNet`, {
                                                required: true,
                                                valueAsNumber: true,
                                                min: 0,
                                            })}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">VAT *</Label>
                                        <Select
                                            value={watchItems[index]?.vatRate?.toString() || "23"}
                                            onValueChange={(value) =>
                                                setValue(`items.${index}.vatRate`, Number(value))
                                            }
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VAT_RATE_OPTIONS.map((rate) => (
                                                    <SelectItem key={rate.value} value={rate.value.toString()}>
                                                        {rate.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Suma brutto</Label>
                                        <Input
                                            value={totals.totalGross.toFixed(2)}
                                            disabled
                                            className="h-8 bg-gray-200"
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1}
                                            className="h-8"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-start">
                                    <div className="col-span-5">
                                        <Label className="text-xs">Przypisz do *</Label>
                                        <InvoiceTargetSelect
                                            value={watchItems[index]?.target || ""}
                                            onChange={(value) => setValue(`items.${index}.target`, value, { shouldDirty: true })}
                                            itemName={watchItems[index]?.name}
                                            vehicles={vehicles}
                                            currentVehicleId={vehicleId}
                                            currentVehiclePlate={vehiclePlate}
                                        />
                                    </div>
                                    {watchItems[index]?.target === WAREHOUSE_TARGET && (
                                        <p className="col-span-7 self-end pb-2 text-xs text-indigo-700">
                                            Pozycja trafi na magazyn i nie obciąży żadnego auta.
                                        </p>
                                    )}
                                </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Invoice Summary */}
                    <div className="border-t pt-4 space-y-2">
                        <h3 className="font-semibold">Podsumowanie</h3>
                        <div className="flex justify-end space-x-8 text-sm">
                            <div>
                                <span className="text-muted-foreground">Suma netto:</span>
                                <span className="ml-2 font-semibold">
                                    {invoiceTotals.totalNet.toFixed(2)} PLN
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Suma brutto:</span>
                                <span className="ml-2 font-semibold text-lg">
                                    {invoiceTotals.totalGross.toFixed(2)} PLN
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Anuluj
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Zapisz zmiany
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
