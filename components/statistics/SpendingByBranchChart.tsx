"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/utils/format"

interface BranchSpending {
    branch_code: string
    branch_name: string
    assigned: number
    queue: number
    warehouse: number
}

interface SpendingByBranchChartProps {
    data: BranchSpending[]
}

// Jeden słupek na oddział, złożony z trzech koszyków; suma słupka = zakupy oddziału
const SERIES = [
    { key: "assigned", name: "Przypisane do pojazdów", color: "#14b8a6" },   // teal-500
    { key: "queue", name: "Do weryfikacji", color: "#f59e0b" },              // amber-500
    { key: "warehouse", name: "Magazyn", color: "#6366f1" },                 // indigo-500
] as const

export function SpendingByBranchChart({ data }: SpendingByBranchChartProps) {
    if (data.length === 0) {
        return (
            <div className="rounded-xl md:rounded-2xl bg-white/80 border border-slate-200/60 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Zakupy wg Oddziału</h3>
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                    Brak danych dla wybranego okresu
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-xl md:rounded-2xl bg-white/80 border border-slate-200/60 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Zakupy wg Oddziału</h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <XAxis
                            type="number"
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <YAxis
                            type="category"
                            dataKey="branch_name"
                            width={120}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#334155', fontSize: 13, fontWeight: 500 }}
                        />
                        <Tooltip
                            formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {SERIES.map((s) => (
                            <Bar
                                key={s.key}
                                dataKey={s.key}
                                name={s.name}
                                stackId="zakupy"
                                fill={s.color}
                                maxBarSize={32}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
