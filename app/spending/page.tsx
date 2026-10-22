import { createClient } from '@/utils/supabase/server'
import { SpendingTable } from '@/components/spending/SpendingTable'
import { startOfMonth, format } from 'date-fns'

export default async function SpendingPage() {
    const supabase = await createClient()

    // Default to current month for the view query
    const startOfCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    // Fetch monthly spending data
    // Note: The view 'vehicle_monthly_spending' contains historical months too.
    // Ideally we filter by the current month for the "Current Status" default view.
    // If we want a full report, we might want to sum up or show recent months.
    // For now, let's fetch ALL and let the user sort/see, or filter to current month to be focused. 
    // Given the brief "List of all vehicles with monthly spending", let's filter to current month 
    // so it matches the "Monthly Budget" context. 

    // Actually, showing all history might be too much. Let's filter for valid spending in current month.
    // However, if a vehicle has NO spending this month, it won't show up.
    // If we want "All Vehicles" we should Left Join vehicles with this view.
    // But the brief says "List of all vehicles with monthly spending", usually meaning "Report".
    // Let's stick to showing data present in the view for current month.

    const { data: spending } = await supabase
        .from('vehicle_monthly_spending')
        .select('*')
        .eq('month', startOfCurrentMonth)
        .order('total_spent', { ascending: false })

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Wydatki Pojazdów (Bieżący Miesiąc)</h2>
            </div>

            <div className="flex flex-col space-y-4">
                <SpendingTable items={spending || []} />
            </div>
        </div>
    )
}
