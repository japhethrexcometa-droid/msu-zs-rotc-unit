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
      announcements: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          cadet_id: string
          id: string
          notes: string | null
          scan_time: string | null
          scanned_by: string | null
          session_id: string
          status: string
        }
        Insert: {
          cadet_id: string
          id?: string
          notes?: string | null
          scan_time?: string | null
          scanned_by?: string | null
          session_id: string
          status: string
        }
        Update: {
          cadet_id?: string
          id?: string
          notes?: string | null
          scan_time?: string | null
          scanned_by?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_requests: {
        Row: {
          beneficiary_name: string | null
          beneficiary_relationship: string | null
          blood_type: string | null
          contact_number: string
          course_year: string
          created_at: string | null
          date_of_birth: string
          email: string
          email_sent: boolean | null
          emergency_contact: string
          emergency_name: string
          emergency_relationship: string
          first_name: string
          gender: string
          height_feet: string | null
          home_address: string
          id: string
          id_number: string
          last_name: string
          middle_initial: string | null
          ms_subject: string
          ms_title: string
          platoon: string | null
          rejection_reason: string | null
          religion: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string | null
          school: string
          semester: string
          status: string
          suffix: string | null
          updated_at: string | null
          year_class: string | null
          year_level: string | null
        }
        Insert: {
          beneficiary_name?: string | null
          beneficiary_relationship?: string | null
          blood_type?: string | null
          contact_number: string
          course_year: string
          created_at?: string | null
          date_of_birth: string
          email: string
          email_sent?: boolean | null
          emergency_contact: string
          emergency_name: string
          emergency_relationship: string
          first_name: string
          gender: string
          height_feet?: string | null
          home_address: string
          id?: string
          id_number: string
          last_name: string
          middle_initial?: string | null
          ms_subject?: string
          ms_title?: string
          platoon?: string | null
          rejection_reason?: string | null
          religion?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          school: string
          semester?: string
          status?: string
          suffix?: string | null
          updated_at?: string | null
          year_class?: string | null
          year_level?: string | null
        }
        Update: {
          beneficiary_name?: string | null
          beneficiary_relationship?: string | null
          blood_type?: string | null
          contact_number?: string
          course_year?: string
          created_at?: string | null
          date_of_birth?: string
          email?: string
          email_sent?: boolean | null
          emergency_contact?: string
          emergency_name?: string
          emergency_relationship?: string
          first_name?: string
          gender?: string
          height_feet?: string | null
          home_address?: string
          id?: string
          id_number?: string
          last_name?: string
          middle_initial?: string | null
          ms_subject?: string
          ms_title?: string
          platoon?: string | null
          rejection_reason?: string | null
          religion?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          school?: string
          semester?: string
          status?: string
          suffix?: string | null
          updated_at?: string | null
          year_class?: string | null
          year_level?: string | null
        }
        Relationships: []
      }
      pull_out_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cadet_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          reason: string
          requested_by: string
          returned_by: string | null
          scanned_out_by: string | null
          session_id: string | null
          status: string
          time_in: string | null
          time_out: string | null
          training_day: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cadet_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          reason: string
          requested_by: string
          returned_by?: string | null
          scanned_out_by?: string | null
          session_id?: string | null
          status?: string
          time_in?: string | null
          time_out?: string | null
          training_day?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cadet_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          reason?: string
          requested_by?: string
          returned_by?: string | null
          scanned_out_by?: string | null
          session_id?: string | null
          status?: string
          time_in?: string | null
          time_out?: string | null
          training_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pull_out_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_token_rotation_log: {
        Row: {
          id: string
          new_token: string | null
          old_token: string | null
          rotated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          new_token?: string | null
          old_token?: string | null
          rotated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          new_token?: string | null
          old_token?: string | null
          rotated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scan_audit_logs: {
        Row: {
          cadet_id: string | null
          created_at: string
          id: string
          outcome: string
          payload_preview: string | null
          reason: string | null
          scanned_by: string | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          cadet_id?: string | null
          created_at?: string
          id?: string
          outcome: string
          payload_preview?: string | null
          reason?: string | null
          scanned_by?: string | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          cadet_id?: string | null
          created_at?: string
          id?: string
          outcome?: string
          payload_preview?: string | null
          reason?: string | null
          scanned_by?: string | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_audit_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          created_by: string | null
          cutoff_time: string | null
          id: string
          late_time: string | null
          session_date: string
          session_type: string
          start_time: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cutoff_time?: string | null
          id?: string
          late_time?: string | null
          session_date?: string
          session_type: string
          start_time?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cutoff_time?: string | null
          id?: string
          late_time?: string | null
          session_date?: string
          session_type?: string
          start_time?: string | null
          status?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      token_generation_log: {
        Row: {
          generated_at: string | null
          id: string
          role: string
          token: string
          user_id: string | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          role: string
          token: string
          user_id?: string | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          role?: string
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          blood_type: string | null
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          full_name: string
          gender: string | null
          id: string
          id_number: string
          is_active: boolean | null
          is_deleted: boolean
          last_qr_regen_at: string | null
          photo_url: string | null
          platoon: string | null
          qr_needs_review: boolean | null
          qr_regen_count: number
          qr_token: string | null
          role: string
          school: string | null
          short_token: string | null
          updated_at: string | null
          year_class: string | null
          year_level: string | null
        }
        Insert: {
          blood_type?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_number: string
          is_active?: boolean | null
          is_deleted?: boolean
          last_qr_regen_at?: string | null
          photo_url?: string | null
          platoon?: string | null
          qr_needs_review?: boolean | null
          qr_regen_count?: number
          qr_token?: string | null
          role: string
          school?: string | null
          short_token?: string | null
          updated_at?: string | null
          year_class?: string | null
          year_level?: string | null
        }
        Update: {
          blood_type?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_number?: string
          is_active?: boolean | null
          is_deleted?: boolean
          last_qr_regen_at?: string | null
          photo_url?: string | null
          platoon?: string | null
          qr_needs_review?: boolean | null
          qr_regen_count?: number
          qr_token?: string | null
          role?: string
          school?: string | null
          short_token?: string | null
          updated_at?: string | null
          year_class?: string | null
          year_level?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_access:
        | { Args: never; Returns: boolean }
        | { Args: { user_role: string }; Returns: boolean }
      get_my_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
