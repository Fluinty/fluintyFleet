import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type VehicleDocs = { plate_number: string | null; inspection_document_url: string | null; insurance_document_url: string | null }

// Typy plików, które pokazujemy w przeglądarce. Inne (np. HTML albo SVG ze skryptem) nie przejdą przez domenę panelu.
const ALLOWED_TYPES: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}

function driveFileId(url: string | null): string | null {
    if (!url) return null
    const m = url.match(/\/(?:file|document)\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/)
    return m ? m[1] : null
}

const text = (body: string, status: number) =>
    new NextResponse(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })

// Podgląd dowodu albo polisy auta (?kind=dowod|polisa). Plik idzie z Dysku przez workflow n8n, a Dysk nie musi być
// udostępniony linkiem. Dokument dostaje każdy, kto widzi dane auto w panelu (RLS albo zakładka „Lotnisko”).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const kind = request.nextUrl.searchParams.get('kind')
    if (kind !== 'dowod' && kind !== 'polisa') return text('Nieznany rodzaj dokumentu', 400)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return text('Nie zalogowano', 401)

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, can_view_airport')
        .eq('id', user.id)
        .single()
    const isAdmin = profile?.role === 'admin'

    let vehicle = (await supabase
        .from('vehicles')
        .select('plate_number, inspection_document_url, insurance_document_url')
        .eq('id', id)
        .maybeSingle()).data as VehicleDocs | null
    if (!vehicle && (isAdmin || profile?.can_view_airport === true)) {
        vehicle = (await supabase
            .rpc('airport_vehicles')
            .select('plate_number, inspection_document_url, insurance_document_url')
            .eq('id', id)
            .maybeSingle()).data as VehicleDocs | null
    }
    if (!vehicle) return text('Nie znaleziono auta', 404)

    const fileId = driveFileId(kind === 'dowod' ? vehicle.inspection_document_url : vehicle.insurance_document_url)
    if (!fileId) return text('Brak dokumentu', 404)

    const { data: config, error } = await createServiceClient().rpc('docs_webhook_config')
    if (error || !config?.url || !config?.secret) {
        console.error('[DOCUMENT] brak konfiguracji podglądu', error)
        return text('Podgląd dokumentów nie jest skonfigurowany', 503)
    }

    const res = await fetch(`${config.url}?id=${encodeURIComponent(fileId)}`, {
        headers: { 'X-Docs-Secret': config.secret },
        cache: 'no-store',
    })
    if (!res.ok || !res.body) {
        console.error('[DOCUMENT] n8n odpowiedział', res.status)
        return text('Nie udało się pobrać dokumentu', 502)
    }

    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const ext = ALLOWED_TYPES[type]
    if (!ext) return text('Nieobsługiwany typ pliku', 415)

    const name = `${(vehicle.plate_number || 'auto').replace(/[^A-Za-z0-9]+/g, '')}_${kind}.${ext}`
    return new NextResponse(res.body, {
        headers: {
            'Content-Type': type,
            'Content-Disposition': `inline; filename="${name}"`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
