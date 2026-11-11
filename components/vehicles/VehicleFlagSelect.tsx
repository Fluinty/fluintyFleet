'use client'

import { useState } from 'react'
import { updateVehicleAirportStatus, updateVehicleSubcontractorStatus } from '@/app/actions/vehicles'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

type FlagConfig = {
    save: (vehicleId: string, value: boolean) => Promise<{ success: boolean; error?: string }>
    saved: (value: boolean) => string
}

// Pola Tak/Nie na karcie auta: każde ma swoją akcję serwera i opis po zapisie.
const FLAGS: Record<'airport' | 'subcontractor', FlagConfig> = {
    airport: {
        save: updateVehicleAirportStatus,
        saved: () => 'Status lotniska został zaktualizowany',
    },
    subcontractor: {
        save: updateVehicleSubcontractorStatus,
        saved: (value) => value
            ? 'Auto podwykonawcy: bez przypomnień o terminach'
            : 'Auto wraca do przypomnień o terminach',
    },
}

interface VehicleFlagSelectProps {
    vehicleId: string
    flag: keyof typeof FLAGS
    initialValue: boolean | null
}

export function VehicleFlagSelect({ vehicleId, flag, initialValue }: VehicleFlagSelectProps) {
    const [value, setValue] = useState(initialValue?.toString() ?? 'false')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    async function handleChange(newValue: string) {
        const previousValue = value
        setLoading(true)
        setValue(newValue)

        const result = await FLAGS[flag].save(vehicleId, newValue === 'true')

        if (result.success) {
            toast({
                title: 'Zapisano',
                description: FLAGS[flag].saved(newValue === 'true'),
            })
        } else {
            toast({
                title: 'Błąd',
                description: result.error || 'Nie udało się zapisać zmian',
                variant: 'destructive',
            })
            // Po błędzie wracamy do poprzedniej wartości
            setValue(previousValue)
        }

        setLoading(false)
    }

    return (
        <div className="w-24">
            <Select
                value={value}
                onValueChange={handleChange}
                disabled={loading}
            >
                <SelectTrigger className="h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="true">Tak</SelectItem>
                    <SelectItem value="false">Nie</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
