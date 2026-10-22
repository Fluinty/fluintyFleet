export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return "0,00 PLN"
    return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: "PLN",
    }).format(amount)
}

/**
 * Polska liczba mnoga: pluralPl(3, ['pozycja', 'pozycje', 'pozycji']) -> 'pozycje'.
 * 1 -> forma 1; 2–4 (poza 12–14) -> forma 2; reszta -> forma 3.
 */
export function pluralPl(n: number, forms: [string, string, string]): string {
    const abs = Math.abs(n)
    if (abs === 1) return forms[0]
    const last = abs % 10
    const lastTwo = abs % 100
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1]
    return forms[2]
}

export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}
