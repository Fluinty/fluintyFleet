"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { format, startOfMonth, subMonths } from "date-fns"
import { pl } from "date-fns/locale"
import { CalendarDays, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Branch {
    id: string
    name: string
    code: string
}

interface StatisticsFiltersProps {
    branches: Branch[]
    showBranchFilter?: boolean
}

// Generate last 12 months for selection
function generateMonthOptions() {
    const months = []
    for (let i = 0; i < 12; i++) {
        const date = subMonths(new Date(), i)
        months.push({
            value: format(startOfMonth(date), 'yyyy-MM-dd'),
            label: format(date, 'LLLL yyyy', { locale: pl })
        })
    }
    return months
}

export function StatisticsFilters({ branches, showBranchFilter = true }: StatisticsFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const [month, setMonth] = useState(searchParams.get("month") || currentMonth)
    const [branch, setBranch] = useState(searchParams.get("branch") || "all")

    const monthOptions = generateMonthOptions()

    useEffect(() => {
        const params = new URLSearchParams()

        if (month && month !== currentMonth) {
            params.set("month", month)
        }
        if (branch && branch !== "all") {
            params.set("branch", branch)
        }

        const queryString = params.toString()
        router.push(queryString ? `?${queryString}` : "/statistics")
    }, [month, branch, router, currentMonth])

    const handleClearFilters = () => {
        setMonth(currentMonth)
        setBranch("all")
    }

    const hasActiveFilters = month !== currentMonth || branch !== "all"

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-[180px] bg-white/80 border-slate-200">
                        <SelectValue placeholder="Wybierz miesiąc" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Branch Selector */}
            {showBranchFilter && (
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <Select value={branch} onValueChange={setBranch}>
                        <SelectTrigger className="w-[180px] bg-white/80 border-slate-200">
                            <SelectValue placeholder="Wszystkie oddziały" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Wszystkie oddziały</SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b.id} value={b.code}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-slate-500 hover:text-slate-700"
                >
                    Wyczyść filtry
                </Button>
            )}
        </div>
    )
}
