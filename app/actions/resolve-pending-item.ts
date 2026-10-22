"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

import { checkBudgetAlerts } from "./check-budget"
import { isWarehouseEligible } from "@/lib/warehouse"

type Supabase = Awaited<ReturnType<typeof createClient>>

function revalidateAfterResolve() {
    revalidatePath("/pending")
    revalidatePath("/")
    revalidatePath("/orders")
}

/**
 * Close the parent order when nothing is left to verify.
 * The DB trigger only looks at vehicle_id, so an order with a warehouse item would stay
 * 'pending' forever — this covers it in every resolve path, whatever the trigger does.
 * Only moves 'pending' -> 'completed'. Returns false when the status could not be checked/updated.
 */
async function completeOrderIfResolved(supabase: Supabase, orderId: string): Promise<boolean> {
    const { count, error: countError } = await supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("order_id", orderId)
        .is("vehicle_id", null)
        .eq("is_warehouse", false)

    if (countError || count === null) {
        console.error("completeOrderIfResolved: nie udało się policzyć pozycji", orderId, countError?.message)
        return false
    }
    if (count > 0) return true

    const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", orderId)
        .eq("status", "pending")

    if (updateError) {
        console.error("completeOrderIfResolved: nie udało się domknąć zamówienia", orderId, updateError.message)
        return false
    }
    return true
}

/**
 * Resolve a single order item by assigning a vehicle to it
 */
export async function resolvePendingItem(itemId: string, plate: string) {
    const supabase = await createClient()

    // 1. Find vehicle by plate
    const { data: vehicle, error: vError } = await supabase
        .from("vehicles")
        .select("id")
        .ilike("plate_number", plate)
        .single()

    if (vError || !vehicle) {
        return { error: "Nie znaleziono pojazdu o podanym numerze rejestracyjnym." }
    }

    // 2. Update the order item with vehicle_id and mark as resolved
    // Note: A database trigger automatically updates the parent order's status to 'completed'
    // when all items have vehicle_id assigned
    const { data: updated, error: oError } = await supabase
        .from("order_items")
        .update({
            vehicle_id: vehicle.id,
            is_warehouse: false,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: "user", // Placeholder for auth user
        })
        .eq("id", itemId)
        .select("order_id")
        .single()

    if (oError || !updated) {
        return { error: "Błąd podczas aktualizacji pozycji zamówienia." }
    }

    // Warehouse items keep vehicle_id NULL, so the trigger alone won't close the order
    await completeOrderIfResolved(supabase, updated.order_id)

    // Trigger alert check
    await checkBudgetAlerts()

    revalidateAfterResolve()
    return { success: true }
}

/**
 * Resolve a single order item by putting it on the warehouse instead of a vehicle.
 * Only products from lib/warehouse.ts qualify (checked here too, not just in the UI).
 */
export async function resolvePendingItemToWarehouse(itemId: string) {
    const supabase = await createClient()

    const { data: item, error: iError } = await supabase
        .from("order_items")
        .select("id, name, order_id")
        .eq("id", itemId)
        .single()

    if (iError || !item) {
        return { error: "Nie znaleziono pozycji zamówienia." }
    }

    if (!isWarehouseEligible(item.name)) {
        return { error: "Tej pozycji nie można przypisać na magazyn. Na magazyn idą tylko olej silnikowy i AdBlue." }
    }

    const { data: updated, error: uError } = await supabase
        .from("order_items")
        .update({
            vehicle_id: null,
            is_warehouse: true,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: "user",
        })
        .eq("id", itemId)
        .select("id")

    if (uError) {
        return { error: "Błąd podczas przypisywania pozycji na magazyn." }
    }
    if (!updated || updated.length === 0) {
        return { error: "Brak uprawnień do tej pozycji." }
    }

    const closed = await completeOrderIfResolved(supabase, item.order_id)

    revalidateAfterResolve()
    return closed
        ? { success: true }
        : { success: true, warning: "Pozycja jest na magazynie, ale zamówienia nie udało się domknąć." }
}

