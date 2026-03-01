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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_banners: {
        Row: {
          banner_type: string
          created_at: string | null
          end_date: string | null
          gradient_from: string | null
          gradient_to: string | null
          id: string
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          message: string
          show_on_profile: boolean | null
          show_profile_dot: boolean | null
          start_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_type: string
          created_at?: string | null
          end_date?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          message: string
          show_on_profile?: boolean | null
          show_profile_dot?: boolean | null
          start_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_type?: string
          created_at?: string | null
          end_date?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          message?: string
          show_on_profile?: boolean | null
          show_profile_dot?: boolean | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_timetable_slots: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_timetable_slots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_timetable_slots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_with_note_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string | null
          credit_units: number
          department_id: string
          id: string
          level: number
          name: string
          semester: string
        }
        Insert: {
          code: string
          created_at?: string | null
          credit_units?: number
          department_id: string
          id?: string
          level?: number
          name: string
          semester?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          credit_units?: number
          department_id?: string
          id?: string
          level?: number
          name?: string
          semester?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string | null
          display_order: number | null
          faculty_id: string | null
          icon: string | null
          id: string
          is_visible: boolean
          name: string
          slug: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          faculty_id?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name: string
          slug: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          faculty_id?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "department_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_visible: boolean
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      lecture_notes: {
        Row: {
          course_id: string
          created_at: string | null
          file_path: string
          file_size: number
          id: string
          title: string
          uploaded_by: string
          uploaded_by_display: string
          views: number | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          file_path: string
          file_size: number
          id?: string
          title: string
          uploaded_by: string
          uploaded_by_display: string
          views?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          file_path?: string
          file_size?: number
          id?: string
          title?: string
          uploaded_by?: string
          uploaded_by_display?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_with_note_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_notes_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_notes_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_conversations: {
        Row: {
          id: string
          messages: Json
          pdf_file_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          messages?: Json
          pdf_file_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          messages?: Json
          pdf_file_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_conversations_pdf_file_id_fkey"
            columns: ["pdf_file_id"]
            isOneToOne: false
            referencedRelation: "pdf_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_files: {
        Row: {
          category_id: string | null
          created_at: string | null
          file_name: string
          file_size: number
          id: string
          is_favorite: boolean
          name: string
          storage_path: string
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          file_name: string
          file_size: number
          id?: string
          is_favorite?: boolean
          name: string
          storage_path: string
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          is_favorite?: boolean
          name?: string
          storage_path?: string
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_files_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_summaries: {
        Row: {
          created_at: string | null
          id: string
          pdf_file_id: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pdf_file_id: string
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pdf_file_id?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_summaries_pdf_file_id_fkey"
            columns: ["pdf_file_id"]
            isOneToOne: false
            referencedRelation: "pdf_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string | null
          default_category_id: string | null
          default_sort_order: string | null
          department_id: string | null
          discovery_source: string | null
          display_name: string | null
          email: string | null
          email_notifications_enabled: boolean | null
          financial_literacy_interest: boolean | null
          full_name: string | null
          id: string
          is_insider: boolean | null
          is_student: boolean | null
          nickname: string | null
          phone_number: string | null
          preferred_theme: string | null
          school: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          total_storage_used: number | null
          usage_reason: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          default_category_id?: string | null
          default_sort_order?: string | null
          department_id?: string | null
          discovery_source?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          financial_literacy_interest?: boolean | null
          full_name?: string | null
          id: string
          is_insider?: boolean | null
          is_student?: boolean | null
          nickname?: string | null
          phone_number?: string | null
          preferred_theme?: string | null
          school?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          total_storage_used?: number | null
          usage_reason?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          default_category_id?: string | null
          default_sort_order?: string | null
          department_id?: string | null
          discovery_source?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          financial_literacy_interest?: boolean | null
          full_name?: string | null
          id?: string
          is_insider?: boolean | null
          is_student?: boolean | null
          nickname?: string | null
          phone_number?: string | null
          preferred_theme?: string | null
          school?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          total_storage_used?: number | null
          usage_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guides: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          pdf_file_id: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          pdf_file_id: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          pdf_file_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_guides_pdf_file_id_fkey"
            columns: ["pdf_file_id"]
            isOneToOne: false
            referencedRelation: "pdf_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          notification_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          notification_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          notification_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          activities: Json
          activity_summary: Json | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean
          login_at: string
          logout_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activities?: Json
          activity_summary?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          login_at?: string
          logout_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activities?: Json
          activity_summary?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          login_at?: string
          logout_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      courses_with_note_counts: {
        Row: {
          code: string | null
          created_at: string | null
          credit_units: number | null
          department_id: string | null
          id: string | null
          level: number | null
          name: string | null
          note_count: number | null
          semester: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      public_rep_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department_id: string | null
          display_name: string | null
          id: string | null
          is_insider: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          display_name?: string | null
          id?: string | null
          is_insider?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          display_name?: string | null
          id?: string | null
          is_insider?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_rep_public_info: {
        Args: { rep_user_id: string }
        Returns: {
          avatar_url: string
          department_id: string
          display_name: string
          id: string
        }[]
      }
      get_user_profile_summary: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          department_id: string
          department_name: string
          display_name: string
          email: string
          full_name: string
          id: string
          pdf_count: number
          total_storage_used: number
          unread_notification_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_storage: {
        Args: { p_size_delta: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "rep"
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
      app_role: ["admin", "user", "rep"],
    },
  },
} as const
