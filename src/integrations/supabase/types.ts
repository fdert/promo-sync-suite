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
      agencies: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          database_name: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_customers: number | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          subscription_expires_at: string | null
          subscription_plan: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          database_name?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_customers?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          database_name?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_customers?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_by: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_settings: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
      barcode_label_settings: {
        Row: {
          barcode_height: number
          barcode_width: number
          company_address: string | null
          company_logo_url: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          created_by: string | null
          font_size: number
          id: string
          is_active: boolean
          label_height: number | null
          label_width: number
          margins: number
          paper_type: string
          show_company_logo: boolean
          show_company_name: boolean
          show_date: boolean
          show_qr_code: boolean
          updated_at: string
        }
        Insert: {
          barcode_height?: number
          barcode_width?: number
          company_address?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          created_by?: string | null
          font_size?: number
          id?: string
          is_active?: boolean
          label_height?: number | null
          label_width?: number
          margins?: number
          paper_type?: string
          show_company_logo?: boolean
          show_company_name?: boolean
          show_date?: boolean
          show_qr_code?: boolean
          updated_at?: string
        }
        Update: {
          barcode_height?: number
          barcode_width?: number
          company_address?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          created_by?: string | null
          font_size?: number
          id?: string
          is_active?: boolean
          label_height?: number | null
          label_width?: number
          margins?: number
          paper_type?: string
          show_company_logo?: boolean
          show_company_name?: boolean
          show_date?: boolean
          show_qr_code?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bulk_campaign_messages: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          message_content: string
          sent_at: string | null
          status: string | null
          whatsapp_number: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          sent_at?: string | null
          status?: string | null
          whatsapp_number: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          sent_at?: string | null
          status?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_campaign_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "bulk_campaign_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "bulk_campaign_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          delay_between_messages: number | null
          error_message: string | null
          failed_count: number | null
          id: string
          message_content: string
          name: string
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          target_groups: string[] | null
          target_type: string | null
          total_recipients: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delay_between_messages?: number | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          message_content: string
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_groups?: string[] | null
          target_type?: string | null
          total_recipients?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delay_between_messages?: number | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          message_content?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_groups?: string[] | null
          target_type?: string | null
          total_recipients?: number | null
        }
        Relationships: []
      }
      customer_group_members: {
        Row: {
          created_at: string | null
          customer_id: string | null
          group_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          group_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          group_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_group_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_group_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_group_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "customer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_groups: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
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
          google_review_conversion_rate: number | null
          google_reviews_completed: number | null
          google_reviews_sent: number | null
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
          google_review_conversion_rate?: number | null
          google_reviews_completed?: number | null
          google_reviews_sent?: number | null
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
          google_review_conversion_rate?: number | null
          google_reviews_completed?: number | null
          google_reviews_sent?: number | null
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
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          communication_rating: number | null
          created_at: string | null
          customer_id: string | null
          delivery_time_rating: number | null
          evaluation_token: string
          feedback_text: string | null
          google_review_link: string | null
          google_review_sent_at: string | null
          google_review_status: string | null
          id: string
          is_public: boolean | null
          order_id: string | null
          price_value_rating: number | null
          rating: number | null
          service_quality_rating: number | null
          submitted_at: string | null
          suggestions: string | null
          updated_at: string | null
          would_recommend: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          communication_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_time_rating?: number | null
          evaluation_token: string
          feedback_text?: string | null
          google_review_link?: string | null
          google_review_sent_at?: string | null
          google_review_status?: string | null
          id?: string
          is_public?: boolean | null
          order_id?: string | null
          price_value_rating?: number | null
          rating?: number | null
          service_quality_rating?: number | null
          submitted_at?: string | null
          suggestions?: string | null
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          communication_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_time_rating?: number | null
          evaluation_token?: string
          feedback_text?: string | null
          google_review_link?: string | null
          google_review_sent_at?: string | null
          google_review_status?: string | null
          id?: string
          is_public?: boolean | null
          order_id?: string | null
          price_value_rating?: number | null
          rating?: number | null
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
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "evaluations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
          },
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
            isOneToOne: true
            referencedRelation: "order_payment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
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
      follow_up_settings: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_delay_days: number | null
          follow_up_email: string | null
          follow_up_whatsapp: string | null
          id: string
          payment_delay_days: number | null
          send_whatsapp_on_delivery_delay: boolean | null
          send_whatsapp_on_failure: boolean | null
          send_whatsapp_on_new_order: boolean | null
          send_whatsapp_on_payment_delay: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_delay_days?: number | null
          follow_up_email?: string | null
          follow_up_whatsapp?: string | null
          id?: string
          payment_delay_days?: number | null
          send_whatsapp_on_delivery_delay?: boolean | null
          send_whatsapp_on_failure?: boolean | null
          send_whatsapp_on_new_order?: boolean | null
          send_whatsapp_on_payment_delay?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_delay_days?: number | null
          follow_up_email?: string | null
          follow_up_whatsapp?: string | null
          id?: string
          payment_delay_days?: number | null
          send_whatsapp_on_delivery_delay?: boolean | null
          send_whatsapp_on_failure?: boolean | null
          send_whatsapp_on_new_order?: boolean | null
          send_whatsapp_on_payment_delay?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      google_maps_settings: {
        Row: {
          auto_send_enabled: boolean | null
          business_name: string
          created_at: string | null
          created_by: string | null
          google_maps_url: string
          id: string
          minimum_rating: number | null
          place_id: string
          review_template: string | null
          updated_at: string | null
        }
        Insert: {
          auto_send_enabled?: boolean | null
          business_name: string
          created_at?: string | null
          created_by?: string | null
          google_maps_url: string
          id?: string
          minimum_rating?: number | null
          place_id: string
          review_template?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_send_enabled?: boolean | null
          business_name?: string
          created_at?: string | null
          created_by?: string | null
          google_maps_url?: string
          id?: string
          minimum_rating?: number | null
          place_id?: string
          review_template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      google_review_requests: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          evaluation_id: string | null
          expires_at: string | null
          id: string
          review_link: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          evaluation_id?: string | null
          expires_at?: string | null
          id?: string
          review_link: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          evaluation_id?: string | null
          expires_at?: string | null
          id?: string
          review_link?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_review_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "google_review_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "google_review_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_review_requests_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "invoice_payment_summary"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
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
            referencedRelation: "order_payment_summary"
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
            referencedRelation: "order_payment_summary"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
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
            referencedRelation: "invoice_payment_summary"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "order_payment_summary"
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
      print_files: {
        Row: {
          approval_date: string | null
          approved_by: string | null
          file_category: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          is_approved: boolean | null
          mime_type: string | null
          notes: string | null
          print_order_id: string
          sent_at: string | null
          sent_to_customer: boolean | null
          upload_date: string | null
          uploaded_by: string | null
          version_number: number | null
        }
        Insert: {
          approval_date?: string | null
          approved_by?: string | null
          file_category?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          is_approved?: boolean | null
          mime_type?: string | null
          notes?: string | null
          print_order_id: string
          sent_at?: string | null
          sent_to_customer?: boolean | null
          upload_date?: string | null
          uploaded_by?: string | null
          version_number?: number | null
        }
        Update: {
          approval_date?: string | null
          approved_by?: string | null
          file_category?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          is_approved?: boolean | null
          mime_type?: string | null
          notes?: string | null
          print_order_id?: string
          sent_at?: string | null
          sent_to_customer?: boolean | null
          upload_date?: string | null
          uploaded_by?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "print_files_print_order_id_fkey"
            columns: ["print_order_id"]
            isOneToOne: false
            referencedRelation: "print_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      print_materials: {
        Row: {
          color: string | null
          cost_per_unit: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          material_name: string
          material_type: string
          thickness: string | null
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_name: string
          material_type: string
          thickness?: string | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_name?: string
          material_type?: string
          thickness?: string | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      print_orders: {
        Row: {
          actual_cost: number | null
          additional_materials: Json | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          design_completed_at: string | null
          design_notes: string | null
          design_started_at: string | null
          dimensions_depth: number | null
          dimensions_height: number | null
          dimensions_width: number | null
          estimated_cost: number | null
          finishing_type: string | null
          id: string
          material_id: string | null
          order_id: string
          print_completed_at: string | null
          print_order_number: string
          print_started_at: string | null
          print_type: string | null
          printing_notes: string | null
          quality_check_at: string | null
          quantity: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actual_cost?: number | null
          additional_materials?: Json | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          design_completed_at?: string | null
          design_notes?: string | null
          design_started_at?: string | null
          dimensions_depth?: number | null
          dimensions_height?: number | null
          dimensions_width?: number | null
          estimated_cost?: number | null
          finishing_type?: string | null
          id?: string
          material_id?: string | null
          order_id: string
          print_completed_at?: string | null
          print_order_number?: string
          print_started_at?: string | null
          print_type?: string | null
          printing_notes?: string | null
          quality_check_at?: string | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actual_cost?: number | null
          additional_materials?: Json | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          design_completed_at?: string | null
          design_notes?: string | null
          design_started_at?: string | null
          dimensions_depth?: number | null
          dimensions_height?: number | null
          dimensions_width?: number | null
          estimated_cost?: number | null
          finishing_type?: string | null
          id?: string
          material_id?: string | null
          order_id?: string
          print_completed_at?: string | null
          print_order_number?: string
          print_started_at?: string | null
          print_type?: string | null
          printing_notes?: string | null
          quality_check_at?: string | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_orders_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "print_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      print_tracking: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          performed_by: string | null
          print_order_id: string
          stage: string
          status: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          print_order_id: string
          stage: string
          status: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          print_order_id?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_tracking_print_order_id_fkey"
            columns: ["print_order_id"]
            isOneToOne: false
            referencedRelation: "print_orders"
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
      webhook_logs: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          response_data: Json | null
          status: string | null
          trigger_type: string | null
          updated_at: string | null
          webhook_type: string
          webhook_url: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          response_data?: Json | null
          status?: string | null
          trigger_type?: string | null
          updated_at?: string | null
          webhook_type: string
          webhook_url?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          response_data?: Json | null
          status?: string | null
          trigger_type?: string | null
          updated_at?: string | null
          webhook_type?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_campaigns"
            referencedColumns: ["id"]
          },
        ]
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
          error_message: string | null
          from_number: string
          id: string
          is_reply: boolean | null
          media_url: string | null
          message_content: string | null
          message_id: string | null
          message_type: string | null
          replied_at: string | null
          replied_by: string | null
          sent_at: string | null
          status: string | null
          timestamp: string | null
          to_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          from_number: string
          id?: string
          is_reply?: boolean | null
          media_url?: string | null
          message_content?: string | null
          message_id?: string | null
          message_type?: string | null
          replied_at?: string | null
          replied_by?: string | null
          sent_at?: string | null
          status?: string | null
          timestamp?: string | null
          to_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          from_number?: string
          id?: string
          is_reply?: boolean | null
          media_url?: string | null
          message_content?: string | null
          message_id?: string | null
          message_type?: string | null
          replied_at?: string | null
          replied_by?: string | null
          sent_at?: string | null
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
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "fk_whatsapp_messages_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
          },
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
      customer_order_balances: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          earliest_due_date: string | null
          last_order_date: string | null
          latest_due_date: string | null
          outstanding_balance: number | null
          total_orders_amount: number | null
          total_orders_count: number | null
          total_paid_amount: number | null
          unpaid_orders_count: number | null
        }
        Relationships: []
      }
      customer_outstanding_balances: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          earliest_due_date: string | null
          latest_due_date: string | null
          outstanding_balance: number | null
          unpaid_invoices_count: number | null
        }
        Relationships: []
      }
      invoice_payment_summary: {
        Row: {
          amount: number | null
          calculated_paid_amount: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          due_date: string | null
          id: string | null
          invoice_number: string | null
          is_deferred: boolean | null
          issue_date: string | null
          last_printed_at: string | null
          notes: string | null
          order_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_type: string | null
          print_count: number | null
          remaining_amount: number | null
          reminder_sent_at: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          whatsapp_sent_at: string | null
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
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
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
            referencedRelation: "order_payment_summary"
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
      order_payment_summary: {
        Row: {
          amount: number | null
          assigned_to: string | null
          attachment_urls: string[] | null
          calculated_paid_amount: number | null
          completion_date: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string | null
          notes: string | null
          order_number: string | null
          payment_notes: string | null
          payment_type: string | null
          priority: string | null
          progress: number | null
          remaining_amount: number | null
          service_id: string | null
          service_name: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
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
            referencedRelation: "customer_order_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding_balances"
            referencedColumns: ["customer_id"]
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
    }
    Functions: {
      assign_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      calculate_accounts_receivable_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      calculate_customer_order_balance: {
        Args: { customer_id_param: string }
        Returns: number
      }
      calculate_total_customer_orders_receivable: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      can_assign_roles: {
        Args: { user_id: string }
        Returns: boolean
      }
      check_delivery_delays: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_payment_delays: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      generate_google_review_link: {
        Args: { place_id: string }
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
      get_current_user_agency: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_group_member_count: {
        Args: { group_id_param: string }
        Returns: number
      }
      has_agency_role: {
        Args: { user_id_param: string; role_param: string }
        Returns: boolean
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
      is_agency_member: {
        Args: { user_id_param: string; agency_id_param: string }
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
      process_and_send_bulk_campaign: {
        Args: { campaign_id_param: string }
        Returns: Json
      }
      process_bulk_campaign: {
        Args: { campaign_id_param: string }
        Returns: undefined
      }
      process_missing_payment_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_pending_whatsapp_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      remove_user_role: {
        Args: {
          target_user_id: string
          old_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      send_whatsapp_notification: {
        Args: {
          customer_id_param: string
          template_name_param: string
          order_data?: Json
        }
        Returns: boolean
      }
      send_whatsapp_notification_improved: {
        Args: {
          customer_id_param: string
          template_name_param: string
          order_data?: Json
        }
        Returns: boolean
      }
      sync_accounts_receivable_balance: {
        Args: Record<PropertyKey, never>
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
