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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      animal_health_records: {
        Row: {
          animal_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          next_followup_date: string | null
          record_date: string
          record_type: string
          vet_name: string
        }
        Insert: {
          animal_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          next_followup_date?: string | null
          record_date?: string
          record_type?: string
          vet_name?: string
        }
        Update: {
          animal_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          next_followup_date?: string | null
          record_date?: string
          record_type?: string
          vet_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          age_years: number | null
          animal_code: string
          animal_type: Database["public"]["Enums"]["milk_type"]
          breed: string
          centre_id: string
          created_at: string
          created_by: string | null
          daily_yield_litres: number
          date_of_birth: string | null
          farmer_id: string
          feeding_plan: string
          health_status: string
          id: string
          name: string
          notes: string
          photo_path: string | null
          purchase_date: string | null
          purchase_price: number | null
          sale_date: string | null
          sale_price: number | null
          status: string
          tag_number: string
          updated_at: string
        }
        Insert: {
          age_years?: number | null
          animal_code?: string
          animal_type: Database["public"]["Enums"]["milk_type"]
          breed?: string
          centre_id: string
          created_at?: string
          created_by?: string | null
          daily_yield_litres?: number
          date_of_birth?: string | null
          farmer_id: string
          feeding_plan?: string
          health_status?: string
          id?: string
          name: string
          notes?: string
          photo_path?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          sale_date?: string | null
          sale_price?: number | null
          status?: string
          tag_number?: string
          updated_at?: string
        }
        Update: {
          age_years?: number | null
          animal_code?: string
          animal_type?: Database["public"]["Enums"]["milk_type"]
          breed?: string
          centre_id?: string
          created_at?: string
          created_by?: string | null
          daily_yield_litres?: number
          date_of_birth?: string | null
          farmer_id?: string
          feeding_plan?: string
          health_status?: string
          id?: string
          name?: string
          notes?: string
          photo_path?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          sale_date?: string | null
          sale_price?: number | null
          status?: string
          tag_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "animals_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          centre_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          centre_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          centre_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      breeding_records: {
        Row: {
          animal_id: string
          calf_details: string
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          expected_calving_date: string | null
          id: string
          notes: string
        }
        Insert: {
          animal_id: string
          calf_details?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type: string
          expected_calving_date?: string | null
          id?: string
          notes?: string
        }
        Update: {
          animal_id?: string
          calf_details?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          expected_calving_date?: string | null
          id?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      centre_counters: {
        Row: {
          animal_seq: number
          batch_seq: number
          centre_id: string
          farmer_seq: number
          payment_seq: number
          receipt_seq: number
          sale_seq: number
        }
        Insert: {
          animal_seq?: number
          batch_seq?: number
          centre_id: string
          farmer_seq?: number
          payment_seq?: number
          receipt_seq?: number
          sale_seq?: number
        }
        Update: {
          animal_seq?: number
          batch_seq?: number
          centre_id?: string
          farmer_seq?: number
          payment_seq?: number
          receipt_seq?: number
          sale_seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "centre_counters_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
        ]
      }
      centre_staff: {
        Row: {
          can_edit_collections: boolean
          centre_id: string
          created_at: string
          id: string
          is_active: boolean
          staff_role: string
          user_id: string
        }
        Insert: {
          can_edit_collections?: boolean
          centre_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          staff_role: string
          user_id: string
        }
        Update: {
          can_edit_collections?: boolean
          centre_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          staff_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centre_staff_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centre_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dairy_centres: {
        Row: {
          address: string
          code: string
          created_at: string
          district: string
          email: string
          id: string
          low_stock_threshold_litres: number
          mobile: string
          name: string
          opening_hours: string
          owner_id: string
          state: string
          status: string
          updated_at: string
          village: string
        }
        Insert: {
          address?: string
          code: string
          created_at?: string
          district?: string
          email?: string
          id?: string
          low_stock_threshold_litres?: number
          mobile?: string
          name: string
          opening_hours?: string
          owner_id: string
          state?: string
          status?: string
          updated_at?: string
          village?: string
        }
        Update: {
          address?: string
          code?: string
          created_at?: string
          district?: string
          email?: string
          id?: string
          low_stock_threshold_litres?: number
          mobile?: string
          name?: string
          opening_hours?: string
          owner_id?: string
          state?: string
          status?: string
          updated_at?: string
          village?: string
        }
        Relationships: [
          {
            foreignKeyName: "dairy_centres_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_expenses: {
        Row: {
          amount: number
          category: string
          centre_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          farmer_id: string | null
          id: string
          paid_by: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          farmer_id?: string | null
          id?: string
          paid_by?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          farmer_id?: string | null
          id?: string
          paid_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_expenses_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_expenses_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "farm_expenses_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_ledger: {
        Row: {
          amount: number
          centre_id: string
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_type: string
          farmer_id: string
          id: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          amount: number
          centre_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_type: string
          farmer_id: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          amount?: number
          centre_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_type?: string
          farmer_id?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_ledger_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_ledger_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "farmer_ledger_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_payments: {
        Row: {
          amount: number
          centre_id: string
          created_at: string
          farmer_id: string
          id: string
          idempotency_key: string
          method: string
          notes: string
          payment_date: string
          payment_type: string
          recorded_by: string | null
          reference_no: string
          reversed_at: string | null
          reversed_by: string | null
          reversed_reason: string | null
          status: string
          txn_id: string
        }
        Insert: {
          amount: number
          centre_id: string
          created_at?: string
          farmer_id: string
          id?: string
          idempotency_key: string
          method: string
          notes?: string
          payment_date?: string
          payment_type: string
          recorded_by?: string | null
          reference_no?: string
          reversed_at?: string | null
          reversed_by?: string | null
          reversed_reason?: string | null
          status?: string
          txn_id: string
        }
        Update: {
          amount?: number
          centre_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          idempotency_key?: string
          method?: string
          notes?: string
          payment_date?: string
          payment_type?: string
          recorded_by?: string | null
          reference_no?: string
          reversed_at?: string | null
          reversed_by?: string | null
          reversed_reason?: string | null
          status?: string
          txn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_payments_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_payments_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "farmer_payments_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      farmers: {
        Row: {
          address: string
          bank_account: string
          centre_id: string
          created_at: string
          created_by: string | null
          farmer_code: string
          id: string
          ifsc: string
          joined_date: string
          milk_type: string
          mobile: string
          name: string
          name_hi: string
          photo_path: string | null
          status: string
          updated_at: string
          upi_id: string
          user_id: string | null
          village: string
          village_hi: string
        }
        Insert: {
          address?: string
          bank_account?: string
          centre_id: string
          created_at?: string
          created_by?: string | null
          farmer_code?: string
          id?: string
          ifsc?: string
          joined_date?: string
          milk_type?: string
          mobile?: string
          name: string
          name_hi?: string
          photo_path?: string | null
          status?: string
          updated_at?: string
          upi_id?: string
          user_id?: string | null
          village?: string
          village_hi?: string
        }
        Update: {
          address?: string
          bank_account?: string
          centre_id?: string
          created_at?: string
          created_by?: string | null
          farmer_code?: string
          id?: string
          ifsc?: string
          joined_date?: string
          milk_type?: string
          mobile?: string
          name?: string
          name_hi?: string
          photo_path?: string | null
          status?: string
          updated_at?: string
          upi_id?: string
          user_id?: string | null
          village?: string
          village_hi?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmers_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          centre_id: string
          created_at: string
          created_by: string | null
          id: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          movement_date: string
          movement_type: string
          notes: string
          quantity_litres: number
          reference_id: string | null
        }
        Insert: {
          centre_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          movement_date?: string
          movement_type: string
          notes?: string
          quantity_litres: number
          reference_id?: string | null
        }
        Update: {
          centre_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          milk_type?: Database["public"]["Enums"]["milk_type"]
          movement_date?: string
          movement_type?: string
          notes?: string
          quantity_litres?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_collections: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          centre_id: string
          collected_at: string
          collection_date: string
          corrected_from: string | null
          created_at: string
          farmer_id: string
          fat_percent: number
          id: string
          idempotency_key: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          operator_id: string | null
          quality_status: string
          quantity_litres: number
          rate_chart_id: string | null
          rate_method: string
          rate_override: boolean
          rate_per_litre: number
          receipt_no: string
          shift: Database["public"]["Enums"]["shift_type"]
          snf_percent: number
          status: string
          total_amount: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          centre_id: string
          collected_at?: string
          collection_date?: string
          corrected_from?: string | null
          created_at?: string
          farmer_id: string
          fat_percent: number
          id?: string
          idempotency_key: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          operator_id?: string | null
          quality_status?: string
          quantity_litres: number
          rate_chart_id?: string | null
          rate_method?: string
          rate_override?: boolean
          rate_per_litre?: number
          receipt_no?: string
          shift: Database["public"]["Enums"]["shift_type"]
          snf_percent: number
          status?: string
          total_amount?: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          centre_id?: string
          collected_at?: string
          collection_date?: string
          corrected_from?: string | null
          created_at?: string
          farmer_id?: string
          fat_percent?: number
          id?: string
          idempotency_key?: string
          milk_type?: Database["public"]["Enums"]["milk_type"]
          operator_id?: string | null
          quality_status?: string
          quantity_litres?: number
          rate_chart_id?: string | null
          rate_method?: string
          rate_override?: boolean
          rate_per_litre?: number
          receipt_no?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          snf_percent?: number
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "milk_collections_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_collections_corrected_from_fkey"
            columns: ["corrected_from"]
            isOneToOne: false
            referencedRelation: "milk_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_collections_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "milk_collections_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_collections_rate_chart_id_fkey"
            columns: ["rate_chart_id"]
            isOneToOne: false
            referencedRelation: "rate_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_sales: {
        Row: {
          centre_id: string
          created_at: string
          customer_name: string
          customer_type: string
          id: string
          idempotency_key: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          payment_status: string
          quantity_litres: number
          rate_per_litre: number
          recorded_by: string | null
          sale_date: string
          sale_no: string
          total_amount: number
        }
        Insert: {
          centre_id: string
          created_at?: string
          customer_name: string
          customer_type: string
          id?: string
          idempotency_key: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          payment_status?: string
          quantity_litres: number
          rate_per_litre: number
          recorded_by?: string | null
          sale_date?: string
          sale_no?: string
          total_amount?: number
        }
        Update: {
          centre_id?: string
          created_at?: string
          customer_name?: string
          customer_type?: string
          id?: string
          idempotency_key?: string
          milk_type?: Database["public"]["Enums"]["milk_type"]
          payment_status?: string
          quantity_litres?: number
          rate_per_litre?: number
          recorded_by?: string | null
          sale_date?: string
          sale_no?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "milk_sales_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          centre_id: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          message_hi: string | null
          title: string
          title_hi: string | null
          user_id: string
        }
        Insert: {
          category?: string
          centre_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          message_hi?: string | null
          title: string
          title_hi?: string | null
          user_id: string
        }
        Update: {
          category?: string
          centre_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          message_hi?: string | null
          title?: string
          title_hi?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      production_batches: {
        Row: {
          batch_date: string
          batch_no: string
          centre_id: string
          created_at: string
          created_by: string | null
          estimated_value: number
          id: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          milk_used_litres: number
          output_quantity: string
          product_name: string
          status: string
        }
        Insert: {
          batch_date?: string
          batch_no?: string
          centre_id: string
          created_at?: string
          created_by?: string | null
          estimated_value?: number
          id?: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          milk_used_litres: number
          output_quantity?: string
          product_name: string
          status?: string
        }
        Update: {
          batch_date?: string
          batch_no?: string
          centre_id?: string
          created_at?: string
          created_by?: string | null
          estimated_value?: number
          id?: string
          milk_type?: Database["public"]["Enums"]["milk_type"]
          milk_used_litres?: number
          output_quantity?: string
          product_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          mobile: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          mobile?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          mobile?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_charts: {
        Row: {
          base_rate: number
          centre_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          fat_rate: number | null
          fixed_rate: number | null
          id: string
          method: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          min_fat: number | null
          min_snf: number | null
          notes: string
          snf_rate: number | null
          version: number
        }
        Insert: {
          base_rate?: number
          centre_id: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          fat_rate?: number | null
          fixed_rate?: number | null
          id?: string
          method: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          min_fat?: number | null
          min_snf?: number | null
          notes?: string
          snf_rate?: number | null
          version?: number
        }
        Update: {
          base_rate?: number
          centre_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          fat_rate?: number | null
          fixed_rate?: number | null
          id?: string
          method?: string
          milk_type?: Database["public"]["Enums"]["milk_type"]
          min_fat?: number | null
          min_snf?: number | null
          notes?: string
          snf_rate?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_charts_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_slabs: {
        Row: {
          id: string
          max_fat: number
          max_snf: number
          min_fat: number
          min_snf: number
          rate: number
          rate_chart_id: string
        }
        Insert: {
          id?: string
          max_fat: number
          max_snf?: number
          min_fat: number
          min_snf?: number
          rate: number
          rate_chart_id: string
        }
        Update: {
          id?: string
          max_fat?: number
          max_snf?: number
          min_fat?: number
          min_snf?: number
          rate?: number
          rate_chart_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_slabs_rate_chart_id_fkey"
            columns: ["rate_chart_id"]
            isOneToOne: false
            referencedRelation: "rate_charts"
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
      vaccination_records: {
        Row: {
          administered_date: string | null
          animal_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string
          scheduled_date: string
          status: string
          vaccine_name: string
          vet_name: string
        }
        Insert: {
          administered_date?: string | null
          animal_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          scheduled_date: string
          status?: string
          vaccine_name: string
          vet_name?: string
        }
        Update: {
          administered_date?: string | null
          animal_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          scheduled_date?: string
          status?: string
          vaccine_name?: string
          vet_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      farmer_balances: {
        Row: {
          balance: number | null
          centre_id: string | null
          farmer_id: string | null
          total_earned: number | null
          total_litres: number | null
          total_paid: number | null
        }
        Insert: {
          balance?: never
          centre_id?: string | null
          farmer_id?: string | null
          total_earned?: never
          total_litres?: never
          total_paid?: never
        }
        Update: {
          balance?: never
          centre_id?: string | null
          farmer_id?: string | null
          total_earned?: never
          total_litres?: never
          total_paid?: never
        }
        Relationships: [
          {
            foreignKeyName: "farmers_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          centre_id: string | null
          milk_type: Database["public"]["Enums"]["milk_type"] | null
          stock_litres: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "dairy_centres"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_list_centres: {
        Args: never
        Returns: {
          code: string
          created_at: string
          district: string
          farmers: number
          id: string
          litres_30d: number
          name: string
          owner_email: string
          owner_name: string
          staff: number
          state: string
          status: string
          village: string
        }[]
      }
      admin_platform_stats: { Args: never; Returns: Json }
      can_edit_animal: { Args: { _animal: string }; Returns: boolean }
      can_edit_collection: {
        Args: { _c: Database["public"]["Tables"]["milk_collections"]["Row"] }
        Returns: boolean
      }
      can_view_animal: { Args: { _animal: string }; Returns: boolean }
      cancel_collection: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      collection_daily_summary: {
        Args: { _centre: string; _farmer?: string; _from: string; _to: string }
        Returns: {
          amount: number
          avg_fat: number
          avg_snf: number
          day: string
          entries: number
          litres: number
          milk_type: Database["public"]["Enums"]["milk_type"]
          shift: Database["public"]["Enums"]["shift_type"]
        }[]
      }
      compute_milk_rate: {
        Args: {
          _centre: string
          _date: string
          _fat: number
          _milk: Database["public"]["Enums"]["milk_type"]
          _snf: number
        }
        Returns: {
          method: string
          quality_status: string
          rate: number
          rate_chart_id: string
        }[]
      }
      correct_collection: {
        Args: {
          _fat: number
          _id: string
          _idempotency_key: string
          _quantity: number
          _reason: string
          _snf: number
        }
        Returns: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          centre_id: string
          collected_at: string
          collection_date: string
          corrected_from: string | null
          created_at: string
          farmer_id: string
          fat_percent: number
          id: string
          idempotency_key: string
          milk_type: Database["public"]["Enums"]["milk_type"]
          operator_id: string | null
          quality_status: string
          quantity_litres: number
          rate_chart_id: string | null
          rate_method: string
          rate_override: boolean
          rate_per_litre: number
          receipt_no: string
          shift: Database["public"]["Enums"]["shift_type"]
          snf_percent: number
          status: string
          total_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "milk_collections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_rate_chart: {
        Args: {
          _base_rate: number
          _centre: string
          _effective_from: string
          _fat_rate: number
          _fixed_rate: number
          _method: string
          _milk: Database["public"]["Enums"]["milk_type"]
          _min_fat: number
          _min_snf: number
          _notes: string
          _slabs?: Json
          _snf_rate: number
        }
        Returns: string
      }
      do_cancel_collection: {
        Args: {
          _c: Database["public"]["Tables"]["milk_collections"]["Row"]
          _reason: string
        }
        Returns: undefined
      }
      generate_centre_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_centre_member: { Args: { _centre: string }; Returns: boolean }
      is_centre_owner: { Args: { _centre: string }; Returns: boolean }
      is_my_farmer: { Args: { _farmer: string }; Returns: boolean }
      is_my_farmer_centre: { Args: { _centre: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      ledger_adjustment: {
        Args: { _amount: number; _description: string; _farmer: string }
        Returns: string
      }
      mark_sale_received: { Args: { _sale: string }; Returns: undefined }
      next_centre_seq: {
        Args: { _centre: string; _kind: string }
        Returns: number
      }
      notify_centre_owners: {
        Args: {
          _category: string
          _centre: string
          _link?: string
          _msg: string
          _msg_hi: string
          _title: string
          _title_hi: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _category: string
          _centre: string
          _link?: string
          _msg: string
          _msg_hi: string
          _title: string
          _title_hi: string
          _user: string
        }
        Returns: undefined
      }
      preview_milk_rate: {
        Args: {
          _centre: string
          _date: string
          _fat: number
          _milk: Database["public"]["Enums"]["milk_type"]
          _snf: number
        }
        Returns: {
          method: string
          quality_status: string
          rate: number
          rate_chart_id: string
        }[]
      }
      record_inventory_entry: {
        Args: {
          _centre: string
          _date?: string
          _milk: Database["public"]["Enums"]["milk_type"]
          _notes: string
          _quantity: number
          _type: string
        }
        Returns: string
      }
      record_payment: {
        Args: {
          _amount: number
          _farmer: string
          _idempotency_key: string
          _method: string
          _notes: string
          _payment_date: string
          _payment_type: string
          _reference_no: string
        }
        Returns: {
          amount: number
          centre_id: string
          created_at: string
          farmer_id: string
          id: string
          idempotency_key: string
          method: string
          notes: string
          payment_date: string
          payment_type: string
          recorded_by: string | null
          reference_no: string
          reversed_at: string | null
          reversed_by: string | null
          reversed_reason: string | null
          status: string
          txn_id: string
        }
        SetofOptions: {
          from: "*"
          to: "farmer_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_payment: {
        Args: { _payment: string; _reason: string }
        Returns: undefined
      }
      send_centre_announcement: {
        Args: { _centre: string; _message: string; _title: string }
        Returns: number
      }
      set_centre_status: {
        Args: { _centre: string; _status: string }
        Returns: undefined
      }
      settlement_summary: {
        Args: { _centre: string; _from: string; _to: string }
        Returns: {
          advances_in_period: number
          balance: number
          farmer_code: string
          farmer_id: string
          gross: number
          litres: number
          name: string
          name_hi: string
          paid_in_period: number
          village: string
        }[]
      }
      today_ist: { Args: never; Returns: string }
      try_uuid: { Args: { _t: string }; Returns: string }
      write_audit: {
        Args: {
          _action: string
          _centre: string
          _details?: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "centre_owner" | "operator" | "farmer"
      milk_type: "Cow" | "Buffalo"
      shift_type: "Morning" | "Evening"
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
      app_role: ["super_admin", "centre_owner", "operator", "farmer"],
      milk_type: ["Cow", "Buffalo"],
      shift_type: ["Morning", "Evening"],
    },
  },
} as const
