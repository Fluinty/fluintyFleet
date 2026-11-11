import { createClient } from '@/utils/supabase/server'
import { VehiclesFilters } from '@/components/vehicles/VehiclesFilters'
import { VehiclesTable } from '@/components/vehicles/VehiclesTable'
import { VehiclesTabs, type VehiclesTab } from '@/components/vehicles/VehiclesTabs'
import { Suspense } from 'react'

const COLUMNS = 'id, plate_number, brand, model, production_year, branch_id, next_inspection_date, next_insurance_date, is_active, is_leasing, financing_type, leasing_end_date, vehicle_category, is_subcontractor, branches(name)'

export default async function VehiclesPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const supabase = await createClient()

    // Check user role
    const { data: { user } } = await supabase.auth.getUser()
    let isAdmin = false
    let canViewAirport = false
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, can_view_airport')
            .eq('id', user.id)
            .single()
        isAdmin = profile?.role === 'admin'
        canViewAirport = isAdmin || profile?.can_view_airport === true
    }

    // Extract filters
    const params = await searchParams;
    const search = typeof params.search === 'string' ? params.search : ''
    const branch = typeof params.branch === 'string' ? params.branch : ''
    const status = typeof params.status === 'string' ? params.status : 'ACTIVE'
    const sort = typeof params.sort === 'string' ? params.sort : 'plate_number'
    const dir = typeof params.dir === 'string' ? params.dir : 'asc'

    // Zakładka „Lotnisko” jest dla adminów i osób z podglądem lotniska (profiles.can_view_airport);
    // pozostali z ?tab=lotnisko trafiają do „Wszystkie”.
    const tab: VehiclesTab = params.tab === 'lotnisko' && canViewAirport
        ? 'lotnisko'
        : params.tab === 'podwykonawcy' ? 'podwykonawcy' : 'wszystkie'

    // Build query
    // „Lotnisko” czyta funkcja airport_vehicles(): kierownik z podglądem widzi tam auta lotniskowe ze wszystkich
    // oddziałów, a zasady dostępu do tabeli vehicles (i reszta panelu) zostają bez zmian.
    // Rzutowanie jest tylko dla TypeScriptu: w obu przypadkach to ten sam builder i te same filtry.
    const vehiclesQuery = supabase.from('vehicles').select(COLUMNS)
    let query = tab === 'lotnisko'
        ? (supabase.rpc('airport_vehicles').select(COLUMNS) as unknown as typeof vehiclesQuery)
        : vehiclesQuery

    if (tab === 'podwykonawcy') {
        query = query.eq('is_subcontractor', true)
    }

    if (status === 'ACTIVE') {
        query = query.eq('is_active', true)
    } else if (status === 'INACTIVE') {
        query = query.eq('is_active', false)
    }
    // 'ALL' - no filter on is_active

    // Fetch branches for filter
    const { data: branches } = await supabase.from('branches').select('id, name, code').order('name')

    if (branch) {
        const selectedBranchObj = branches?.find(b => b.id === branch)
        if (selectedBranchObj?.code === 'NONE' || selectedBranchObj?.name?.toLowerCase() === 'nieprzypisane') {
            query = query.or(`branch_id.eq.${branch},branch_id.is.null`)
        } else {
            query = query.eq('branch_id', branch)
        }
    }

    if (search) {
        query = query.or(`plate_number.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`)
    }

    // Sorting
    const sortDir = dir === 'desc' ? false : true
    query = query.order(sort, { ascending: sortDir })

    const { data: vehicles } = await query

    // Linki zakładek zachowują wyszukiwanie, filtry i sortowanie
    const tabs: VehiclesTab[] = canViewAirport
        ? ['wszystkie', 'lotnisko', 'podwykonawcy']
        : ['wszystkie', 'podwykonawcy']
    const tabLinks = tabs.map(t => {
        const p = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
            if (key !== 'tab' && typeof value === 'string') p.set(key, value)
        }
        if (t !== 'wszystkie') p.set('tab', t)
        const qs = p.toString()
        return { tab: t, href: qs ? `/vehicles?${qs}` : '/vehicles' }
    })

    const emptyMessage = tab === 'podwykonawcy'
        ? (isAdmin
            ? 'Nie ma jeszcze aut podwykonawców. Żeby dodać auto, otwórz jego kartę i przy „Auto podwykonawcy” wybierz „Tak”.'
            : 'Nie ma aut podwykonawców.')
        : undefined

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Pojazdy</h2>
            </div>

            <div className="flex flex-col space-y-4">
                <VehiclesTabs current={tab} links={tabLinks} />
                {tab === 'podwykonawcy' && (
                    <p className="text-sm text-muted-foreground">
                        Te auta widać też w zakładce „Wszystkie”. Nie idą dla nich przypomnienia o przeglądach, polisach ani UDT.
                    </p>
                )}
                <VehiclesFilters branches={branches || []} showBranchFilter={isAdmin} />
                <Suspense fallback={<div>Ładowanie...</div>}>
                    <VehiclesTable vehicles={vehicles || []} emptyMessage={emptyMessage} />
                </Suspense>
            </div>
        </div>
    )
}
