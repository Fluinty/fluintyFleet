"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatCurrency, formatDate } from "@/utils/format"
import { useToast } from "@/components/ui/use-toast"
import { Package, Calendar, ShoppingCart, Pencil, Trash2, Loader2 } from "lucide-react"
import { deleteManualInvoice } from "@/app/actions/delete-manual-invoice"
import { getManualInvoice } from "@/app/actions/get-manual-invoice"
import { EditInvoiceModal } from "./EditInvoiceModal"
import type { InvoiceVehicleOption, ManualInvoiceInput } from "@/lib/manual-invoice"

interface OrderInfo {
    id: string
    order_date: string
    intercars_id: string | null
    is_manual?: boolean
    fiscal_document_number?: string | null
    description?: string | null
    total_net?: number | null
    total_gross?: number | null
}

interface Item {
    id: string
    name: string | null
    sku: string | null
    required_quantity: number | null
    total_gross: number | null
    unit_price_net?: number | null
    orders: OrderInfo | OrderInfo[]
}

interface VehicleItemsHistoryProps {
    items: Item[]
    vehicleId?: string
    vehiclePlate?: string
    vehicles?: InvoiceVehicleOption[]
    isAdmin?: boolean
}

export function VehicleItemsHistory({ items, vehicleId, vehiclePlate, vehicles = [], isAdmin }: VehicleItemsHistoryProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
    const editRequestRef = useRef<string | null>(null)   // ostatnio kliknięta faktura; starsze odpowiedzi ignorujemy
    const [editingOrder, setEditingOrder] = useState<{ orderId: string; data: ManualInvoiceInput; vehicles: InvoiceVehicleOption[] } | null>(null)

    // Helper to get order info from the nested relation
    const getOrderInfo = (item: Item): OrderInfo | null => {
        if (Array.isArray(item.orders)) {
            return item.orders[0] || null
        }
        return item.orders
    }

    // Check if an order is manual
    const isManualOrder = (order: OrderInfo | null): boolean => {
        return order?.is_manual === true
    }

    // Get display label for order number
    const getOrderLabel = (order: OrderInfo | null): string => {
        if (!order) return "-"
        if (order.is_manual && order.fiscal_document_number) {
            return order.fiscal_document_number
        }
        return order.intercars_id || "-"
    }

    const handleDelete = async () => {
        if (!deleteOrderId || !vehicleId) return
        setDeleting(true)

        try {
            const result = await deleteManualInvoice(deleteOrderId, vehicleId)
            if (result.error) {
                toast({ title: "Błąd", description: result.error, variant: "destructive" })
            } else {
                toast({ title: "Sukces", description: "Faktura została usunięta." })
                router.refresh()
            }
        } catch {
            toast({ title: "Błąd", description: "Wystąpił nieoczekiwany błąd.", variant: "destructive" })
        } finally {
            setDeleting(false)
            setDeleteOrderId(null)
        }
    }

    // Do edycji bierzemy całą fakturę z bazy, nie tylko pozycje tego auta: od 22.10.2026 jedna faktura
    // może mieć pozycje dla kilku aut i magazynu, a zapis edycji wymienia komplet pozycji.
    // Wczytanie trwa chwilę; w tym czasie wszystkie „Edytuj” są wyłączone, a gdyby mimo to przyszła
    // odpowiedź na wcześniejsze kliknięcie, nie otwieramy z nią formularza (zapis poszedłby pod zły orderId).
    const handleEditClick = async (order: OrderInfo) => {
        if (loadingEditId) return
        editRequestRef.current = order.id
        setLoadingEditId(order.id)
        try {
            const result = await getManualInvoice(order.id)
            if (editRequestRef.current !== order.id) return
            if (result.error || !result.invoice) {
                toast({ title: "Błąd", description: result.error || "Nie udało się wczytać faktury.", variant: "destructive" })
                return
            }
            // Auta z faktury (także nieaktywne) dołączamy do listy, żeby select pokazał ich rejestracje
            const known = new Set(vehicles.map(v => v.id))
            const extra = (result.vehicles || []).filter(v => !known.has(v.id))
            setEditingOrder({ orderId: order.id, data: result.invoice, vehicles: [...vehicles, ...extra] })
        } catch {
            toast({ title: "Błąd", description: "Wystąpił nieoczekiwany błąd.", variant: "destructive" })
        } finally {
            if (editRequestRef.current === order.id) setLoadingEditId(null)
        }
    }

    // Mobile Card View
    const MobileCards = () => (
        <div className="space-y-3 md:hidden">
            {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    Brak przypisanych części.
                </div>
            ) : (
                items.map((item) => {
                    const order = getOrderInfo(item)
                    const isManual = isManualOrder(order)
                    return (
                        <div
                            key={item.id}
                            className="rounded-xl bg-white/80 border border-white/50 shadow-sm p-4"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800 line-clamp-2">
                                            {item.name || "Bez nazwy"}
                                        </p>
                                        {item.sku && (
                                            <p className="text-xs text-slate-500">{item.sku}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-emerald-600">
                                        {formatCurrency(item.total_gross || 0)}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {item.required_quantity}x
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {order && (
                                    <>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(order.order_date)}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isManual ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                                            <ShoppingCart className="h-3 w-3" />
                                            {isManual ? '📝 ' : '#'}{getOrderLabel(order)}
                                        </span>
                                    </>
                                )}
                            </div>
                            {isAdmin && isManual && order && (
                                <div className="flex gap-2 mt-3 pt-3 border-t">
                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(order)} disabled={!!loadingEditId} className="text-xs">
                                        {loadingEditId === order.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Pencil className="h-3 w-3 mr-1" />} Edytuj
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setDeleteOrderId(order.id)} className="text-xs text-red-600 hover:text-red-700">
                                        <Trash2 className="h-3 w-3 mr-1" /> Usuń
                                    </Button>
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
                        <TableHead>Data</TableHead>
                        <TableHead>Nr Zamówienia / Faktury</TableHead>
                        <TableHead>Nazwa części</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Ilość</TableHead>
                        <TableHead className="text-right">Wartość</TableHead>
                        {isAdmin && <TableHead className="text-right">Akcje</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={isAdmin ? 7 : 6} className="text-center h-24 text-muted-foreground">
                                Brak przypisanych części.
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => {
                            const order = getOrderInfo(item)
                            const isManual = isManualOrder(order)
                            return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        {order ? formatDate(order.order_date) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {isManual && (
                                            <span className="inline-block mr-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                                                Manualna
                                            </span>
                                        )}
                                        {getOrderLabel(order)}
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={item.name || ""}>
                                        {item.name || "-"}
                                    </TableCell>
                                    <TableCell className="text-slate-500">{item.sku || "-"}</TableCell>
                                    <TableCell className="text-right">{item.required_quantity || 0}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(item.total_gross || 0)}
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell className="text-right">
                                            {isManual && order && (
                                                <div className="flex gap-1 justify-end">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(order)} disabled={!!loadingEditId} className="h-7 w-7 p-0">
                                                        {loadingEditId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> : <Pencil className="h-3.5 w-3.5 text-amber-600" />}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleteOrderId(order.id)} className="h-7 w-7 p-0">
                                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć fakturę?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ta operacja jest nieodwracalna. Faktura i wszystkie jej pozycje zostaną trwale usunięte, także te przypisane do innych aut i do magazynu.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Usuń
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Invoice Modal */}
            {editingOrder && vehicleId && (
                <EditInvoiceModal
                    orderId={editingOrder.orderId}
                    vehicleId={vehicleId}
                    vehiclePlate={vehiclePlate || "to auto"}
                    vehicles={editingOrder.vehicles}
                    open={!!editingOrder}
                    onOpenChange={(open) => !open && setEditingOrder(null)}
                    initialData={editingOrder.data}
                />
            )}
        </>
    )
}
