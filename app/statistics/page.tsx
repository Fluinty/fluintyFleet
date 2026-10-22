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

// Etykieta dla zamówień bez kodu oddziału (dziś: faktury ręczne, które dostają tylko branch_id)
const NO_BRANCH_CODE = 'UNKNOWN'
const NO_BRANCH_LABEL = 'Bez kodu oddziału'

type OrderRef = { id: string; order_date: string; branch_code: string | null }
type MonthItem = {
    id: string
    total_gross: number | null
    vehicle_id: string | null
    is_warehouse: boolean | null
    orders: OrderRef | OrderRef[]
}
type MonthOrder = { id: string; total_gross: number | null; branch_code: string | null }

const gross = (row: { total_gross: number | null } | null | undefined) => Number(row?.total_gross) || 0
const orderOf = (item: MonthItem): OrderRef | undefined => Array.isArray(item.orders) ? item.orders[0] : item.orders
// Każda pozycja jest w dokładnie jednym koszyku: przypisana do auta, na magazynie albo w kolejce do weryfikacji
const bucketOf = (item: MonthItem): 'assigned' | 'warehouse' | 'queue' =>
    item.vehicle_id ? 'assigned' : item.is_warehouse ? 'warehouse' : 'queue'

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
    const prevMonthStart = format(subMonths(new Date(selectedMonth), 1), 'yyyy-MM-dd')

    // Fetch branches for filter dropdown
    const { data: branches } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')

    // Nagłówki zamówień z miesiąca: ta sama miara, co karta „Zakupy (ten miesiąc)” na dashboardzie.
    // Stronicowane (fetchAll), bo jedno zapytanie zwraca najwyżej 1000 wierszy.
    const fetchOrders = (from: string, toExclusive: string) => fetchAll<MonthOrder>(() => {
        let q = supabase
            .from('orders')
            .select('id, total_gross, branch_code')
            .gte('order_date', from)
            .lt('order_date', toExclusive)
        if (selectedBranch) {
            q = q.eq('branch_code', selectedBranch)
        }
        return q.order('id')
    })

    // Wszystkie pozycje z miesiąca, bez względu na to, czy mają auto. Koszyk rozstrzyga bucketOf().
    const fetchItems = (from: string, toExclusive: string) => fetchAll<MonthItem>(() => {
        let q = supabase
            .from('order_items')
            .select(`
                id,
                total_gross,
                vehicle_id,
                is_warehouse,
                orders!inner(id, order_date, branch_code)
            `)
            .gte('orders.order_date', from)
            .lt('orders.order_date', toExclusive)
        if (selectedBranch) {
            q = q.eq('orders.branch_code', selectedBranch)
        }
        return q.order('id')
    })

    const [currentOrders, currentItems, prevOrders] = await Promise.all([
        fetchOrders(monthStart, nextMonthStart),
        fetchItems(monthStart, nextMonthStart),
        fetchOrders(prevMonthStart, monthStart),
    ])

    // Podsumowanie: zakupy razem (nagłówki) = auta + kolejka + magazyn (pozycje)
    const totalPurchases = currentOrders.reduce((sum, o) => sum + gross(o), 0)
    const prevPurchases = prevOrders.reduce((sum, o) => sum + gross(o), 0)

    const assignedItems = currentItems.filter(i => bucketOf(i) === 'assigned')
    const queueItems = currentItems.filter(i => bucketOf(i) === 'queue')
    const warehouseItems = currentItems.filter(i => bucketOf(i) === 'warehouse')

    const assignedTotal = assignedItems.reduce((sum, i) => sum + gross(i), 0)
    const queueTotal = queueItems.reduce((sum, i) => sum + gross(i), 0)
    const warehouseTotal = warehouseItems.reduce((sum, i) => sum + gross(i), 0)
    // Import zapisuje nagłówek równy sumie pozycji; gdyby kiedyś przestał, różnica ma być widoczna, nie ukryta
    const headerVsItems = totalPurchases - (assignedTotal + queueTotal + warehouseTotal)

    const vehiclesWithOrders = new Set(assignedItems.map(i => i.vehicle_id)).size
    const avgPerVehicle = vehiclesWithOrders > 0 ? assignedTotal / vehiclesWithOrders : 0
    const totalOrders = currentOrders.length
    const queueOrders = new Set(queueItems.map(i => orderOf(i)?.id)).size
    const momChange = prevPurchases > 0
        ? ((totalPurchases - prevPurchases) / prevPurchases) * 100
        : null

    // Oddziały po kodzie z nagłówka zamówienia: zakupy z nagłówków, koszyki z pozycji
    type BranchAgg = { purchases: number; assigned: number; queue: number; warehouse: number; vehicles: Set<string>; orders: Set<string> }
    const branchAgg = new Map<string, BranchAgg>()
    const aggFor = (code: string): BranchAgg => {
        let entry = branchAgg.get(code)
        if (!entry) {
            entry = { purchases: 0, assigned: 0, queue: 0, warehouse: 0, vehicles: new Set(), orders: new Set() }
            branchAgg.set(code, entry)
        }
        return entry
    }
    currentOrders.forEach(o => {
        const entry = aggFor(o.branch_code || NO_BRANCH_CODE)
        entry.purchases += gross(o)
        entry.orders.add(o.id)
    })
    currentItems.forEach(item => {
        const entry = aggFor(orderOf(item)?.branch_code || NO_BRANCH_CODE)
        entry[bucketOf(item)] += gross(item)
        if (item.vehicle_id) entry.vehicles.add(item.vehicle_id)
    })

    const branchCodeToName: Record<string, string> = { [NO_BRANCH_CODE]: NO_BRANCH_LABEL }
    branches?.forEach(b => { branchCodeToName[b.code] = b.name })

    const branchComparison = Array.from(branchAgg.entries())
        .map(([code, d]) => ({
            branch_code: code,
            branch_name: branchCodeToName[code] || code,
            orders: d.orders.size,
            vehicles: d.vehicles.size,
            purchases: d.purchases,
            assigned: d.assigned,
            queue: d.queue,
            warehouse: d.warehouse,
        }))
        .sort((a, b) => b.purchases - a.purchases)

    const spendingByBranch = branchComparison.map(r => ({
        branch_code: r.branch_code,
        branch_name: r.branch_name,
        assigned: r.assigned,
        queue: r.queue,
        warehouse: r.warehouse,
    }))

    // Top vehicles by spending (tylko pozycje przypisane do aut)
    const vehicleSpendingMap = new Map<string, {
        id: string
        plate_number: string
        brand: string | null
        model: string | null
        spending: number
        order_count: number
    }>()

    const vehicleIds = [...new Set(assignedItems.map(i => i.vehicle_id as string))]
    const { data: vehicleDetails } = vehicleIds.length > 0
        ? await supabase
            .from('vehicles')
            .select('id, plate_number, brand, model')
            .in('id', vehicleIds)
        : { data: [] as { id: string; plate_number: string; brand: string | null; model: string | null }[] }

    const vehicleMap = new Map(vehicleDetails?.map(v => [v.id, v]))

    assignedItems.forEach(item => {
        const vehicleId = item.vehicle_id as string
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
        entry.spending += gross(item)
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
                totalPurchases={totalPurchases}
                totalOrders={totalOrders}
                momChange={momChange}
                assignedTotal={assignedTotal}
                vehiclesWithOrders={vehiclesWithOrders}
                avgPerVehicle={avgPerVehicle}
                queueTotal={queueTotal}
                queueItems={queueItems.length}
                queueOrders={queueOrders}
                warehouseTotal={warehouseTotal}
                warehouseItems={warehouseItems.length}
                headerVsItems={headerVsItems}
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
