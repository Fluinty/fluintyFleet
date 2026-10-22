"use server"

import { createServiceClient } from "@/utils/supabase/service"
import { revalidatePath } from "next/cache"
import { checkBudgetAlerts } from "./check-budget"
import { calculateInvoiceItem, invoiceTotalError, isWarehouseTarget, itemError, summarizeTargets, targetError, type ManualInvoiceInput } from "@/lib/manual-invoice"

// Faktura ręczna wpisywana z karty auta. Od 22.10.2026 każda pozycja ma własny cel: to auto, inne auto
// z listy albo magazyn (tylko olej silnikowy, AdBlue, opony). Nagłówek dostaje oddział auta, z którego
// otwarto formularz. Wcześniej wszystkie pozycje szły na to jedno auto, więc fakturę na kilka aut
// trzeba było wpisywać kilka razy, a oleju nie dało się odłożyć na magazyn.
export async function addManualInvoice(vehicleId: string, data: ManualInvoiceInput) {
    try {
        const supabase = createServiceClient() // klucz serwisowy: faktury ręczne omijają RLS

        if (!data.items || data.items.length === 0) {
            return { error: "Faktura musi zawierać co najmniej jedną pozycję." }
        }

        // 1. Auto, z którego otwarto formularz: daje oddział nagłówkowi
        const { data: vehicle, error: vError } = await supabase
            .from("vehicles")
            .select("id, branch_id")
            .eq("id", vehicleId)
            .single()

        if (vError || !vehicle) {
            return { error: "Nie znaleziono pojazdu." }
        }

        // 2. Pozycje (nazwa, ilość, cena, VAT) i ich cele: auta muszą istnieć i być aktywne,
        //    magazyn tylko dla produktów z listy. Wszystko sprawdzone, zanim cokolwiek zapiszemy.
        const items = data.items.map(item => ({ ...item, target: item.target || vehicleId }))
        for (const item of items) {
            const problem = itemError(item)
            if (problem) return { error: problem }
        }
        const wantedVehicleIds = Array.from(new Set(items.filter(i => !isWarehouseTarget(i.target)).map(i => i.target)))
        const allowedVehicleIds = new Set<string>([vehicleId])
        if (wantedVehicleIds.length > 0) {
            const { data: vehicles, error: vehiclesError } = await supabase
                .from("vehicles")
                .select("id")
                .in("id", wantedVehicleIds)
                .eq("is_active", true)
            if (vehiclesError) {
                return { error: `Nie udało się sprawdzić pojazdów: ${vehiclesError.message}` }
            }
            for (const v of vehicles || []) allowedVehicleIds.add(v.id)
        }
        for (const item of items) {
            const problem = targetError(item, allowedVehicleIds)
            if (problem) return { error: problem }
        }

        // 3. Kwoty
        const calculatedItems = items.map(calculateInvoiceItem)
        const invoiceTotalNet = calculatedItems.reduce((sum, item) => sum + item.total_net, 0)
        const invoiceTotalGross = calculatedItems.reduce((sum, item) => sum + item.total_gross, 0)
        const totalProblem = invoiceTotalError(invoiceTotalGross)
        if (totalProblem) return { error: totalProblem }

        // 4. Nagłówek (intercars_id ma UNIQUE, więc własny identyfikator)
        const manualInvoiceId = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                order_date: data.orderDate,
                description: data.supplier,
                fiscal_document_number: data.invoiceNumber,
                branch_id: vehicle.branch_id,
                total_net: Math.round(invoiceTotalNet * 100) / 100,
                total_gross: Math.round(invoiceTotalGross * 100) / 100,
                intercars_id: manualInvoiceId,
                status: "completed",
                currency: "PLN",
                amount: Math.round(invoiceTotalGross * 100) / 100,
                is_manual: true,
            })
            .select()
            .single()

        if (orderError || !order) {
            console.error("Error creating order:", orderError)
            return { error: `Błąd podczas tworzenia faktury: ${orderError?.message}` }
        }

        // 5. Pozycje: auto albo magazyn (CHECK w bazie: magazyn wyklucza auto)
        const now = new Date().toISOString()
        const orderItems = calculatedItems.map((item, i) => ({
            ...item,
            order_id: order.id,
            vehicle_id: isWarehouseTarget(items[i].target) ? null : items[i].target,
            is_warehouse: isWarehouseTarget(items[i].target),
            resolved: true,
            resolved_at: now,
            resolved_by: "user",
        }))

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItems)

        if (itemsError) {
            console.error("Error creating order items:", itemsError)
            await supabase.from("orders").delete().eq("id", order.id)
            return { error: `Błąd podczas dodawania pozycji: ${itemsError?.message}` }
        }

        // 6. Alerty budżetowe (trigger w bazie robi to samo; zostaje do czasu porządków)
        try {
            await checkBudgetAlerts()
        } catch (alertErr) {
            console.error("Budget alert error:", alertErr)
        }

        // 7. Odświeżenie stron, które to czytają
        const touchedVehicles = new Set<string>([vehicleId, ...wantedVehicleIds])
        for (const id of touchedVehicles) revalidatePath(`/vehicles/${id}`)
        revalidatePath("/orders")
        revalidatePath("/statistics")
        revalidatePath("/")

        return { success: true, orderId: order.id, summary: summarizeTargets(items, vehicleId) }
    } catch (e) {
        console.error("Unhandled error in addManualInvoice:", e)
        return { error: `Błąd krytyczny serwera: ${e instanceof Error ? e.message : String(e)}` }
    }
}
