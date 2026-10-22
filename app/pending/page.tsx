import { createClient } from '@/utils/supabase/server'
import { fetchAll } from '@/utils/supabase/fetch-all'
import { pluralPl } from '@/utils/format'
import { PendingItemsTable } from '@/components/pending/PendingItemsTable'

export default async function PendingPage() {
    const supabase = await createClient()

    // Get current user and their profile
    const { data: { user } } = await supabase.auth.getUser()
    let userBranchIds: string[] = []
    let isAdmin = true

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        isAdmin = profile?.role === 'admin'

        // If manager, get their branch IDs from manager_branches table
        if (profile?.role === 'manager') {
            const { data: managerBranches } = await supabase
                .from('manager_branches')
                .select('branch_id')
                .eq('profile_id', user.id)

            userBranchIds = managerBranches?.map(mb => mb.branch_id) || []
        }
    }

    // Fetch pending items (new item-level view) - filtered by branch for managers
    // Stronicowane (fetchAll): kolejka potrafi przekroczyć 1000 pozycji
    const pendingItems = await fetchAll(() => {
        let q = supabase
            .from('unresolved_pending_items')
            .select('*')
        if (!isAdmin && userBranchIds.length > 0) {
            q = q.in('branch_id', userBranchIds)
        }
        return q.order('order_date', { ascending: false }).order('item_id')
    })

    // Fetch active vehicles for the resolver dropdown - filtered by branch for managers
    let vehiclesQuery = supabase
        .from('vehicles')
        .select('id, plate_number, branch_id')
        .eq('is_active', true)
        .order('plate_number', { ascending: true })

    if (!isAdmin && userBranchIds.length > 0) {
        vehiclesQuery = vehiclesQuery.in('branch_id', userBranchIds)
    }

    const { data: vehicles } = await vehiclesQuery

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Wymagana Weryfikacja</h2>
                {pendingItems && pendingItems.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                        {pendingItems.length} {pluralPl(pendingItems.length, ['pozycja', 'pozycje', 'pozycji'])}
                    </span>
                )}
            </div>

            <div className="flex flex-col space-y-4">
                <PendingItemsTable items={pendingItems || []} vehicles={vehicles || []} />
            </div>
        </div>
    )
}
