// Wykaz pojazdów do Excela, w tym samym układzie co wykazy wysyłane klientowi (Lp., Marka, Model, Nr rej.,
// Rok produkcji, Pojemność, Ładowność). Lp. to formuła =ROW()-1 z zapisanym wynikiem: po usunięciu wiersza
// numeracja sama się poprawia, a podgląd w poczcie i tak pokazuje numery.
import ExcelJS from 'exceljs'

export interface ExportVehicle {
    plate_number: string | null
    brand: string | null
    model: string | null
    production_year: number | null
    engine_capacity: number | null
    load_capacity: number | null
    branchName?: string | null
}

export interface ExportOptions {
    title: string      // np. „Wrocław”, „Lotniska”
    dateLabel: string  // np. „11.11.2026”
    withBranch: boolean // kolumna „Oddział”, gdy wykaz obejmuje kilka oddziałów (nigdy dla lotnisk)
}

const FONT = { name: 'Arial', size: 10 }
const LINE = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
const BORDER = { top: LINE, left: LINE, bottom: LINE, right: LINE }

export async function buildVehiclesWorkbook(vehicles: ExportVehicle[], opts: ExportOptions): Promise<ArrayBuffer> {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'FleetManager'
    wb.calcProperties.fullCalcOnLoad = true

    const columns = [
        { header: 'Lp.', key: 'lp', width: 6, numeric: true },
        ...(opts.withBranch ? [{ header: 'Oddział', key: 'branch', width: 16, numeric: false }] : []),
        { header: 'Marka', key: 'brand', width: 16, numeric: false },
        { header: 'Model', key: 'model', width: 24, numeric: false },
        { header: 'Nr rej.', key: 'plate', width: 13, numeric: false },
        { header: 'Rok produkcji', key: 'year', width: 13, numeric: true },
        { header: 'Pojemność [cm³]', key: 'engine', width: 15, numeric: true },
        { header: 'Ładowność [kg]', key: 'load', width: 15, numeric: true },
    ]

    const ws = wb.addWorksheet(sheetName(opts.title), {
        views: [{ state: 'frozen', ySplit: 1 }],
        pageSetup: {
            paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
            printTitlesRow: '1:1', margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        },
        headerFooter: {
            oddHeader: `&L${escapeHeader(`Wykaz pojazdów – ${opts.title}`)}&Rstan na ${opts.dateLabel}`,
            oddFooter: '&RStrona &P z &N',
        },
    })
    ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width }))

    const header = ws.getRow(1)
    header.height = 28
    header.eachCell((cell, col) => {
        cell.font = { ...FONT, bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
        cell.border = BORDER
        cell.alignment = { vertical: 'middle', wrapText: true, horizontal: columns[col - 1].numeric ? 'right' : 'left' }
    })
    header.getCell(1).note = 'Lp. liczy się samo (formuła). Po usunięciu wiersza numeracja się poprawi.'

    vehicles.forEach((v, i) => {
        const row = ws.addRow({
            lp: { formula: 'ROW()-1', result: i + 1 },
            branch: v.branchName ?? null,
            brand: v.brand || null,
            model: v.model || null,
            plate: v.plate_number,
            year: v.production_year,
            engine: v.engine_capacity,
            load: v.load_capacity,
        })
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            const c = columns[col - 1]
            if (!c) return
            cell.font = { ...FONT, bold: c.key === 'plate' }
            cell.border = BORDER
            if (c.numeric) {
                cell.numFmt = '0'
                cell.alignment = { horizontal: 'right' }
            }
        })
    })

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(vehicles.length + 1, 2), column: columns.length } }
    return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

// Nazwa zakładki w Excelu: najwyżej 31 znaków, bez []:*?/\
function sheetName(title: string): string {
    return title.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Wykaz'
}

// W nagłówku wydruku „&” jest znakiem sterującym, więc dosłowny trzeba podwoić
function escapeHeader(text: string): string {
    return text.replace(/&/g, '&&')
}

const PL: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }

// Nazwa pliku bez polskich znaków i spacji, np. „Wykaz_pojazdow_Wroclaw_2026-11-11.xlsx”
export function exportFileName(title: string, isoDate: string): string {
    const ascii = title
        .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => {
            const low = PL[ch.toLowerCase()]
            return ch === ch.toLowerCase() ? low : low.toUpperCase()
        })
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    return `Wykaz_pojazdow_${ascii || 'pojazdy'}_${isoDate}.xlsx`
}
