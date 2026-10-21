"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

import { checkBudgetAlerts } from "./check-budget"
import { isWarehouseEligible } from "@/lib/warehouse"

function revalidateAfterResolve() {
    revalidatePath("/pending")
    revalidatePath("/")
    revalidatePath("/orders")
}

/**
 * Close the parent order when nothing is left to verify.
 * The DB trigger only looks at vehicle_id, so warehouse items would keep the order
 * pending forever — this covers that case. Only moves 'pending' -> 'completed'.
 */
async function completeOrderIfResolved(supabase: Awaited<ReturnType<typeof createClient>>, orderId: string) {
    const { count } = await supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("order_id", orderId)
        .is("vehicle_id", null)
        .eq("is_warehouse", false)

    if (count === 0) {
        await supabase
            .from("orders")
            .update({ status: "completed" })
            .eq("id", orderId)
            .eq("status", "pending")
    }
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
    const { error: oError } = await supabase
        .from("order_items")
        .update({
            vehicle_id: vehicle.id,
            is_warehouse: false,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: "user", // Placeholder for auth user
        })
        .eq("id", itemId)

    if (oError) {
        return { error: "Błąd podczas aktualizacji pozycji zamówienia." }
    }

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

    const { error: uError } = await supabase
        .from("order_items")
        .update({
            vehicle_id: null,
            is_warehouse: true,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: "user",
        })
        .eq("id", itemId)

    if (uError) {
        return { error: "Błąd podczas przypisywania pozycji na magazyn." }
    }

    await completeOrderIfResolved(supabase, item.order_id)

    revalidateAfterResolve()
    return { success: true }
}

/**
 * Resolve all items in an order at once with the same vehicle
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

    // 2. Update all items in the order
    // Note: A database trigger automatically updates the parent order's status to 'completed'
    // when all items have vehicle_id assigned
    const { error: itemsError, count } = await supabase
        .from("order_items")
        .update({
            vehicle_id: vehicle.id,
            is_warehouse: false,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: "user",
        })
        .eq("order_id", orderId)

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

    // Trigger alert check
    await checkBudgetAlerts()

    revalidateAfterResolve()
    return { success: true, itemsUpdated: count }
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
