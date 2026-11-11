import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/utils/format"
import { BranchSelect } from "./BranchSelect"
import { DocumentPreviewButton } from "./DocumentPreviewButton"
import { FinancingSection } from "./FinancingSection"
import { VehicleFlagSelect } from "./VehicleFlagSelect"

interface VehicleInfoProps {
    vehicle: any // Typed lazily for speed, ideally proper Supabase type
    branchName?: string
    availableBranches: { id: string; name: string }[]
    // false: auto lotniskowe spoza oddziałów kierownika (wejście z zakładki „Lotnisko”), karta tylko do odczytu
    canEdit: boolean
    // „Auto podwykonawcy” zmienia tylko admin: takie auto wypada z przypomnień o terminach
    isAdmin: boolean
}

// Komórka dokumentu: podgląd przez panel (widzi go każdy, kto widzi auto) albo „BRAK”
function DocumentCell({ vehicleId, url, kind, title }: { vehicleId: string; url: string | null; kind: "dowod" | "polisa"; title: string }) {
    if (!url) return <p className="font-medium text-muted-foreground">BRAK</p>
    return <DocumentPreviewButton src={`/api/vehicles/${vehicleId}/document?kind=${kind}`} title={title} />
}

export function VehicleInfo({ vehicle, branchName, availableBranches, canEdit, isAdmin }: VehicleInfoProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Szczegóły Pojazdu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Oddział</p>
                        {canEdit ? (
                            <BranchSelect
                                vehicleId={vehicle.id}
                                currentBranchId={vehicle.branch_id}
                                availableBranches={availableBranches}
                            />
                        ) : (
                            <p className="font-medium">{branchName || "-"}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium">{vehicle.is_active ? "Aktywny" : "Nieaktywny"}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Rocznik</p>
                        <p className="font-medium">{vehicle.production_year || "-"}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Pojemność</p>
                        <p className="font-medium">{vehicle.engine_capacity} cm³</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Ubezpieczenie</p>
                        <p className="font-medium">{formatDate(vehicle.next_insurance_date)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Polisa</p>
                        <DocumentCell
                            vehicleId={vehicle.id}
                            url={vehicle.insurance_document_url}
                            kind="polisa"
                            title={`Polisa ubezpieczeniowa — ${vehicle.plate_number}`}
                        />
                    </div>
                    <div>
                        <p className="text-muted-foreground">Przegląd</p>
                        <p className="font-medium">{formatDate(vehicle.next_inspection_date)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Dokument przeglądu</p>
                        <DocumentCell
                            vehicleId={vehicle.id}
                            url={vehicle.inspection_document_url}
                            kind="dowod"
                            title={`Dokument przeglądu — ${vehicle.plate_number}`}
                        />
                    </div>
                    <FinancingSection
                        vehicleId={vehicle.id}
                        financingType={vehicle.financing_type || "none"}
                        company={vehicle.leasing_company}
                        startDate={vehicle.financing_start_date}
                        endDate={vehicle.leasing_end_date}
                        readOnly={!canEdit}
                    />
                    <div>
                        <p className="text-muted-foreground">Lotnisko</p>
                        {canEdit ? (
                            <VehicleFlagSelect
                                vehicleId={vehicle.id}
                                flag="airport"
                                initialValue={vehicle.is_airport}
                            />
                        ) : (
                            <p className="font-medium">{vehicle.is_airport ? "Tak" : "Nie"}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-muted-foreground">Auto podwykonawcy</p>
                        {isAdmin ? (
                            <VehicleFlagSelect
                                vehicleId={vehicle.id}
                                flag="subcontractor"
                                initialValue={vehicle.is_subcontractor}
                            />
                        ) : (
                            <p className="font-medium">{vehicle.is_subcontractor ? "Tak" : "Nie"}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
