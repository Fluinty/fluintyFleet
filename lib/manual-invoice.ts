// Faktura ręczna: wspólne reguły dla dodawania i edycji (app/actions/add-manual-invoice.ts,
// edit-manual-invoice.ts) i dla formularzy (components/vehicles/*InvoiceModal.tsx).
// Każda pozycja faktury trafia na konkretne auto (id pojazdu) albo na magazyn. Na magazyn wolno
// wysłać tylko produkty z listy w lib/warehouse.ts (olej silnikowy, AdBlue, opony); beczka oleju
// idzie na magazyn w całości, nie dzielimy jej między auta (Adam, 22.10.2026).

import { isWarehouseEligible, WAREHOUSE_PRODUCTS_LABEL } from "@/lib/warehouse"
import { pluralPl } from "@/utils/format"

export const WAREHOUSE_TARGET = "warehouse"

export interface ManualInvoiceItemInput {
    name: string
    sku?: string
    quantity: number
    unitPriceNet: number
    vatRate: number
    /** id pojazdu albo WAREHOUSE_TARGET */
    target: string
}

export interface ManualInvoiceInput {
    orderDate: string
    supplier: string
    invoiceNumber: string
    items: ManualInvoiceItemInput[]
}

export interface InvoiceVehicleOption {
    id: string
    plate_number: string
    /** false = auto nieaktywne (pokazujemy z dopiskiem, ale da się je wybrać tylko gdy już tam coś leży) */
    is_active?: boolean
}

// Jedna pozycja na 0 %: „zw.” i „0%” to w zapisie to samo, a dwa wpisy o tej samej wartości
// psuły select (Radix zaznaczał oba i w polu stało „0%zw.”).
export const VAT_RATE_OPTIONS = [
    { label: "23%", value: 23 },
    { label: "8%", value: 8 },
    { label: "5%", value: 5 },
    { label: "0% / zw.", value: 0 },
] as const
export const VAT_RATES: readonly number[] = VAT_RATE_OPTIONS.map(o => o.value)

// Sufity nie z cennika, tylko z kolumn w bazie: required_quantity to integer, kwoty to numeric(10,2),
// czyli najwyżej 99 999 999,99. Bez tego baza odrzuciłaby zapis dopiero przy nagłówku, po części operacji.
export const MAX_QUANTITY = 1_000_000
export const MAX_UNIT_PRICE_NET = 10_000_000
export const MAX_AMOUNT = 99_999_999

export function isWarehouseTarget(target: string | null | undefined): boolean {
    return target === WAREHOUSE_TARGET
}

function itemLabel(item: ManualInvoiceItemInput): string {
    return item.name?.trim() ? `„${item.name.trim()}”` : "bez nazwy"
}

/** Sprawdzenie samej pozycji (nazwa, ilość, cena, VAT) niezależnie od celu; null gdy wszystko gra. */
export function itemError(item: ManualInvoiceItemInput): string | null {
    const label = itemLabel(item)
    if (!item.name || !item.name.trim()) return "Każda pozycja musi mieć nazwę."
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        return `Pozycja ${label}: ilość musi być liczbą całkowitą od 1 do ${MAX_QUANTITY.toLocaleString("pl-PL")}.`
    }
    const unitPriceNet = Number(item.unitPriceNet)
    if (!Number.isFinite(unitPriceNet) || unitPriceNet < 0 || unitPriceNet > MAX_UNIT_PRICE_NET) {
        return `Pozycja ${label}: cena netto musi być liczbą od 0 do ${MAX_UNIT_PRICE_NET.toLocaleString("pl-PL")} zł.`
    }
    const vatRate = Number(item.vatRate)
    if (!VAT_RATES.includes(vatRate)) {
        return `Pozycja ${label}: stawka VAT musi być jedną z: ${VAT_RATE_OPTIONS.map(o => o.label).join(", ")}.`
    }
    if (unitPriceNet * quantity * (1 + vatRate / 100) > MAX_AMOUNT) {
        return `Pozycja ${label}: wartość pozycji przekracza ${MAX_AMOUNT.toLocaleString("pl-PL")} zł. Sprawdź ilość i cenę.`
    }
    return null
}

