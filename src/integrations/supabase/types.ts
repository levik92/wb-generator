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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_profile_access_rate_limit: {
        Row: {
          access_count: number | null
          admin_user_id: string
          created_at: string | null
          id: string
          window_start: string | null
        }
        Insert: {
          access_count?: number | null
          admin_user_id: string
          created_at?: string | null
          id?: string
          window_start?: string | null
        }
        Update: {
          access_count?: number | null
          admin_user_id?: string
          created_at?: string | null
          id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          created_at: string
          id: string
          prompt_template: string
          prompt_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_template: string
          prompt_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_template?: string
          prompt_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_key_access_audit: {
        Row: {
          access_type: string
          accessed_by: string | null
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          key_id: string
          metadata: Json | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          key_id: string
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          key_id?: string
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_access_audit_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "user_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          category: string
          completed_at: string | null
          completed_cards: number | null
          created_at: string | null
          description: string
          error_message: string | null
          id: string
          product_images: Json | null
          product_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          tokens_cost: number | null
          total_cards: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          completed_cards?: number | null
          created_at?: string | null
          description: string
          error_message?: string | null
          id?: string
          product_images?: Json | null
          product_name: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          tokens_cost?: number | null
          total_cards?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_cards?: number | null
          created_at?: string | null
          description?: string
          error_message?: string | null
          id?: string
          product_images?: Json | null
          product_name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          tokens_cost?: number | null
          total_cards?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generation_tasks: {
        Row: {
          card_index: number
          card_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          image_url: string | null
          job_id: string
          last_error: string | null
          prompt: string | null
          retry_after: number | null
          retry_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          card_index: number
          card_type: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          job_id: string
          last_error?: string | null
          prompt?: string | null
          retry_after?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          card_index?: number
          card_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          job_id?: string
          last_error?: string | null
          prompt?: string | null
          retry_after?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          category: string | null
          competitors: string[] | null
          created_at: string
          description_requirements: string | null
          generation_type: string
          id: string
          input_data: Json | null
          keywords: string[] | null
          output_data: Json | null
          product_name: string | null
          status: string
          tokens_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          description_requirements?: string | null
          generation_type: string
          id?: string
          input_data?: Json | null
          keywords?: string[] | null
          output_data?: Json | null
          product_name?: string | null
          status?: string
          tokens_used: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          description_requirements?: string | null
          generation_type?: string
          id?: string
          input_data?: Json | null
          keywords?: string[] | null
          output_data?: Json | null
          product_name?: string | null
          status?: string
          tokens_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          tag: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          tag: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          tag?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_read_status: {
        Row: {
          id: string
          news_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          news_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          news_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_read_status_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_packages: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          price: number
          tokens: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          tokens: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          tokens?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          package_name: string
          status: string
          tokens_amount: number
          updated_at: string
          user_id: string
          yookassa_payment_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          package_name: string
          status?: string
          tokens_amount: number
          updated_at?: string
          user_id: string
          yookassa_payment_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          package_name?: string
          status?: string
          tokens_amount?: number
          updated_at?: string
          user_id?: string
          yookassa_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access_audit: {
        Row: {
          access_reason: string | null
          access_type: string
          accessed_by: string
          accessed_profile_id: string
          created_at: string | null
          fields_accessed: string[] | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          access_reason?: string | null
          access_type: string
          accessed_by: string
          accessed_profile_id: string
          created_at?: string | null
          fields_accessed?: string[] | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          access_reason?: string | null
          access_type?: string
          accessed_by?: string
          accessed_profile_id?: string
          created_at?: string | null
          fields_accessed?: string[] | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_blocked: boolean
          login_count: number
          referral_code: string | null
          referred_by: string | null
          tokens_balance: number
          updated_at: string
          wb_connected: boolean
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          login_count?: number
          referral_code?: string | null
          referred_by?: string | null
          tokens_balance?: number
          updated_at?: string
          wb_connected?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          login_count?: number
          referral_code?: string | null
          referred_by?: string | null
          tokens_balance?: number
          updated_at?: string
          wb_connected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promocode_uses: {
        Row: {
          id: string
          promocode_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          promocode_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          promocode_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocode_uses_promocode_id_fkey"
            columns: ["promocode_id"]
            isOneToOne: false
            referencedRelation: "promocodes"
            referencedColumns: ["id"]
          },
        ]
      }
      promocodes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          type: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          type: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          type?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
          tokens_awarded: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
          tokens_awarded?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
          tokens_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals_completed: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          referred_id: string
          referrer_id: string
          tokens_awarded: number
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          referred_id: string
          referrer_id: string
          tokens_awarded?: number
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          referred_id?: string
          referrer_id?: string
          tokens_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "referrals_completed_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_description: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_description: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_description?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          access_count: number | null
          created_at: string
          encrypted_key: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_version: number | null
          last_used_at: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string
          encrypted_key: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_version?: number | null
          last_used_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number | null
          created_at?: string
          encrypted_key?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_version?: number | null
          last_used_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          referral_code: string
          referred_by: string
          tokens_balance: number
          updated_at: string
          wb_connected: boolean
        }[]
      }
      admin_get_profile: {
        Args: { access_reason?: string; target_user_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          referral_code: string
          tokens_balance: number
          wb_connected: boolean
        }[]
      }
      can_access_payment: {
        Args: { payment_user_id: string }
        Returns: boolean
      }
      check_admin_profile_access_rate: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_payment_summary: {
        Args: { payment_ids: string[] }
        Returns: {
          amount_masked: string
          created_at: string
          id: string
          package_name: string
          status: string
          user_id: string
        }[]
      }
      get_public_profile_info: {
        Args: { profile_id: string }
        Returns: {
          created_at: string
          full_name: string
          id: string
        }[]
      }
      get_user_api_key_decrypted: {
        Args: { provider_name: string; user_id_param: string }
        Returns: string
      }
      get_user_api_key_masked: {
        Args: { provider_name: string }
        Returns: string
      }
      has_active_api_key: {
        Args: { provider_name: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          action_type_param: string
          admin_user_id_param: string
          ip_address_param?: unknown
          new_values_param?: Json
          old_values_param?: Json
          resource_id_param?: string
          resource_type_param: string
          user_agent_param?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          event_description_param: string
          event_type_param: string
          ip_address_param?: unknown
          metadata_param?: Json
          user_agent_param?: string
          user_id_param: string
        }
        Returns: string
      }
      process_payment_success: {
        Args: { payment_id_param: string }
        Returns: boolean
      }
      refund_tokens: {
        Args: {
          reason_text?: string
          tokens_amount: number
          user_id_param: string
        }
        Returns: boolean
      }
      spend_tokens: {
        Args: { tokens_amount: number; user_id_param: string }
        Returns: boolean
      }
      store_user_api_key: {
        Args: { api_key: string; provider_name: string }
        Returns: boolean
      }
      store_user_api_key_secure: {
        Args: { api_key: string; provider_name: string }
        Returns: boolean
      }
      track_api_key_access: {
        Args: { key_id: string }
        Returns: undefined
      }
      update_job_progress: {
        Args: { job_id_param: string }
        Returns: undefined
      }
      use_promocode: {
        Args: { code_param: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      job_status: "pending" | "processing" | "completed" | "failed"
      task_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "retrying"
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
      app_role: ["admin", "user"],
      job_status: ["pending", "processing", "completed", "failed"],
      task_status: ["pending", "processing", "completed", "failed", "retrying"],
    },
  },
} as const
