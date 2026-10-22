"use server"

import { createServiceClient } from "@/utils/supabase/service"
import { revalidatePath } from "next/cache"
import { calculateInvoiceItem, invoiceTotalError, isWarehouseTarget, itemError, summarizeTargets, targetError, type ManualInvoiceInput } from "@/lib/manual-invoice"

// Edycja faktury ręcznej. Formularz dostaje WSZYSTKIE pozycje faktury (getManualInvoice), nie tylko te
// z karty auta, z której go otwarto: pozycje innych aut i magazynu nie mogą zniknąć przy zapisie.
// Zapis wymienia komplet pozycji, każda ze swoim celem. PostgREST nie daje transakcji, więc kolejność
// jest taka, żeby błąd w połowie nie zostawił faktury bez pozycji: najpierw sprawdzamy wszystko,
// potem WSTAWIAMY nowe pozycje, potem kasujemy stare po id (gdy to padnie, kasujemy świeżo wstawione),
// a nagłówek z sumami aktualizujemy na końcu.
export async function editManualInvoice(orderId: string, vehicleId: string, data: ManualInvoiceInput) {
    try {
        const supabase = createServiceClient()

        // 1. Faktura musi istnieć i być ręczna
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("id, is_manual")
            .eq("id", orderId)
            .single()

        if (orderError || !order) {
            return { error: "Nie znaleziono faktury." }
        }

        if (!order.is_manual) {
            return { error: "Nie można edytować faktury z InterCars. Tylko manualne faktury mogą być edytowane." }
        }

        if (!data.items || data.items.length === 0) {
            return { error: "Faktura musi zawierać co najmniej jedną pozycję." }
        }

        // 2. Pozycje i ich cele: wszystko sprawdzone, zanim cokolwiek zapiszemy
        const items = data.items.map(item => ({ ...item, target: item.target || vehicleId }))
        for (const item of items) {
            const problem = itemError(item)
            if (problem) return { error: problem }
        }
        const wantedVehicleIds = Array.from(new Set(items.filter(i => !isWarehouseTarget(i.target)).map(i => i.target)))
        const allowedVehicleIds = new Set<string>()
        if (wantedVehicleIds.length > 0) {
            const { data: vehicles, error: vehiclesError } = await supabase
                .from("vehicles")
                .select("id")
                .in("id", wantedVehicleIds)
            if (vehiclesError) {
                return { error: `Nie udało się sprawdzić pojazdów: ${vehiclesError.message}` }
            }
            for (const v of vehicles || []) allowedVehicleIds.add(v.id)
        }
        for (const item of items) {
            const problem = targetError(item, allowedVehicleIds)
            if (problem) return { error: problem }
        }

        // 3. Stare pozycje: ich id do skasowania i auta do odświeżenia
        const { data: oldItems, error: oldItemsError } = await supabase
            .from("order_items")
            .select("id, vehicle_id")
            .eq("order_id", orderId)
        if (oldItemsError) {
            return { error: `Nie udało się wczytać obecnych pozycji: ${oldItemsError.message}` }
        }
        const oldIds = (oldItems || []).map(row => row.id)
        const touchedVehicles = new Set<string>([vehicleId, ...wantedVehicleIds])
        for (const row of oldItems || []) if (row.vehicle_id) touchedVehicles.add(row.vehicle_id)

        // 4. Kwoty (sprawdzone przed pierwszym zapisem) i nowe pozycje, które wchodzą obok starych
        const calculatedItems = items.map(calculateInvoiceItem)
        const invoiceTotalNet = calculatedItems.reduce((sum, item) => sum + item.total_net, 0)
        const invoiceTotalGross = calculatedItems.reduce((sum, item) => sum + item.total_gross, 0)
        const totalProblem = invoiceTotalError(invoiceTotalGross)
        if (totalProblem) return { error: totalProblem }
        const now = new Date().toISOString()
        const newRows = calculatedItems.map((item, i) => ({
            ...item,
            order_id: orderId,
            vehicle_id: isWarehouseTarget(items[i].target) ? null : items[i].target,
            is_warehouse: isWarehouseTarget(items[i].target),
            resolved: true,
            resolved_at: now,
            resolved_by: "user",
        }))

        const { data: inserted, error: insertItemsError } = await supabase
            .from("order_items")
            .insert(newRows)
            .select("id")

        if (insertItemsError) {
            console.error("Error inserting new items:", insertItemsError)
            return { error: `Błąd podczas zapisu pozycji (stare pozycje zostały bez zmian): ${insertItemsError.message}` }
        }

        // 5. Stare pozycje znikają; gdy to się nie uda, cofamy nowe, żeby nie było dubli
        if (oldIds.length > 0) {
            const { error: deleteItemsError } = await supabase
                .from("order_items")
                .delete()
                .in("id", oldIds)

            if (deleteItemsError) {
                console.error("Error deleting old items:", deleteItemsError)
                const newIds = (inserted || []).map(row => row.id)
                if (newIds.length > 0) {
                    await supabase.from("order_items").delete().in("id", newIds)
                }
                return { error: `Błąd podczas usuwania starych pozycji (faktura została bez zmian): ${deleteItemsError.message}` }
            }
        }

        // 6. Nagłówek z sumami na końcu: pozycje są już poprawne, więc najgorszy przypadek to stara suma
        const { error: updateError } = await supabase
            .from("orders")
            .update({
                order_date: data.orderDate,
                description: data.supplier,
                fiscal_document_number: data.invoiceNumber,
                total_net: Math.round(invoiceTotalNet * 100) / 100,
                total_gross: Math.round(invoiceTotalGross * 100) / 100,
                amount: Math.round(invoiceTotalGross * 100) / 100,
                updated_at: now,
            })
            .eq("id", orderId)

        if (updateError) {
            console.error("Error updating order:", updateError)
            return { error: `Pozycje zapisane, ale nagłówek faktury się nie zaktualizował: ${updateError.message}. Zapisz fakturę jeszcze raz.` }
        }

        // 7. Odświeżenie
        for (const id of touchedVehicles) revalidatePath(`/vehicles/${id}`)
        revalidatePath("/orders")
        revalidatePath("/statistics")
        revalidatePath("/")

        return { success: true, summary: summarizeTargets(items, vehicleId) }
    } catch (e) {
        console.error("Unhandled error in editManualInvoice:", e)
        return { error: `Błąd krytyczny serwera: ${e instanceof Error ? e.message : String(e)}` }
    }
}
