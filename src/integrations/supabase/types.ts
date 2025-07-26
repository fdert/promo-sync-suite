export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      account_entries: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string
          entry_date: string
          id: string
          reference_id: string | null
          reference_type: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          entry_date?: string
          id?: string
          reference_id?: string | null
          reference_type: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          entry_date?: string
          id?: string
          reference_id?: string | null
          reference_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_name: string
          account_type: string
          balance: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_name: string
          account_type: string
          balance?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_type?: string
          balance?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_name: string
          backup_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          backup_name: string
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          backup_name?: string
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          import_source: string | null
          last_invoice_date: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          import_source?: string | null
          last_invoice_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          import_source?: string | null
          last_invoice_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      data_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_log: Json | null
          failed_records: number | null
          file_name: string
          id: string
          import_type: string
          processed_records: number | null
          status: string
          total_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          failed_records?: number | null
          file_name: string
          id?: string
          import_type: string
          processed_records?: number | null
          status?: string
          total_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          failed_records?: number | null
          file_name?: string
          id?: string
          import_type?: string
          processed_records?: number | null
          status?: string
          total_records?: number | null
        }
        Relationships: []
      }
      evaluation_stats: {
        Row: {
          average_rating: number | null
          communication_avg: number | null
          created_at: string | null
          delivery_time_avg: number | null
          five_star_count: number | null
          four_star_count: number | null
          id: string
          last_updated: string | null
          one_star_count: number | null
          price_value_avg: number | null
          recommendation_percentage: number | null
          service_quality_avg: number | null
          three_star_count: number | null
          total_evaluations: number | null
          two_star_count: number | null
        }
        Insert: {
          average_rating?: number | null
          communication_avg?: number | null
          created_at?: string | null
          delivery_time_avg?: number | null
          five_star_count?: number | null
          four_star_count?: number | null
          id?: string
          last_updated?: string | null
          one_star_count?: number | null
          price_value_avg?: number | null
          recommendation_percentage?: number | null
          service_quality_avg?: number | null
          three_star_count?: number | null
          total_evaluations?: number | null
          two_star_count?: number | null
        }
        Update: {
          average_rating?: number | null
          communication_avg?: number | null
          created_at?: string | null
          delivery_time_avg?: number | null
          five_star_count?: number | null
          four_star_count?: number | null
          id?: string
          last_updated?: string | null
          one_star_count?: number | null
          price_value_avg?: number | null
          recommendation_percentage?: number | null
          service_quality_avg?: number | null
          three_star_count?: number | null
          total_evaluations?: number | null
          two_star_count?: number | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          communication_rating: number | null
          created_at: string | null
          customer_id: string | null
          delivery_time_rating: number | null
          evaluation_token: string
          feedback_text: string | null
          id: string
          is_public: boolean | null
          order_id: string | null
          price_value_rating: number | null
          rating: number
          service_quality_rating: number | null
          submitted_at: string | null
          suggestions: string | null
          updated_at: string | null
          would_recommend: boolean | null
        }
        Insert: {
          communication_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_time_rating?: number | null
          evaluation_token: string
          feedback_text?: string | null
          id?: string
          is_public?: boolean | null
          order_id?: string | null
          price_value_rating?: number | null
          rating: number
          service_quality_rating?: number | null
          submitted_at?: string | null
          suggestions?: string | null
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          communication_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_time_rating?: number | null
          evaluation_token?: string
          feedback_text?: string | null
          id?: string
          is_public?: boolean | null
          order_id?: string | null
          price_value_rating?: number | null
          rating?: number
          service_quality_rating?: number | null
          submitted_at?: string | null
          suggestions?: string | null
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          expense_number: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          expense_number: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          expense_number?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string | null
          item_name: string
          quantity: number
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          item_name: string
          quantity?: number
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          item_name?: string
          quantity?: number
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          due_date: string
          id: string
          invoice_number: string
          is_deferred: boolean | null
          issue_date: string | null
          last_printed_at: string | null
          notes: string | null
          order_id: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_type: string | null
          print_count: number | null
          reminder_sent_at: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_date: string
          id?: string
          invoice_number: string
          is_deferred?: boolean | null
          issue_date?: string | null
          last_printed_at?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          print_count?: number | null
          reminder_sent_at?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          is_deferred?: boolean | null
          issue_date?: string | null
          last_printed_at?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          print_count?: number | null
          reminder_sent_at?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          template_content: string
          template_name: string
          template_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          template_content: string
          template_name: string
          template_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          template_content?: string
          template_name?: string
          template_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_name: string
          order_id: string | null
          quantity: number
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          order_id?: string | null
          quantity?: number
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          order_id?: string | null
          quantity?: number
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          assigned_to: string | null
          attachment_urls: string[] | null
          completion_date: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          order_number: string
          paid_amount: number | null
          payment_notes: string | null
          payment_type: string | null
          priority: string | null
          progress: number | null
          service_id: string | null
          service_name: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          assigned_to?: string | null
          attachment_urls?: string[] | null
          completion_date?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          paid_amount?: number | null
          payment_notes?: string | null
          payment_type?: string | null
          priority?: string | null
          progress?: number | null
          service_id?: string | null
          service_name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          assigned_to?: string | null
          attachment_urls?: string[] | null
          completion_date?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          paid_amount?: number | null
          payment_notes?: string | null
          payment_type?: string | null
          priority?: string | null
          progress?: number | null
          service_id?: string | null
          service_name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          order_id: string | null
          payment_date: string
          payment_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_date?: string
          payment_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_date?: string
          payment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          last_login: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_login?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          order_statuses: string[] | null
          secret_key: string | null
          updated_at: string
          webhook_name: string
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          order_statuses?: string[] | null
          secret_key?: string | null
          updated_at?: string
          webhook_name: string
          webhook_type?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          order_statuses?: string[] | null
          secret_key?: string | null
          updated_at?: string
          webhook_name?: string
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          customer_id: string | null
          from_number: string
          id: string
          is_reply: boolean | null
          media_url: string | null
          message_content: string | null
          message_id: string | null
          message_type: string | null
          replied_at: string | null
          replied_by: string | null
          status: string | null
          timestamp: string | null
          to_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          from_number: string
          id?: string
          is_reply?: boolean | null
          media_url?: string | null
          message_content?: string | null
          message_id?: string | null
          message_type?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          timestamp?: string | null
          to_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          from_number?: string
          id?: string
          is_reply?: boolean | null
          media_url?: string | null
          message_content?: string | null
          message_id?: string | null
          message_type?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          timestamp?: string | null
          to_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_whatsapp_messages_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_invoice_accounting_entry: {
        Args: {
          invoice_id: string
          customer_name: string
          total_amount: number
        }
        Returns: undefined
      }
      create_payment_accounting_entry: {
        Args: {
          payment_id: string
          invoice_id: string
          payment_amount: number
          payment_type: string
        }
        Returns: undefined
      }
      generate_expense_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_permission: {
        Args: { _user_id: string; _permission: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      log_activity: {
        Args: {
          _user_id: string
          _action: string
          _resource_type: string
          _resource_id?: string
          _details?: Json
        }
        Returns: undefined
      }
      update_last_login: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee" | "accountant" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "manager", "employee", "accountant", "user"],
    },
  },
} as const
