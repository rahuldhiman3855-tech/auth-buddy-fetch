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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      creators: {
        Row: {
          bio: string | null
          category: string | null
          cover_pic: string | null
          discovered_at: string
          follower_count: number | null
          id: string
          is_verified: boolean | null
          name: string
          official_id: string
          post_count: number | null
          profile_pic: string | null
          updated_at: string
          username: string
          video_count: number | null
        }
        Insert: {
          bio?: string | null
          category?: string | null
          cover_pic?: string | null
          discovered_at?: string
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          name?: string
          official_id: string
          post_count?: number | null
          profile_pic?: string | null
          updated_at?: string
          username: string
          video_count?: number | null
        }
        Update: {
          bio?: string | null
          category?: string | null
          cover_pic?: string | null
          discovered_at?: string
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          name?: string
          official_id?: string
          post_count?: number | null
          profile_pic?: string | null
          updated_at?: string
          username?: string
          video_count?: number | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          creator_id: string
          creator_name: string | null
          creator_profile_pic: string | null
          creator_username: string | null
          duration: number | null
          file_size_mb: number | null
          id: string
          is_premium: boolean | null
          like_count: number | null
          location: string | null
          media_url: string | null
          official_id: string
          post_date: string | null
          price: number | null
          thumbnail_url: string | null
          type: string | null
          view_count: number | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          creator_id: string
          creator_name?: string | null
          creator_profile_pic?: string | null
          creator_username?: string | null
          duration?: number | null
          file_size_mb?: number | null
          id?: string
          is_premium?: boolean | null
          like_count?: number | null
          location?: string | null
          media_url?: string | null
          official_id: string
          post_date?: string | null
          price?: number | null
          thumbnail_url?: string | null
          type?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          creator_id?: string
          creator_name?: string | null
          creator_profile_pic?: string | null
          creator_username?: string | null
          duration?: number | null
          file_size_mb?: number | null
          id?: string
          is_premium?: boolean | null
          like_count?: number | null
          location?: string | null
          media_url?: string | null
          official_id?: string
          post_date?: string | null
          price?: number | null
          thumbnail_url?: string | null
          type?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          created_at: string | null
          creator_name: string | null
          creator_username: string | null
          creators_done: number | null
          creators_total: number | null
          id: string
          message: string | null
          posts_synced: number | null
          run_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          creator_name?: string | null
          creator_username?: string | null
          creators_done?: number | null
          creators_total?: number | null
          id?: string
          message?: string | null
          posts_synced?: number | null
          run_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          creator_name?: string | null
          creator_username?: string | null
          creators_done?: number | null
          creators_total?: number | null
          id?: string
          message?: string | null
          posts_synced?: number | null
          run_id?: string
          status?: string | null
        }
        Relationships: []
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
