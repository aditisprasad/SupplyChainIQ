export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          impact_usd: number | null
          module: string
          severity: string
          status: string
          title: string
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          impact_usd?: number | null
          module: string
          severity?: string
          status?: string
          title: string
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          impact_usd?: number | null
          module?: string
          severity?: string
          status?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          event_id: string
          event_type: string
          payload: Json
          processing_status: string
          published_at: string | null
          source: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          event_id: string
          event_type: string
          payload?: Json
          processing_status?: string
          published_at?: string | null
          source?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          payload?: Json
          processing_status?: string
          published_at?: string | null
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          actual_units: number | null
          forecast_units: number
          generated_at: string
          id: string
          lower_bound_units: number
          model: string
          period_month: string
          product_id: string
          site_id: string
          upper_bound_units: number
          workspace_id: string
        }
        Insert: {
          actual_units?: number | null
          forecast_units: number
          generated_at?: string
          id?: string
          lower_bound_units?: number
          model?: string
          period_month: string
          product_id: string
          site_id: string
          upper_bound_units?: number
          workspace_id: string
        }
        Update: {
          actual_units?: number | null
          forecast_units?: number
          generated_at?: string
          id?: string
          lower_bound_units?: number
          model?: string
          period_month?: string
          product_id?: string
          site_id?: string
          upper_bound_units?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_history: {
        Row: {
          id: string
          period_month: string
          product_id: string
          revenue_usd: number
          site_id: string
          units: number
          workspace_id: string
        }
        Insert: {
          id?: string
          period_month: string
          product_id: string
          revenue_usd?: number
          site_id: string
          units: number
          workspace_id: string
        }
        Update: {
          id?: string
          period_month?: string
          product_id?: string
          revenue_usd?: number
          site_id?: string
          units?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_history_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_positions: {
        Row: {
          allocated_units: number
          avg_daily_demand: number
          id: string
          on_hand_units: number
          on_order_units: number
          product_id: string
          reorder_point_units: number
          safety_stock_units: number
          site_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allocated_units?: number
          avg_daily_demand?: number
          id?: string
          on_hand_units?: number
          on_order_units?: number
          product_id: string
          reorder_point_units?: number
          safety_stock_units?: number
          site_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allocated_units?: number
          avg_daily_demand?: number
          id?: string
          on_hand_units?: number
          on_order_units?: number
          product_id?: string
          reorder_point_units?: number
          safety_stock_units?: number
          site_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_positions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_positions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_positions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          id: string
          is_primary: boolean
          lead_time_days: number
          moq: number
          product_id: string
          supplier_id: string
          unit_cost: number
          workspace_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          lead_time_days?: number
          moq?: number
          product_id: string
          supplier_id: string
          unit_cost: number
          workspace_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          lead_time_days?: number
          moq?: number
          product_id?: string
          supplier_id?: string
          unit_cost?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          abc_class: string
          category: string
          created_at: string
          id: string
          lifecycle_stage: string
          name: string
          sku: string
          unit_cost: number
          unit_price: number
          workspace_id: string
        }
        Insert: {
          abc_class?: string
          category: string
          created_at?: string
          id?: string
          lifecycle_stage?: string
          name: string
          sku: string
          unit_cost: number
          unit_price: number
          workspace_id: string
        }
        Update: {
          abc_class?: string
          category?: string
          created_at?: string
          id?: string
          lifecycle_stage?: string
          name?: string
          sku?: string
          unit_cost?: number
          unit_price?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          id: string
          product_id: string
          purchase_order_id: string
          quantity_units: number
          received_units: number
          unit_cost: number
          workspace_id: string
        }
        Insert: {
          id?: string
          product_id: string
          purchase_order_id: string
          quantity_units: number
          received_units?: number
          unit_cost: number
          workspace_id: string
        }
        Update: {
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity_units?: number
          received_units?: number
          unit_cost?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_date: string
          po_number: string
          promised_date: string
          received_date: string | null
          site_id: string
          status: string
          supplier_id: string
          total_value_usd: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_date: string
          po_number: string
          promised_date: string
          received_date?: string | null
          site_id: string
          status?: string
          supplier_id: string
          total_value_usd?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_date?: string
          po_number?: string
          promised_date?: string
          received_date?: string | null
          site_id?: string
          status?: string
          supplier_id?: string
          total_value_usd?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_arrival_date: string | null
          carrier: string
          created_at: string
          destination_site_id: string
          eta_date: string
          freight_cost_usd: number
          id: string
          lane: string
          mode: string
          origin_location: string
          purchase_order_id: string | null
          ship_date: string
          shipment_ref: string
          status: string
          units: number
          workspace_id: string
        }
        Insert: {
          actual_arrival_date?: string | null
          carrier: string
          created_at?: string
          destination_site_id: string
          eta_date: string
          freight_cost_usd?: number
          id?: string
          lane: string
          mode?: string
          origin_location: string
          purchase_order_id?: string | null
          ship_date: string
          shipment_ref: string
          status?: string
          units?: number
          workspace_id: string
        }
        Update: {
          actual_arrival_date?: string | null
          carrier?: string
          created_at?: string
          destination_site_id?: string
          eta_date?: string
          freight_cost_usd?: number
          id?: string
          lane?: string
          mode?: string
          origin_location?: string
          purchase_order_id?: string | null
          ship_date?: string
          shipment_ref?: string
          status?: string
          units?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_destination_site_id_fkey"
            columns: ["destination_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          city: string | null
          code: string
          country: string
          created_at: string
          id: string
          name: string
          region: string
          site_type: string
          workspace_id: string
        }
        Insert: {
          city?: string | null
          code: string
          country: string
          created_at?: string
          id?: string
          name: string
          region: string
          site_type?: string
          workspace_id: string
        }
        Update: {
          city?: string | null
          code?: string
          country?: string
          created_at?: string
          id?: string
          name?: string
          region?: string
          site_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          annual_spend_usd: number
          capacity_risk_score: number
          category: string
          code: string
          contract_expiry: string | null
          country: string
          created_at: string
          defect_rate_ppm: number
          financial_risk_score: number
          geopolitical_risk_score: number
          id: string
          lead_time_days: number
          name: string
          on_time_delivery_rate: number
          region: string
          status: string
          tier: number
          workspace_id: string
        }
        Insert: {
          annual_spend_usd?: number
          capacity_risk_score?: number
          category: string
          code: string
          contract_expiry?: string | null
          country: string
          created_at?: string
          defect_rate_ppm?: number
          financial_risk_score?: number
          geopolitical_risk_score?: number
          id?: string
          lead_time_days?: number
          name: string
          on_time_delivery_rate?: number
          region: string
          status?: string
          tier?: number
          workspace_id: string
        }
        Update: {
          annual_spend_usd?: number
          capacity_risk_score?: number
          category?: string
          code?: string
          contract_expiry?: string | null
          country?: string
          created_at?: string
          defect_rate_ppm?: number
          financial_risk_score?: number
          geopolitical_risk_score?: number
          id?: string
          lead_time_days?: number
          name?: string
          on_time_delivery_rate?: number
          region?: string
          status?: string
          tier?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          currency: string
          id: string
          industry: string
          is_demo: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          industry?: string
          is_demo?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          industry?: string
          is_demo?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_current_user: {
        Args: { _full_name?: string; _job_title?: string }
        Returns: undefined
      }
      can_access_workspace: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      can_write_workspace: { Args: { _workspace_id: string }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_my_roles: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "ADMIN"
        | "PROCUREMENT_MANAGER"
        | "SUPPLY_CHAIN_MANAGER"
        | "BUSINESS_ANALYST"
        | "FINANCE_MANAGER"
        | "EXECUTIVE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "ADMIN",
        "PROCUREMENT_MANAGER",
        "SUPPLY_CHAIN_MANAGER",
        "BUSINESS_ANALYST",
        "FINANCE_MANAGER",
        "EXECUTIVE",
      ],
    },
  },
} as const
