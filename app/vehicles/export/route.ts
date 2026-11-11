import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getVehiclesAccess, readListParams, buildVehiclesQuery, type Branch } from '@/lib/vehicles-list'
import { buildVehiclesWorkbook, exportFileName, type ExportVehicle } from '@/lib/vehicles-export'

export const runtime = 'nodejs'

const COLUMNS = 'plate_number, brand, model, production_year, engine_capacity, load_capacity, branches(name)'

// Eksport bieżącej listy pojazdów (ta sama zakładka i te same filtry co na stronie) do Excela.
// Widać w nim tylko auta, które użytkownik widzi w panelu: RLS albo funkcja airport_vehicles() dla zakładki „Lotnisko”.
export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const access = await getVehiclesAccess(supabase)
    if (!access.userId) {
        return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
    }

    const { data: branchRows } = await supabase.from('branches').select('id, name, code').order('name')
    const branches: Branch[] = branchRows || []
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const p = readListParams(params, access, branches)

    const { data, error } = await buildVehiclesQuery(supabase, COLUMNS, p, branches)
    if (error) {
        console.error('[EXPORT VEHICLES ERROR]', error)
        return NextResponse.json({ error: 'Nie udało się pobrać listy pojazdów' }, { status: 500 })
    }

    type Row = Omit<ExportVehicle, 'branchName'> & { branches?: { name: string } | { name: string }[] | null }
    const vehicles: ExportVehicle[] = ((data || []) as unknown as Row[]).map(v => ({
        ...v,
        branchName: Array.isArray(v.branches) ? v.branches[0]?.name : v.branches?.name,
    }))

    // Tytuł jak w wykazach: oddział, „Lotniska” albo „Podwykonawcy”. Wykaz lotnisk nie ma kolumny z miastem.
    const branchName = branches.find(b => b.id === p.branch)?.name
    const base = p.tab === 'lotnisko' ? 'Lotniska' : p.tab === 'podwykonawcy' ? 'Podwykonawcy' : branchName || 'Wszystkie oddziały'
    let title = p.tab !== 'wszystkie' && branchName ? `${base} – ${branchName}` : base
    if (p.status === 'INACTIVE') title += ' (nieaktywne)'
    if (p.status === 'ALL') title += ' (aktywne i nieaktywne)'

    const now = new Date()
    const dateLabel = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)
    const isoDate = dateLabel.split('.').reverse().join('-')

    const buffer = await buildVehiclesWorkbook(vehicles, {
        title,
        dateLabel,
        withBranch: p.tab !== 'lotnisko' && !p.branch,
    })

    const fileName = exportFileName(title, isoDate)
    return new NextResponse(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Cache-Control': 'private, no-store',
        },
    })
}
