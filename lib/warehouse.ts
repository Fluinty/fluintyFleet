// Produkty, które wolno przypisać na magazyn zamiast do konkretnego pojazdu.
// Lista z maila Artura Przenniaka (21.10.2026): na razie TYLKO olej silnikowy i AdBlue.
// Dopasowanie po nazwie pozycji z faktury, bez względu na wielkość liter. Nazwy z InterCars
// bywają bez słowa "olej" (np. "CASTROL EDGE 5W-30 LL 60L"), dlatego łapiemy też klasę lepkości
// olejów silnikowych (0W…25W). Oleje przekładniowe (75W-90), hydrauliczne, do skrzyni i do
// wspomagania NIE kwalifikują się, tak samo części układu AdBlue (czujniki, pompy, filtry).

export interface WarehouseProductRule {
    label: string
    matches: (name: string) => boolean
}

// "OLEJ SILNIKOWY", "OLEJE SILNIKOWE", "OLEJU SILNIKOWEGO", "OLEJ SILN."
const MOTOR_OIL_WORD = /\bolej\w*\s*[-.]?\s*siln/i
// 0W-20 … 25W-60, także sklejone "5W30LL"; bez spacji jako separatora, bo "P21/5W 12V" to żarówka
const MOTOR_OIL_GRADE = /\b(?:0|5|10|15|20|25)w[-/]?(?:8|12|16|20|30|40|50|60)(?!\d)/i
const NOT_MOTOR_OIL = /przek[łl]adn|hydraul|skrzyn|wspomag|\batf\b|\bgl-?[45]\b/i

const ADBLUE = /\bad\s*-?\s*blue|\badblu/i
const NOT_ADBLUE = /czujnik|pompa|wtrysk|zbiornik|grza[łl]k|przew[óo]d|modu[łl]|dozuj|zaw[óo]r|filtr|sond|sterownik|\bnox\b/i

export const WAREHOUSE_PRODUCT_RULES: WarehouseProductRule[] = [
    {
        label: "olej silnikowy",
        matches: (n) => (MOTOR_OIL_WORD.test(n) || MOTOR_OIL_GRADE.test(n)) && !NOT_MOTOR_OIL.test(n),
    },
    {
        label: "AdBlue",
        matches: (n) => ADBLUE.test(n) && !NOT_ADBLUE.test(n),
    },
]

export function warehouseRuleFor(name: string | null | undefined): WarehouseProductRule | null {
    if (!name) return null
    return WAREHOUSE_PRODUCT_RULES.find((rule) => rule.matches(name)) ?? null
}

export function isWarehouseEligible(name: string | null | undefined): boolean {
    return warehouseRuleFor(name) !== null
}

export const WAREHOUSE_LABEL = "Magazyn"
