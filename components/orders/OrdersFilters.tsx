"use client"

import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { X } from "lucide-react"

interface Branch {
    id: string
    name: string
}

interface OrdersFiltersProps {
    branches: Branch[]
    showBranchFilter?: boolean
}

export function OrdersFilters({ branches, showBranchFilter = true }: OrdersFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState(searchParams.get("search") || "")
    const [branch, setBranch] = useState(searchParams.get("branch") || "all")
    const [status, setStatus] = useState(searchParams.get("status") || "ALL")
    const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "")
    const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "")

    const debouncedSearch = useDebounce(search, 300)

    useEffect(() => {
        const currentParams = new URLSearchParams(Array.from(searchParams.entries()))

        if (debouncedSearch) currentParams.set("search", debouncedSearch)
        else currentParams.delete("search")

        if (branch && branch !== "all") currentParams.set("branch", branch)
        else currentParams.delete("branch")

        if (status && status !== "ALL") currentParams.set("status", status)
        else currentParams.delete("status")

        if (dateFrom) currentParams.set("dateFrom", dateFrom)
        else currentParams.delete("dateFrom")

        if (dateTo) currentParams.set("dateTo", dateTo)
        else currentParams.delete("dateTo")

        const searchString = currentParams.toString()
        const queryString = searchString ? `?${searchString}` : ""

        if (queryString !== window.location.search) {
            router.push(queryString)
        }
    }, [debouncedSearch, branch, status, dateFrom, dateTo, router]) // Removed searchParams to prevent loop

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-end flex-wrap">
            <div className="w-full md:w-auto">
                <label className="text-xs font-medium mb-1 block">Szukaj</label>
                <Input
                    placeholder="Nr zamówienia, opis..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-[200px]"
                />
            </div>

            {showBranchFilter && (
                <div className="w-full md:w-auto">
                    <label className="text-xs font-medium mb-1 block">Oddział</label>
                    <Select value={branch} onValueChange={setBranch}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Wybierz oddział" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Wszystkie oddziały</SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="w-full md:w-auto">
                <label className="text-xs font-medium mb-1 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full md:w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Wszystkie</SelectItem>
                        <SelectItem value="completed">Przypisane</SelectItem>
                        <SelectItem value="pending">Do przypisania</SelectItem>
                        <SelectItem value="void">Nieaktualne</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-full md:w-auto">
                <label className="text-xs font-medium mb-1 block">Od</label>
                <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full md:w-[140px]"
                />
            </div>

            <div className="w-full md:w-auto">
                <label className="text-xs font-medium mb-1 block">Do</label>
                <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full md:w-[140px]"
                />
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="mb-0.5"
                onClick={() => {
                    setSearch("")
                    setBranch("all")
                    setStatus("ALL")
                    setDateFrom("")
                    setDateTo("")
                }}
                title="Wyczyść filtry"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}
