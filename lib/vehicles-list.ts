// Wspólna logika listy pojazdów: zakładki, oddziały w filtrze i zapytanie.
// Używają jej strona /vehicles i eksport do Excela, żeby obie pokazywały dokładnie te same auta.
import type { createClient } from '@/utils/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>
type SearchParams = { [key: string]: string | string[] | undefined }

export type VehiclesTab = 'wszystkie' | 'lotnisko' | 'podwykonawcy'
export type Branch = { id: string; name: string; code: string | null }

export interface VehiclesAccess {
    userId: string | null
    isAdmin: boolean
    canViewAirport: boolean
    // Oddziały kierownika z manager_branches; admin widzi wszystko, więc u niego lista jest pusta
    branchIds: string[]
}

export interface VehiclesListParams {
    tab: VehiclesTab
    search: string
    branch: string
    status: string
    sort: string
    dir: string
}

// Kolumny, po których tabela pozwala sortować; inna wartość z adresu wraca do numeru rejestracyjnego
const SORTS = ['plate_number', 'next_inspection_date', 'next_insurance_date', 'financing_type']

const str = (value: string | string[] | undefined, fallback = '') => (typeof value === 'string' ? value : fallback)

export async function getVehiclesAccess(supabase: Supabase): Promise<VehiclesAccess> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { userId: null, isAdmin: false, canViewAirport: false, branchIds: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, can_view_airport')
        .eq('id', user.id)
        .single()
    const isAdmin = profile?.role === 'admin'

    let branchIds: string[] = []
    if (!isAdmin) {
        const { data } = await supabase.from('manager_branches').select('branch_id').eq('profile_id', user.id)
        branchIds = (data || []).map((b: { branch_id: string }) => b.branch_id)
    }

    return { userId: user.id, isAdmin, canViewAirport: isAdmin || profile?.can_view_airport === true, branchIds }
}

export function availableTabs(access: VehiclesAccess): VehiclesTab[] {
    return access.canViewAirport ? ['wszystkie', 'lotnisko', 'podwykonawcy'] : ['wszystkie', 'podwykonawcy']
}

// Oddziały w filtrze: admin ma wszystkie. W „Lotnisku” są wszystkie oddziały, bo auta lotniskowe są z każdego,
// ale kierownik nie dostaje „Nieprzypisanych”. W pozostałych zakładkach kierownik ma tylko swoje oddziały.
export function branchOptions(tab: VehiclesTab, access: VehiclesAccess, branches: Branch[]): Branch[] {
    if (access.isAdmin) return branches
    if (tab === 'lotnisko') return branches.filter(b => b.code !== 'NONE')
    return branches.filter(b => access.branchIds.includes(b.id))
}

export function readListParams(params: SearchParams, access: VehiclesAccess, branches: Branch[]): VehiclesListParams {
    const tabParam = str(params.tab)
    const tab: VehiclesTab = tabParam === 'lotnisko' && access.canViewAirport
        ? 'lotnisko'
        : tabParam === 'podwykonawcy' ? 'podwykonawcy' : 'wszystkie'

    // Oddział spoza filtra tej zakładki (np. zostawiony po przejściu z „Lotniska”) pomijamy
    const branchParam = str(params.branch)
    const branch = branchOptions(tab, access, branches).some(b => b.id === branchParam) ? branchParam : ''

    return {
        tab,
        search: str(params.search),
        branch,
        status: str(params.status, 'ACTIVE'),
        sort: str(params.sort, 'plate_number'),
        dir: str(params.dir, 'asc'),
    }
}

// Adres z parametrami listy, bez pustych wartości (dla zakładek i eksportu)
export function listQueryString(p: Partial<VehiclesListParams>): string {
    const q = new URLSearchParams()
    if (p.tab && p.tab !== 'wszystkie') q.set('tab', p.tab)
    if (p.search) q.set('search', p.search)
    if (p.branch) q.set('branch', p.branch)
    if (p.status && p.status !== 'ACTIVE') q.set('status', p.status)
    if (p.sort && p.sort !== 'plate_number') q.set('sort', p.sort)
    if (p.dir && p.dir !== 'asc') q.set('dir', p.dir)
    const s = q.toString()
    return s ? `?${s}` : ''
}

export function buildVehiclesQuery(supabase: Supabase, columns: string, p: VehiclesListParams, branches: Branch[]) {
    // „Lotnisko” czyta funkcja airport_vehicles(): kierownik z podglądem widzi tam auta lotniskowe ze wszystkich
    // oddziałów, a zasady dostępu do tabeli vehicles (i reszta panelu) zostają bez zmian.
    // Rzutowania są tylko dla TypeScriptu: w obu przypadkach to ten sam builder i te same filtry, a „'*'” zamiast
    // zmiennej z kolumnami nie każe kompilatorowi rozbierać tekstu zapytania (wiersze i tak są bez typu, jak dotąd).
    const vehiclesQuery = supabase.from('vehicles').select(columns as '*')
    let query = p.tab === 'lotnisko'
        ? (supabase.rpc('airport_vehicles').select(columns as '*') as unknown as typeof vehiclesQuery)
        : vehiclesQuery

    if (p.tab === 'podwykonawcy') {
        query = query.eq('is_subcontractor', true)
    }

    if (p.status === 'ACTIVE') {
        query = query.eq('is_active', true)
    } else if (p.status === 'INACTIVE') {
        query = query.eq('is_active', false)
    }
    // 'ALL' - bez filtra is_active

    if (p.branch) {
        const selected = branches.find(b => b.id === p.branch)
        if (selected?.code === 'NONE' || selected?.name?.toLowerCase() === 'nieprzypisane') {
            query = query.or(`branch_id.eq.${p.branch},branch_id.is.null`)
        } else {
            query = query.eq('branch_id', p.branch)
        }
    }

    if (p.search) {
        query = query.or(`plate_number.ilike.%${p.search}%,brand.ilike.%${p.search}%,model.ilike.%${p.search}%`)
    }

    return query.order(SORTS.includes(p.sort) ? p.sort : 'plate_number', { ascending: p.dir !== 'desc' })
}