/**
 * Put every open item of an order on the warehouse, as long as its name qualifies (lib/warehouse.ts).
 * Items that do not qualify stay in the queue and are reported back as skipped.
 * Built for orders like 200 tyres from the InterCars tyre warehouse (HWR): one click instead of 200.
 */
export async function resolvePendingOrderItemsToWarehouse(orderId: string) {
    const supabase = await createClient()

    const { data: openItems, error: iError } = await supabase
        .from("order_items")
        .select("id, name")
        .eq("order_id", orderId)
        .is("vehicle_id", null)
        .eq("is_warehouse", false)

    if (iError || !openItems) {
        return { error: "Błąd podczas pobierania pozycji zamówienia." }
    }

    const eligibleIds = openItems.filter(i => isWarehouseEligible(i.name)).map(i => i.id)
    const skipped = openItems.length - eligibleIds.length

    if (eligibleIds.length === 0) {
        return { error: "Żadnej z otwartych pozycji tego zamówienia nie można przypisać na magazyn." }
    }

    // Paczkami po 100 id, żeby adres zapytania do PostgREST nie urósł ponad limit
    let updated = 0
    for (let i = 0; i < eligibleIds.length; i += 100) {
        const chunk = eligibleIds.slice(i, i + 100)
        const { data, error: uError } = await supabase
            .from("order_items")
            .update({
                vehicle_id: null,
                is_warehouse: true,
                resolved: true,
                resolved_at: new Date().toISOString(),
                resolved_by: "user",
            })
            .in("id", chunk)
            .select("id")
        if (uError) {
            return { error: `Błąd podczas przypisywania na magazyn (zapisano ${updated} z ${eligibleIds.length}).` }
        }
        updated += data?.length ?? 0
    }

    const closed = await completeOrderIfResolved(supabase, orderId)

    revalidateAfterResolve()
    return {
        success: true,
        updated,
        skipped,
        warning: closed ? undefined : "Pozycje są na magazynie, ale zamówienia nie udało się domknąć.",
    }
}

/**
 * Resolve all items in an order at once with the same vehicle.
 * Items already put on the warehouse are left alone — that was a deliberate decision.
 */
export async function resolvePendingOrderItems(orderId: string, plate: string) {
    const supabase = await createClient()

    // 1. Find vehicle by plate
    const { data: vehicle, error: vError } = await supabase
        .from("vehicles")
        .select("id")
        .ilike("plate_number", plate)
        .single()

    if (vError || !vehicle) {
        return { error: "Nie znaleziono pojazdu o podanym numerze rejestracyjnym." }
    }

    // 2. Update all non-warehouse items in the order
    // Note: A database trigger automatically updates the parent order's status to 'completed'
    // when all items have vehicle_id assigned
    const { data: updatedItems, error: itemsError } = await supabase
        .from("order_items")
        .update({
            vehicle_id: vehicle.id,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: "user",
        })
        .eq("order_id", orderId)
        .eq("is_warehouse", false)
        .select("id")

    if (itemsError) {
        return { error: "Błąd podczas aktualizacji pozycji zamówienia." }
    }

    // 3. Also update the order's vehicle_id for backward compatibility
    // This is optional - if it fails, items are still assigned successfully
    const { error: orderError } = await supabase
        .from("orders")
        .update({
            vehicle_id: vehicle.id,
        })
        .eq("id", orderId)

    if (orderError) {
        // Log warning but don't fail - main operation succeeded
        console.warn("Warning: Could not update order vehicle_id (backwards compatibility):", orderError.message)
    }

    await completeOrderIfResolved(supabase, orderId)

    // Trigger alert check
    await checkBudgetAlerts()

    revalidateAfterResolve()
    return { success: true, itemsUpdated: updatedItems?.length ?? 0 }
}

/**
 * Get pending items for a specific order
 */
export async function getPendingItemsForOrder(orderId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("order_items")
        .select("id, name, sku, total_gross, vehicle_id, is_warehouse, plate_extraction_status, resolved")
        .eq("order_id", orderId)
        .order("name", { ascending: true })

    if (error) {
        return { error: "Błąd podczas pobierania pozycji zamówienia." }
    }

    return { items: data }
}
