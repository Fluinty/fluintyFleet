import Link from "next/link"
import { cn } from "@/lib/utils"
import type { VehiclesTab } from "@/lib/vehicles-list"

const LABELS: Record<VehiclesTab, string> = {
    wszystkie: "Wszystkie",
    lotnisko: "Lotnisko",
    podwykonawcy: "Podwykonawcy",
}

interface VehiclesTabsProps {
    current: VehiclesTab
    links: { tab: VehiclesTab; href: string }[]
}

// Grupy na liście pojazdów jako linki: zakładka siedzi w adresie (?tab=…), więc filtry, sortowanie
// i przycisk Wstecz działają jak dotąd, a lista renderuje się po stronie serwera.
export function VehiclesTabs({ current, links }: VehiclesTabsProps) {
    return (
        <nav
            aria-label="Grupy pojazdów"
            className="inline-flex h-10 w-fit items-center rounded-md bg-muted p-1 text-muted-foreground"
        >
            {links.map(({ tab, href }) => (
                <Link
                    key={tab}
                    href={href}
                    aria-current={tab === current ? "page" : undefined}
                    className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        tab === current ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
                    )}
                >
                    {LABELS[tab]}
                </Link>
            ))}
        </nav>
    )
}
