"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { startOfMonth, endOfMonth, format } from "date-fns"

export async function checkBudgetAlerts() {
    const supabase = await createClient()

    // 1. Get the global budget limit from settings
    const { data: setting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'monthly_budget_limit')
        .single()

    const budgetLimit = setting?.value && typeof setting.value === 'object' && 'amount' in setting.value
        ? (setting.value as { amount: number }).amount
        : 0

    if (budgetLimit <= 0) {
        return { error: "Brak ustawionego limitu budżetu." }
    }

    // 2. Get current month spending for all vehicles
    const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const { data: spending } = await supabase
        .from('vehicle_monthly_spending')
        .select('*')
        .eq('month', currentMonth)

    if (!spending || spending.length === 0) {
        return { message: "Brak danych o wydatkach za bieżący miesiąc." }
    }

    // 3. Find vehicles over budget
    const overBudget = spending.filter(v => Number(v.total_spent) > budgetLimit)

    if (overBudget.length === 0) {
        return { message: "Żaden pojazd nie przekroczył limitu budżetu." }
    }

    // 4. Check which alerts already exist for this month to avoid duplicates
    const periodStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const periodEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

    const { data: existingAlerts } = await supabase
        .from('budget_alerts')
        .select('vehicle_id')
        .eq('period_start', periodStart)
        .eq('alert_type', 'budget_exceeded')

    const existingVehicleIds = new Set(existingAlerts?.map(a => a.vehicle_id) || [])

    // 5. Create alerts for new violations
    const newAlerts = overBudget
        .filter(v => !existingVehicleIds.has(v.vehicle_id))
        .map(v => ({
            vehicle_id: v.vehicle_id,
            alert_type: 'budget_exceeded',
            period_start: periodStart,
            period_end: periodEnd,
            threshold_value: budgetLimit,
            actual_value: Number(v.total_spent),
            currency_code: 'PLN',
            acknowledged: false,
            created_at: new Date().toISOString()
        }))

    if (newAlerts.length === 0) {
        return { message: "Wszystkie alerty zostały już utworzone." }
    }

    const { error } = await supabase
        .from('budget_alerts')
        .insert(newAlerts)

    if (error) {
        console.error('Error inserting alerts:', error)
        return { error: "Błąd podczas tworzenia alertów." }
    }

    revalidatePath('/alerts')
    revalidatePath('/')
    return { success: true, count: newAlerts.length }
}
