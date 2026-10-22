"use server"

import { createClient } from "@/utils/supabase/server"
import { vatRateFromPrices, WAREHOUSE_TARGET, type InvoiceVehicleOption, type ManualInvoiceInput } from "@/lib/manual-invoice"

// Pełna faktura ręczna do formularza edycji: wszystkie pozycje z ich celem (auto albo magazyn),
// a nie tylko te widoczne na karcie jednego auta. Do tego auta, na których te pozycje leżą
// (także nieaktywne), żeby select pokazał rejestrację, a nie „auto spoza listy”. Czyta kluczem użytkownika (RLS).
export async function getManualInvoice(orderId: string): Promise<{ invoice?: ManualInvoiceInput; vehicles?: InvoiceVehicleOption[]; error?: string }> {
    try {
        const supabase = await createClient()

        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("id, order_date, description, fiscal_document_number, is_manual")
            .eq("id", orderId)
            .single()

        if (orderError || !order) {
            return { error: "Nie znaleziono faktury." }
        }
        if (!order.is_manual) {
            return { error: "To nie jest faktura ręczna." }
        }

        const { data: items, error: itemsError } = await supabase
            .from("order_items")
            .select("id, name, sku, required_quantity, unit_price_net, unit_price_gross, total_net, total_gross, vehicle_id, is_warehouse, vehicles(id, plate_number, is_active)")
            .eq("order_id", orderId)
            .order("created_at")
            .order("id")

        if (itemsError) {
            return { error: `Nie udało się wczytać pozycji: ${itemsError.message}` }
        }

        const vehicles = new Map<string, InvoiceVehicleOption>()
        for (const item of items || []) {
            const v = Array.isArray(item.vehicles) ? item.vehicles[0] : item.vehicles
            if (v?.id && !vehicles.has(v.id)) vehicles.set(v.id, { id: v.id, plate_number: v.plate_number, is_active: v.is_active !== false })
        }

        return {
            invoice: {
                orderDate: order.order_date ? String(order.order_date).split("T")[0] : "",
                supplier: order.description || "",
                invoiceNumber: order.fiscal_document_number || "",
                items: (items || []).map(item => ({
                    name: item.name || "",
                    sku: item.sku || "",
                    quantity: item.required_quantity || 1,
                    unitPriceNet: Number(item.unit_price_net) || 0,
                    vatRate: vatRateFromPrices(item.unit_price_net, item.unit_price_gross, item.total_net, item.total_gross),
                    target: item.is_warehouse ? WAREHOUSE_TARGET : (item.vehicle_id || ""),
                })),
            },
            vehicles: Array.from(vehicles.values()),
        }
    } catch (e) {
        console.error("Unhandled error in getManualInvoice:", e)
        return { error: `Błąd krytyczny serwera: ${e instanceof Error ? e.message : String(e)}` }
    }
}
