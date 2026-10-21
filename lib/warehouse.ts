// Produkty, które wolno przypisać na magazyn zamiast do konkretnego pojazdu.
// Lista z maila Artura Przenniaka (21.10.2026): na razie tylko olej silnikowy i AdBlue.
// Dopasowanie po nazwie pozycji z faktury, bez względu na wielkość liter. Nazwy z InterCars
// bywają bez słowa "olej" (np. "CASTROL EDGE 5W-30 LL 60L"), dlatego łapiemy też klasę lepkości.

export interface WarehouseProductRule {
    label: string
    test: RegExp
}

export const WAREHOUSE_PRODUCT_RULES: WarehouseProductRule[] = [
    { label: "olej silnikowy", test: /\bolej\b/i },
    { label: "olej silnikowy", test: /\b\d{1,2}w-?\d{2}\b/i }, // 5W30, 10W-40, 0W20
    { label: "AdBlue", test: /ad\s*-?\s*blue|adblu/i },
]

export function warehouseRuleFor(name: string | null | undefined): WarehouseProductRule | null {
    if (!name) return null
    return WAREHOUSE_PRODUCT_RULES.find((rule) => rule.test.test(name)) ?? null
}

export function isWarehouseEligible(name: string | null | undefined): boolean {
    return warehouseRuleFor(name) !== null
}

export const WAREHOUSE_LABEL = "Magazyn"
