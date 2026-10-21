export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            branches: {
                Row: {
                    code: string
                    created_at: string | null
                    emails: string[] | null
                    id: string
                    intercars_code: string | null
                    is_active: boolean | null
                    name: string
                    updated_at: string | null
                }
                Insert: {
                    code: string
                    created_at?: string | null
                    emails?: string[] | null
                    id?: string
                    intercars_code?: string | null
                    is_active?: boolean | null
                    name: string
                    updated_at?: string | null
                }
                Update: {
                    code?: string
                    created_at?: string | null
                    emails?: string[] | null
                    id?: string
                    intercars_code?: string | null
                    is_active?: boolean | null
                    name?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            budget_alerts: {
                Row: {
                    acknowledged: boolean | null
                    acknowledged_at: string | null
                    acknowledged_by: string | null
                    acknowledgment_notes: string | null
                    actual_value: number | null
                    alert_type: string
                    created_at: string | null
                    currency_code: string | null
                    details: Json | null
                    id: string
                    notification_sent_to: string[] | null
                    notified_at: string | null
                    period_end: string | null
                    period_start: string | null
                    threshold_value: number | null
                    vehicle_id: string | null
                }
                Insert: {
                    acknowledged?: boolean | null
                    acknowledged_at?: string | null
                    acknowledged_by?: string | null
                    acknowledgment_notes?: string | null
                    actual_value?: number | null
                    alert_type: string
                    created_at?: string | null
                    currency_code?: string | null
                    details?: Json | null
                    id?: string
                    notification_sent_to?: string[] | null
                    notified_at?: string | null
                    period_end?: string | null
                    period_start?: string | null
                    threshold_value?: number | null
                    vehicle_id?: string | null
                }
                Update: {
                    acknowledged?: boolean | null
                    acknowledged_at?: string | null
                    acknowledged_by?: string | null
                    acknowledgment_notes?: string | null
                    actual_value?: number | null
                    alert_type?: string
                    created_at?: string | null
                    currency_code?: string | null
                    details?: Json | null
                    id?: string
                    notification_sent_to?: string[] | null
                    notified_at?: string | null
                    period_end?: string | null
                    period_start?: string | null
                    threshold_value?: number | null
                    vehicle_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "budget_alerts_vehicle_id_fkey"
                        columns: ["vehicle_id"]
                        isOneToOne: false
                        referencedRelation: "vehicles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            devices: {
                Row: {
                    branch_id: string | null
                    created_at: string | null
                    decision_expiry_date: string | null
                    device_type: string
                    id: string
                    is_active: boolean | null
                    last_inspection_date: string | null
                    name: string | null
                    next_inspection_date: string | null
                    notes: string | null
                    udt_number: string
                    updated_at: string | null
                    vehicle_id: string | null
                }
                Insert: {
                    branch_id?: string | null
                    created_at?: string | null
                    decision_expiry_date?: string | null
                    device_type: string
                    id?: string
                    is_active?: boolean | null
                    last_inspection_date?: string | null
                    name?: string | null
                    next_inspection_date?: string | null
                    notes?: string | null
                    udt_number: string
                    updated_at?: string | null
                    vehicle_id?: string | null
                }
                Update: {
                    branch_id?: string | null
                    created_at?: string | null
                    decision_expiry_date?: string | null
                    device_type?: string
                    id?: string
                    is_active?: boolean | null
                    last_inspection_date?: string | null
                    name?: string | null
                    next_inspection_date?: string | null
                    notes?: string | null
                    udt_number?: string
                    updated_at?: string | null
                    vehicle_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "devices_vehicle_id_fkey"
                        columns: ["vehicle_id"]
                        isOneToOne: false
                        referencedRelation: "vehicles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "devices_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                ]
            }
            manager_branches: {
                Row: {
                    assigned_at: string | null
                    assigned_by: string | null
                    branch_id: string
                    id: string
                    profile_id: string
                }
                Insert: {
                    assigned_at?: string | null
                    assigned_by?: string | null
                    branch_id: string
                    id?: string
                    profile_id: string
                }
                Update: {
                    assigned_at?: string | null
                    assigned_by?: string | null
                    branch_id?: string
                    id?: string
                    profile_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "manager_branches_assigned_by_fkey"
                        columns: ["assigned_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "manager_branches_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "manager_branches_profile_id_fkey"
                        columns: ["profile_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_items: {
                Row: {
                    accepted_quantity: number | null
                    category: string | null
                    collected_quantity: number | null
                    created_at: string | null
                    delivery_ids: string[] | null
                    description: string | null
                    eans: string[] | null
                    id: string
                    index_number: string | null
                    is_warehouse: boolean
                    missing_quantity: number | null
                    name: string | null
                    order_id: string
                    packaged_quantity: number | null
                    required_quantity: number | null
                    resolved: boolean | null
                    resolved_at: string | null
                    resolved_by: string | null
                    sku: string | null
                    total_gross: number | null
                    total_net: number | null
                    unit_price_gross: number | null
                    unit_price_net: number | null
                    vehicle_id: string | null
                }
                Insert: {
                    accepted_quantity?: number | null
                    category?: string | null
                    collected_quantity?: number | null
                    created_at?: string | null
                    delivery_ids?: string[] | null
                    description?: string | null
                    eans?: string[] | null
                    id?: string
                    index_number?: string | null
                    is_warehouse?: boolean
                    missing_quantity?: number | null
                    name?: string | null
                    order_id: string
                    packaged_quantity?: number | null
                    required_quantity?: number | null
                    resolved?: boolean | null
                    resolved_at?: string | null
                    resolved_by?: string | null
                    sku?: string | null
                    total_gross?: number | null
                    total_net?: number | null
                    unit_price_gross?: number | null
                    unit_price_net?: number | null
                    vehicle_id?: string | null
                }
                Update: {
                    accepted_quantity?: number | null
                    category?: string | null
                    collected_quantity?: number | null
                    created_at?: string | null
                    delivery_ids?: string[] | null
                    description?: string | null
                    eans?: string[] | null
                    id?: string
                    index_number?: string | null
                    is_warehouse?: boolean
                    missing_quantity?: number | null
                    name?: string | null
                    order_id?: string
                    packaged_quantity?: number | null
                    required_quantity?: number | null
                    resolved?: boolean | null
                    resolved_at?: string | null
                    resolved_by?: string | null
                    sku?: string | null
                    total_gross?: number | null
                    total_net?: number | null
                    unit_price_gross?: number | null
                    unit_price_net?: number | null
                    vehicle_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_vehicle_id_fkey"
                        columns: ["vehicle_id"]
                        isOneToOne: false
                        referencedRelation: "vehicles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            orders: {
                Row: {
                    amount: number
                    branch_code: string | null
                    branch_id: string | null
                    created_at: string | null
                    currency: string | null
                    description: string | null
                    fiscal_document_number: string | null
                    id: string
                    intercars_id: string | null
                    is_manual: boolean
                    order_date: string
                    raw_comment: string | null
                    status: string
                    supplier: string | null
                    total_gross: number | null
                    total_net: number | null
                    updated_at: string | null
                }
                Insert: {
                    amount: number
                    branch_code?: string | null
                    branch_id?: string | null
                    created_at?: string | null
                    currency?: string | null
                    description?: string | null
                    fiscal_document_number?: string | null
                    id?: string
                    intercars_id?: string | null
                    is_manual?: boolean
                    order_date: string
                    raw_comment?: string | null
                    status?: string
                    supplier?: string | null
                    total_gross?: number | null
                    total_net?: number | null
                    updated_at?: string | null
                }
                Update: {
                    amount?: number
                    branch_code?: string | null
                    branch_id?: string | null
                    created_at?: string | null
                    currency?: string | null
                    description?: string | null
                    fiscal_document_number?: string | null
                    id?: string
                    intercars_id?: string | null
                    is_manual?: boolean
                    order_date?: string
                    raw_comment?: string | null
                    status?: string
                    supplier?: string | null
                    total_gross?: number | null
                    total_net?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "orders_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    branch_id: string | null
                    id: string
                    role: string
                }
                Insert: {
                    branch_id?: string | null
                    id: string
                    role: string
                }
                Update: {
                    branch_id?: string | null
                    id?: string
                    role?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sync_log: {
                Row: {
                    completed_at: string | null
                    created_at: string | null
                    error_message: string | null
                    errors_count: number | null
                    id: string
                    params: Json | null
                    records_created: number | null
                    records_fetched: number | null
                    records_skipped: number | null
                    records_updated: number | null
                    started_at: string | null
                    status: string | null
                    sync_type: string
                }
                Insert: {
                    completed_at?: string | null
                    created_at?: string | null
                    error_message?: string | null
                    errors_count?: number | null
                    id?: string
                    params?: Json | null
                    records_created?: number | null
                    records_fetched?: number | null
                    records_skipped?: number | null
                    records_updated?: number | null
                    started_at?: string | null
                    status?: string | null
                    sync_type: string
                }
                Update: {
                    completed_at?: string | null
                    created_at?: string | null
                    error_message?: string | null
                    errors_count?: number | null
                    id?: string
                    params?: Json | null
                    records_created?: number | null
                    records_fetched?: number | null
                    records_skipped?: number | null
                    records_updated?: number | null
                    started_at?: string | null
                    status?: string | null
                    sync_type?: string
                }
                Relationships: []
            }
            system_settings: {
                Row: {
                    created_at: string | null
                    id: string
                    key: string
                    updated_at: string | null
                    value: Json
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    key: string
                    updated_at?: string | null
                    value?: Json
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    key?: string
                    updated_at?: string | null
                    value?: Json
                }
                Relationships: []
            }
            vehicles: {
                Row: {
                    brand: string | null
                    branch_id: string | null
                    created_at: string | null
                    created_by: string | null
                    description: string | null
                    engine_capacity: number | null
                    id: string
                    inspection_document_url: string | null
                    insurance_document_url: string | null
                    is_active: boolean | null
                    is_airport: boolean | null
                    is_leasing: boolean | null
                    key: string
                    last_sync_at: string | null
                    leasing_company: string | null
                    leasing_end_date: string | null
                    load_capacity: number | null
                    model: string | null
                    next_inspection_date: string | null
                    next_insurance_date: string | null
                    next_tacho_calibration_date: string | null
                    next_udo_inspection_date: string | null
                    notes: string | null
                    plate_number: string
                    production_year: number | null
                    status: string
                    updated_at: string | null
                    updated_by: string | null
                    value: Json
                    vehicle_category: string | null
                    vin: string | null
                }
                Insert: {
                    brand?: string | null
                    branch_id?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    engine_capacity?: number | null
                    id?: string
                    inspection_document_url?: string | null
                    insurance_document_url?: string | null
                    is_active?: boolean | null
                    is_airport?: boolean | null
                    is_leasing?: boolean | null
                    key?: string
                    last_sync_at?: string | null
                    leasing_company?: string | null
                    leasing_end_date?: string | null
                    load_capacity?: number | null
                    model?: string | null
                    next_inspection_date?: string | null
                    next_insurance_date?: string | null
                    next_tacho_calibration_date?: string | null
                    next_udo_inspection_date?: string | null
                    notes?: string | null
                    plate_number: string
                    production_year?: number | null
                    status?: string
                    updated_at?: string | null
                    updated_by?: string | null
                    value?: Json
                    vehicle_category?: string | null
                    vin?: string | null
                }
                Update: {
                    brand?: string | null
                    branch_id?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    engine_capacity?: number | null
                    id?: string
                    inspection_document_url?: string | null
                    insurance_document_url?: string | null
                    is_active?: boolean | null
                    is_airport?: boolean | null
                    is_leasing?: boolean | null
                    key?: string
                    last_sync_at?: string | null
                    leasing_company?: string | null
                    leasing_end_date?: string | null
                    load_capacity?: number | null
                    model?: string | null
                    next_inspection_date?: string | null
                    next_insurance_date?: string | null
                    next_tacho_calibration_date?: string | null
                    next_udo_inspection_date?: string | null
                    notes?: string | null
                    plate_number?: string
                    production_year?: number | null
                    status?: string
                    updated_at?: string | null
                    updated_by?: string | null
                    value?: Json
                    vehicle_category?: string | null
                    vin?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "vehicles_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
