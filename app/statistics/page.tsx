import { createClient } from '@/utils/supabase/server'
import { fetchAll } from '@/utils/supabase/fetch-all'
import { redirect } from 'next/navigation'
import { StatisticsFilters } from '@/components/statistics/StatisticsFilters'
import { StatsSummaryCards } from '@/components/statistics/StatsSummaryCards'
import { SpendingByBranchChart } from '@/components/statistics/SpendingByBranchChart'
import { TopVehiclesList } from '@/components/statistics/TopVehiclesList'
import { BranchComparisonTable } from '@/components/statistics/BranchComparisonTable'
import { format, startOfMonth, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'

interface PageProps {
    searchParams: Promise<{ month?: string; branch?: string }>
}

export default async function StatisticsPage({ searchParams }: PageProps) {
    const supabase = await createClient()
    const params = await searchParams

    // Check user role
    const { data: { user } } = await supabase.auth.getUser()
    let isAdmin = false
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isAdmin = profile?.role === 'admin'
    }

    // Only admins can access this page
    if (!isAdmin) {
        redirect('/')
    }

    // Default to current month
    const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const selectedMonth = params.month || currentMonthStart
    const selectedBranch = params.branch || null

    // Zakres miesiąca jako [początek, początek następnego). orders.order_date to timestamp,
    // więc warunek "<= 2026-09-30" znaczył "<= 30.09 00:00" i gubił cały ostatni dzień miesiąca.
    const monthStart = selectedMonth
    const nextMonthStart = format(addMonths(new Date(selectedMonth), 1), 'yyyy-MM-dd')

    // Previous month for comparison
    const prevMonthStart = format(subMonths(new Date(selectedMonth), 1), 'yyyy-MM-dd')

    // Fetch branches for filter dropdown
    const { data: branches } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')

    // Pozycje z autem w zadanym przedziale dat. Stronicowane (fetchAll), bo miesiąc może mieć
    // więcej niż 1000 pozycji, a jedno zapytanie zwraca najwyżej tyle.
    const fetchAssignedItems = (from: string, toExclusive: string) => fetchAll(() => {
        let q = supabase
            .from('order_items')
            .select(`
                id,
                total_gross,
                vehicle_id,
                orders!inner(id, order_date, branch_code)
            `)
            .not('vehicle_id', 'is', null)
            .gte('orders.order_date', from)
            .lt('orders.order_date', toExclusive)
        if (selectedBranch) {
            q = q.eq('orders.branch_code', selectedBranch)
        }
        return q.order('id')
    })

    // Current month totals
    const currentItems = await fetchAssignedItems(monthStart, nextMonthStart)

    // Previous month totals (for MoM comparison)
    const prevItems = await fetchAssignedItems(prevMonthStart, monthStart)

    // Calculate summary metrics
    const totalSpending = currentItems?.reduce((sum, item) => sum + (item.total_gross || 0), 0) || 0
    const prevSpending = prevItems?.reduce((sum, item) => sum + (item.total_gross || 0), 0) || 0
    const vehiclesWithOrders = new Set(currentItems?.map(i => i.vehicle_id)).size
    const totalOrders = new Set(currentItems?.map(i => {
        const order = Array.isArray(i.orders) ? i.orders[0] : i.orders
        return order?.id
    })).size
    const avgPerVehicle = vehiclesWithOrders > 0 ? totalSpending / vehiclesWithOrders : 0
    const momChange = prevSpending > 0
        ? ((totalSpending - prevSpending) / prevSpending) * 100
        : null

    // Calculate branch spending breakdown
    const branchSpendingMap = new Map<string, { spending: number; vehicles: Set<string>; orders: Set<string> }>()

    currentItems?.forEach(item => {
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
        const branchCode = order?.branch_code || 'UNKNOWN'

        if (!branchSpendingMap.has(branchCode)) {
            branchSpendingMap.set(branchCode, { spending: 0, vehicles: new Set(), orders: new Set() })
        }
        const entry = branchSpendingMap.get(branchCode)!
        entry.spending += item.total_gross || 0
        entry.vehicles.add(item.vehicle_id!)
        entry.orders.add(order?.id)
    })

    const branchCodeToName: Record<string, string> = {}
    branches?.forEach(b => { branchCodeToName[b.code] = b.name })

    const spendingByBranch = Array.from(branchSpendingMap.entries())
        .map(([code, data]) => ({
            branch_code: code,
            branch_name: branchCodeToName[code] || code,
            spending: data.spending
        }))
        .sort((a, b) => b.spending - a.spending)

    const branchComparison = Array.from(branchSpendingMap.entries())
        .map(([code, data]) => ({
            branch_code: code,
            branch_name: branchCodeToName[code] || code,
            vehicles: data.vehicles.size,
            orders: data.orders.size,
            spending: data.spending,
            avgPerVehicle: data.vehicles.size > 0 ? data.spending / data.vehicles.size : 0
        }))
        .sort((a, b) => b.spending - a.spending)

    // Top vehicles by spending
    const vehicleSpendingMap = new Map<string, {
        id: string
        plate_number: string
        brand: string | null
        model: string | null
        spending: number
        order_count: number
    }>()

    // Fetch vehicle details for items
    const vehicleIds = [...new Set(currentItems?.map(i => i.vehicle_id).filter(Boolean))]
    const { data: vehicleDetails } = await supabase
        .from('vehicles')
        .select('id, plate_number, brand, model')
        .in('id', vehicleIds)

    const vehicleMap = new Map(vehicleDetails?.map(v => [v.id, v]))

    currentItems?.forEach(item => {
        const vehicleId = item.vehicle_id!
        const vehicle = vehicleMap.get(vehicleId)

        if (!vehicleSpendingMap.has(vehicleId)) {
            vehicleSpendingMap.set(vehicleId, {
                id: vehicleId,
                plate_number: vehicle?.plate_number || 'Nieznany',
                brand: vehicle?.brand || null,
                model: vehicle?.model || null,
                spending: 0,
                order_count: 0
            })
        }
        const entry = vehicleSpendingMap.get(vehicleId)!
        entry.spending += item.total_gross || 0
        entry.order_count += 1
    })

    const topVehicles = Array.from(vehicleSpendingMap.values())
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 5)

    // Format month display
    const monthDisplay = format(new Date(selectedMonth), 'LLLL yyyy', { locale: pl })

    return (
        <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
                        Statystyki
                    </h2>
                    <p className="text-slate-500 mt-1 capitalize">{monthDisplay}</p>
                </div>
                <StatisticsFilters branches={branches || []} showBranchFilter={isAdmin} />
            </div>

            {/* Summary Cards */}
            <StatsSummaryCards
                totalSpending={totalSpending}
                avgPerVehicle={avgPerVehicle}
                momChange={momChange}
                totalOrders={totalOrders}
                vehiclesWithOrders={vehiclesWithOrders}
            />

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                <SpendingByBranchChart data={spendingByBranch} />
                <TopVehiclesList vehicles={topVehicles} />
            </div>

            {/* Branch Comparison Table */}
            <BranchComparisonTable data={branchComparison} />
        </div>
    )
}