/** Suma faktury musi zmieścić się w kolumnie kwoty; null gdy wszystko gra. */
export function invoiceTotalError(totalGross: number): string | null {
    return totalGross > MAX_AMOUNT ? `Suma faktury przekracza ${MAX_AMOUNT.toLocaleString("pl-PL")} zł. Sprawdź ilości i ceny.` : null
}

/** Komunikat błędu dla pozycji, której cel jest niedozwolony; null gdy wszystko gra. */
export function targetError(item: ManualInvoiceItemInput, allowedVehicleIds: Set<string>): string | null {
    const label = itemLabel(item)
    if (isWarehouseTarget(item.target)) {
        if (!isWarehouseEligible(item.name)) {
            return `Pozycja ${label} nie może iść na magazyn. Na magazyn idą tylko: ${WAREHOUSE_PRODUCTS_LABEL}.`
        }
        return null
    }
    if (!item.target) {
        return `Pozycja ${label}: wybierz auto albo magazyn.`
    }
    if (!allowedVehicleIds.has(item.target)) {
        return `Pozycja ${label}: wybranego auta nie ma na liście aktywnych aut. Odśwież stronę i wybierz je jeszcze raz.`
    }
    return null
}

export function calculateInvoiceItem(item: ManualInvoiceItemInput) {
    const quantity = Number(item.quantity) || 0
    const unitPriceNet = Number(item.unitPriceNet) || 0
    const vatRate = Number(item.vatRate) || 0
    const unitPriceGross = unitPriceNet * (1 + vatRate / 100)
    return {
        name: item.name.trim(),
        sku: item.sku?.trim() || null,
        required_quantity: quantity,
        unit_price_net: unitPriceNet,
        unit_price_gross: Math.round(unitPriceGross * 100) / 100,
        total_net: Math.round(unitPriceNet * quantity * 100) / 100,
        total_gross: Math.round(unitPriceGross * quantity * 100) / 100,
    }
}

/**
 * Stawka VAT odtworzona z kwot (nie zapisujemy jej osobno). Najpierw z sum pozycji, bo tam błąd
 * zaokrąglenia do grosza dzieli się przez ilość; z cen jednostkowych dopiero w zapasie (przy cenie
 * poniżej złotówki 0,30 × 1,08 = 0,32 daje 7 %, a nie 8 %). Nieznana → 23.
 */
export function vatRateFromPrices(
    unitPriceNet: number | string | null | undefined,
    unitPriceGross: number | string | null | undefined,
    totalNet?: number | string | null,
    totalGross?: number | string | null,
): number {
    const pairs: Array<[number, number]> = [
        [Number(totalNet) || 0, Number(totalGross) || 0],
        [Number(unitPriceNet) || 0, Number(unitPriceGross) || 0],
    ]
    for (const [net, gross] of pairs) {
        if (net <= 0 || gross <= 0) continue
        const ratio = Math.round((gross / net - 1) * 100)
        if (VAT_RATES.includes(ratio)) return ratio
    }
    return 23
}

/** Ile pozycji poszło na to auto, na inne auta i na magazyn: do komunikatu po zapisie. */
export function summarizeTargets(items: ManualInvoiceItemInput[], pageVehicleId: string) {
    let here = 0, other = 0, warehouse = 0
    for (const item of items) {
        if (isWarehouseTarget(item.target)) warehouse++
        else if (item.target === pageVehicleId) here++
        else other++
    }
    return { here, other, warehouse }
}

/** Komunikat po zapisie: „3 pozycje: 2 na WX 1234, 1 na magazyn.” */
export function describeInvoiceSummary(summary: { here: number; other: number; warehouse: number }, plate: string): string {
    const parts: string[] = []
    if (summary.here) parts.push(`${summary.here} na ${plate}`)
    if (summary.other) parts.push(`${summary.other} na ${summary.other === 1 ? "inne auto" : "inne auta"}`)
    if (summary.warehouse) parts.push(`${summary.warehouse} na magazyn`)
    const total = summary.here + summary.other + summary.warehouse
    return `${total} ${pluralPl(total, ["pozycja", "pozycje", "pozycji"])}: ${parts.join(", ")}.`
}
