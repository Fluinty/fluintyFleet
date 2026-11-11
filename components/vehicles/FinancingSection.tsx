"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { updateVehicleFinancing } from "@/app/actions/update-financing"
import { Pencil, Check, X, Loader2 } from "lucide-react"

interface FinancingSectionProps {
    vehicleId: string
    financingType: string
    company: string | null
    startDate: string | null
    endDate: string | null
    // true: karta tylko do odczytu (auto lotniskowe spoza oddziałów kierownika)
    readOnly?: boolean
}

const FINANCING_LABELS: Record<string, string> = {
    none: "Brak",
    leasing: "Leasing",
    rental: "Wynajem",
}

export function FinancingSection({
    vehicleId,
    financingType: initialType,
    company: initialCompany,
    startDate: initialStartDate,
    endDate: initialEndDate,
    readOnly = false,
}: FinancingSectionProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [editing, setEditing] = useState(false)
    const [isPending, startTransition] = useTransition()

    const [type, setType] = useState(initialType || "none")
    const [company, setCompany] = useState(initialCompany || "")
    const [startDate, setStartDate] = useState(initialStartDate || "")
    const [endDate, setEndDate] = useState(initialEndDate || "")

    const isFinanced = type !== "none"

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateVehicleFinancing(vehicleId, {
                financingType: type as "none" | "leasing" | "rental",
                company: company || null,
                startDate: startDate || null,
                endDate: endDate || null,
            })

            if (result.error) {
                toast({ title: "Błąd", description: result.error, variant: "destructive" })
            } else {
                toast({ title: "Zapisano", description: "Dane finansowania zaktualizowane." })
                setEditing(false)
                router.refresh()
            }
        })
    }

    const handleCancel = () => {
        setType(initialType || "none")
        setCompany(initialCompany || "")
        setStartDate(initialStartDate || "")
        setEndDate(initialEndDate || "")
        setEditing(false)
    }

    // Read-only view
    if (!editing) {
        return (
            <div className="col-span-2 border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">Finansowanie</p>
                    {!readOnly && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(true)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edytuj
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Typ</p>
                        <p className="font-medium">{FINANCING_LABELS[initialType] || "Brak"}</p>
                    </div>
                    {initialType !== "none" && (
                        <>
                            <div>
                                <p className="text-muted-foreground">Finansujący</p>
                                <p className="font-medium">{initialCompany || "-"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Okres umowy</p>
                                <p className="font-medium">
                                    {initialStartDate
                                        ? new Date(initialStartDate).toLocaleDateString("pl-PL")
                                        : "-"}
                                    {" → "}
                                    {initialEndDate
                                        ? new Date(initialEndDate).toLocaleDateString("pl-PL")
                                        : "-"}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    }

    // Edit view
    return (
        <div className="col-span-2 border-t pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Finansowanie</p>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSave}
                        disabled={isPending}
                        className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                    >
                        {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Check className="h-3 w-3 mr-1" />
                        )}
                        Zapisz
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isPending}
                        className="h-7 px-2 text-xs text-muted-foreground"
                    >
                        <X className="h-3 w-3 mr-1" />
                        Anuluj
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground mb-1">Typ</p>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Brak</SelectItem>
                            <SelectItem value="leasing">Leasing</SelectItem>
                            <SelectItem value="rental">Wynajem</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {isFinanced && (
                    <>
                        <div>
                            <p className="text-muted-foreground mb-1">Finansujący</p>
                            <Input
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="Nazwa firmy"
                                className="h-8"
                            />
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-1">Umowa od</p>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-1">Umowa do</p>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-8"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
