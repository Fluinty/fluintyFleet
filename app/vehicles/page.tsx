import { createClient } from '@/utils/supabase/server'
import { VehiclesFilters } from '@/components/vehicles/VehiclesFilters'
import { VehiclesTable } from '@/components/vehicles/VehiclesTable'
import { VehiclesTabs } from '@/components/vehicles/VehiclesTabs'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
    availableTabs,
    branchOptions,
    buildVehiclesQuery,
    getVehiclesAccess,
    listQueryString,
    readListParams,
    type Branch,
} from '@/lib/vehicles-list'
import { Suspense } from 'react'

const COLUMNS = 'id, plate_number, brand, model, production_year, branch_id, next_inspection_date, next_insurance_date, is_active, is_leasing, financing_type, leasing_end_date, vehicle_category, is_subcontractor, branches(name)'

export default async function VehiclesPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const supabase = await createClient()
    const access = await getVehiclesAccess(supabase)

    const { data: branchRows } = await supabase.from('branches').select('id, name, code').order('name')
    const branches: Branch[] = branchRows || []

    // Zakładka, oddział i pozostałe filtry z adresu; oddział spoza filtra tej zakładki jest pomijany
    const params = await searchParams
    const p = readListParams(params, access, branches)

    const { data: vehicles } = await buildVehiclesQuery(supabase, COLUMNS, p, branches)

    // Filtr oddziałów pokazujemy, gdy jest z czego wybierać (admin, kierownik kilku oddziałów, „Lotnisko” z podglądem)
    const filterBranches = branchOptions(p.tab, access, branches)

    // Linki zakładek zachowują wyszukiwanie, status i sortowanie; oddział tylko wtedy, gdy jest w filtrze tej zakładki
    const tabLinks = availableTabs(access).map(t => {
        const branchOk = branchOptions(t, access, branches).some(b => b.id === p.branch)
        return { tab: t, href: `/vehicles${listQueryString({ ...p, tab: t, branch: branchOk ? p.branch : '' })}` }
    })

    const emptyMessage = p.tab === 'podwykonawcy'
        ? (access.isAdmin
            ? 'Nie ma jeszcze aut podwykonawców. Żeby dodać auto, otwórz jego kartę i przy „Auto podwykonawcy” wybierz „Tak”.'
            : 'Nie ma aut podwykonawców.')
        : undefined

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between gap-2 space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Pojazdy</h2>
                <Button variant="outline" size="sm" asChild>
                    <a href={`/vehicles/export${listQueryString(p)}`}>
                        <Download className="mr-2 h-4 w-4" />
                        Pobierz do Excela
                    </a>
                </Button>
            </div>

            <div className="flex flex-col space-y-4">
                <VehiclesTabs current={p.tab} links={tabLinks} />
                {p.tab === 'podwykonawcy' && (
                    <p className="text-sm text-muted-foreground">
                        Te auta widać też w zakładce „Wszystkie”. Nie idą dla nich przypomnienia o przeglądach, polisach ani UDT.
                    </p>
                )}
                {/* key: po zmianie zakładki filtry startują od nowa z adresu (np. bez oddziału spoza tej zakładki) */}
                <VehiclesFilters
                    key={p.tab}
                    branches={filterBranches}
                    showBranchFilter={filterBranches.length > 1}
                />
                <Suspense fallback={<div>Ładowanie...</div>}>
                    <VehiclesTable vehicles={vehicles || []} emptyMessage={emptyMessage} />
                </Suspense>
            </div>
        </div>
    )
}
