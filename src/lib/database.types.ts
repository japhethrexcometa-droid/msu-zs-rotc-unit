export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          id_number: string
          full_name: string
          role: 'admin' | 'officer' | 'cadet'
          platoon: string | null
          designation: string | null
          photo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Insert>
      }
      attendance_sessions: {
        Row: {
          id: string
          session_date: string
          title: string
          location: string | null
          started_by: string
          qr_code: string
          is_active: boolean
          ended_at: string | null
          created_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at'>
        Update: Partial<Insert>
      }
      attendance_records: {
        Row: {
          id: string
          session_id: string
          user_id: string
          status: 'present' | 'late' | 'absent' | 'excused'
          scanned_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at'>
        Update: Partial<Insert>
      }
      enrollment_requests: {
        Row: {
          id: string
          id_number: string
          full_name: string
          role: 'officer' | 'cadet'
          platoon: string | null
          contact_number: string | null
          email: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at'>
        Update: Partial<Insert>
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          target_role: 'all' | 'officer' | 'cadet'
          is_pinned: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Insert>
      }
      pullout_requests: {
        Row: {
          id: string
          officer_id: string
          reason: string
          date_requested: string
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at'>
        Update: Partial<Insert>
      }
    }
    Views: {}
    Functions: {
      verify_login: {
        Args: { p_id_number: string; p_password: string }
        Returns: Array<{
          user_id: string
          full_name: string
          role: string
          platoon: string | null
          designation: string | null
          photo_url: string | null
          is_active: boolean
          id_number: string
        }>
      }
      set_session_context: {
        Args: { p_user_id: string; p_role: string }
        Returns: void
      }
      get_attendance_summary: {
        Args: { p_user_id: string; p_start_date?: string; p_end_date?: string }
        Returns: Array<{
          total_sessions: number
          present: number
          late: number
          absent: number
          excused: number
          attendance_rate: number
        }>
      }
    }
    Enums: {
      user_role: 'admin' | 'officer' | 'cadet'
      attendance_status: 'present' | 'late' | 'absent' | 'excused'
      enrollment_status: 'pending' | 'approved' | 'rejected'
    }
  }
}
