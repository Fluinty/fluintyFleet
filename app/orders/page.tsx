import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { OrdersFilters } from '@/components/orders/OrdersFilters'
import { OrdersTable } from '@/components/orders/OrdersTable'
import { Suspense } from 'react'

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const supabase = await createClient()

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

    // Parametry z adresu idą prosto do zapytania PostgREST, więc każdy ma twardą listę
    // dopuszczalnych wartości: przecinek lub nawias w wyszukiwarce psuł składnię filtru .or(),
    // a nieznana kolumna w sort dawała błąd 400 i pustą tabelę.
    const params = await searchParams;
    const search = (typeof params.search === 'string' ? params.search : '').replace(/[,()"\\]/g, '').trim()
    const branch = typeof params.branch === 'string' ? params.branch : ''
    const status = typeof params.status === 'string' && ['completed', 'pending'].includes(params.status) ? params.status : 'ALL'
    const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    const dateFrom = isIsoDate(params.dateFrom) ? params.dateFrom : ''
    const dateTo = isIsoDate(params.dateTo) ? params.dateTo : ''
    const SORTABLE = ['order_date', 'total_gross', 'intercars_id', 'status']
    const sort = typeof params.sort === 'string' && SORTABLE.includes(params.sort) ? params.sort : 'order_date'
    const dir = params.dir === 'asc' ? 'asc' : 'desc'

    // Orders may have branch_code instead of branch_id, so the branch filter matches on either
    let branchCode: string | null = null
    if (branch) {
        const { data: selectedBranch } = await supabase
            .from('branches')
            .select('code')
            .eq('id', branch)
            .single()
        branchCode = selectedBranch?.code ?? null
    }

    // Lista do przeglądania, nie do sumowania: pokazujemy najwyżej 1000 zamówień w wybranej
    // kolejności i mówimy o tym wprost, zamiast ściągać całą historię z pozycjami do przeglądarki.
    // Drugie .order('id') daje stałą kolejność przy remisach w sortowanej kolumnie.
    const ORDERS_PAGE_LIMIT = 1000

    let query = supabase
        .from('orders')
        .select('*, branches(name), order_items(*, vehicles(id, plate_number))')

    if (search) {
        query = query.or(`intercars_id.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (branch) {
        query = branchCode
            ? query.or(`branch_id.eq.${branch},branch_code.eq.${branchCode}`)
            : query.eq('branch_id', branch)
    }

    if (status !== 'ALL') {
        query = query.eq('status', status)
    }

    if (dateFrom) {
        query = query.gte('order_date', dateFrom)
    }

    if (dateTo) {
        query = query.lte('order_date', dateTo)
    }

    const { data: orders, error: ordersError } = await query
        .order(sort, { ascending: dir === 'asc' })
        .order('id')
        .limit(ORDERS_PAGE_LIMIT)

    if (ordersError) {
        throw new Error(`Zamówienia: zapytanie nie powiodło się: ${ordersError.message}`)
    }

    const ordersTruncated = (orders?.length ?? 0) >= ORDERS_PAGE_LIMIT

    const { data: branches } = await supabase.from('branches').select('id, name').order('name')

    // Fetch vehicles for assignment
    let vehiclesQuery = supabase
        .from('vehicles')
        .select('id, plate_number, branch_id')
        .eq('is_active', true)
        .order('plate_number', { ascending: true })

    const { data: vehicles } = await vehiclesQuery

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Zamówienia</h2>
            </div>

            <div className="flex flex-col space-y-4">
                <OrdersFilters branches={branches || []} showBranchFilter={isAdmin} />
                {ordersTruncated && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                        Pokazuję {ORDERS_PAGE_LIMIT} zamówień spełniających kryteria. Zawęź zakres dat albo wpisz numer w wyszukiwarce, żeby zobaczyć pozostałe.
                    </p>
                )}
                <Suspense fallback={<div>Ładowanie...</div>}>
                    <OrdersTable orders={orders || []} vehicles={vehicles || []} />
                </Suspense>
            </div>
        </div>
    )
}
