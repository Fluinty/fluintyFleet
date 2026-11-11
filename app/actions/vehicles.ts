'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Updates the airport status for a vehicle
 * @param vehicleId - UUID of the vehicle
 * @param isAirport - New airport status (true/false)
 * @returns Success status and optional error message
 */
export async function updateVehicleAirportStatus(
    vehicleId: string,
    isAirport: boolean
) {
    try {
        const supabase = await createClient()

        // Update vehicle airport status
        console.log('[UPDATE] Attempting to update vehicle:', vehicleId, 'to is_airport:', isAirport)

        const { data, error } = await supabase
            .from('vehicles')
            .update({
                is_airport: isAirport,
                updated_at: new Date().toISOString()
            })
            .eq('id', vehicleId)
            .select()

        console.log('[UPDATE] Result:', { data, error })

        if (error) {
            console.error('[UPDATE ERROR] Error updating airport status:', error)
            return {
                success: false,
                error: error.message
            }
        }

        if (!data || data.length === 0) {
            console.error('[UPDATE ERROR] No rows updated - possible RLS policy issue')
            return {
                success: false,
                error: 'Brak uprawnień do edycji tego pojazdu'
            }
        }

        console.log('[UPDATE SUCCESS] Vehicle updated:', data[0])

        // Revalidate the vehicle details page to reflect changes
        revalidatePath(`/vehicles/${vehicleId}`)

        return { success: true }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: 'Wystąpił nieoczekiwany błąd'
        }
    }
}

/**
 * Updates the branch (city) for a vehicle
 * @param vehicleId - UUID of the vehicle
 * @param newBranchId - UUID of the target branch
 * @returns Success status and redirect flag
 */
export async function updateVehicleBranch(
    vehicleId: string,
    newBranchId: string
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Nie zalogowano' }
        }

        console.log('[BRANCH UPDATE] Attempting to transfer vehicle:', vehicleId, 'to branch:', newBranchId)

        // Update vehicle branch (RLS will handle access control on read)
        // Manager can transfer to any branch, but may lose access after transfer
        const { data, error } = await supabase
            .from('vehicles')
            .update({
                branch_id: newBranchId,
                updated_at: new Date().toISOString()
            })
            .eq('id', vehicleId)
            .select()

        console.log('[BRANCH UPDATE] Result:', { data, error })

        if (error) {
            console.error('[BRANCH UPDATE ERROR]', error)
            return {
                success: false,
                error: error.message
            }
        }

        if (!data || data.length === 0) {
            console.error('[BRANCH UPDATE] No rows updated - possible RLS issue')
            return {
                success: false,
                error: 'Nie udało się zaktualizować pojazdu'
            }
        }

        console.log('[BRANCH UPDATE SUCCESS] Vehicle transferred to new branch')

        // Revalidate both pages
        revalidatePath('/vehicles')
        revalidatePath('/')

        return { success: true, shouldRedirect: true }
    } catch (error) {
        console.error('[BRANCH UPDATE] Unexpected error:', error)
        return {
            success: false,
            error: 'Wystąpił nieoczekiwany błąd'
        }
    }
}

/**
 * Gets list of branches that the current user has access to
 * @returns Array of branches user can assign vehicles to
 */
export async function getUserBranches() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return []

        // Everyone sees all active branches
        // Managers can transfer to any branch, but RLS will filter access on read
        const { data } = await supabase
            .from('branches')
            .select('id, name')
            .eq('is_active', true)
            .order('name')

        return data || []
    } catch (error) {
        console.error('Error fetching user branches:', error)
        return []
    }
}

/**
 * Oznacza auto jako auto podwykonawcy albo zdejmuje oznaczenie.
 * Tylko admin: auto podwykonawcy wypada z przypomnień o przeglądach, polisach i UDT (n8n).
 * @param vehicleId - UUID of the vehicle
 * @param isSubcontractor - true = auto podwykonawcy
 */
export async function updateVehicleSubcontractorStatus(
    vehicleId: string,
    isSubcontractor: boolean
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Nie zalogowano' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: 'Auto podwykonawcy może oznaczyć tylko administrator' }
        }

        const { data, error } = await supabase
            .from('vehicles')
            .update({
                is_subcontractor: isSubcontractor,
                updated_at: new Date().toISOString()
            })
            .eq('id', vehicleId)
            .select('id')

        if (error) {
            console.error('[SUBCONTRACTOR UPDATE ERROR]', error)
            return { success: false, error: error.message }
        }

        if (!data || data.length === 0) {
            return { success: false, error: 'Brak uprawnień do edycji tego pojazdu' }
        }

        revalidatePath(`/vehicles/${vehicleId}`)
        revalidatePath('/vehicles')

        return { success: true }
    } catch (error) {
        console.error('[SUBCONTRACTOR UPDATE] Unexpected error:', error)
        return { success: false, error: 'Wystąpił nieoczekiwany błąd' }
    }
}
