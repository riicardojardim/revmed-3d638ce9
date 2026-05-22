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
      ai_usage_log: {
        Row: {
          completion_tokens: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number
          id: string
          kind: string
          metadata: Json
          model: string
          prompt_tokens: number
          station_id: string | null
          status: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          kind: string
          metadata?: Json
          model: string
          prompt_tokens?: number
          station_id?: string | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          kind?: string
          metadata?: Json
          model?: string
          prompt_tokens?: number
          station_id?: string | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      attempts: {
        Row: {
          checked_items: string[]
          created_at: string
          earned: number
          id: string
          notes: string | null
          professor_feedback: string | null
          professor_score: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string | null
          score: number
          simulado_id: string | null
          simulado_name: string | null
          simulado_station_index: number | null
          simulado_total_stations: number | null
          specialty: string | null
          station_id: string
          station_title: string | null
          status: string
          total_points: number
          used_seconds: number
          user_id: string
        }
        Insert: {
          checked_items?: string[]
          created_at?: string
          earned?: number
          id?: string
          notes?: string | null
          professor_feedback?: string | null
          professor_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          score?: number
          simulado_id?: string | null
          simulado_name?: string | null
          simulado_station_index?: number | null
          simulado_total_stations?: number | null
          specialty?: string | null
          station_id: string
          station_title?: string | null
          status?: string
          total_points?: number
          used_seconds?: number
          user_id: string
        }
        Update: {
          checked_items?: string[]
          created_at?: string
          earned?: number
          id?: string
          notes?: string | null
          professor_feedback?: string | null
          professor_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          score?: number
          simulado_id?: string | null
          simulado_name?: string | null
          simulado_station_index?: number | null
          simulado_total_stations?: number | null
          specialty?: string | null
          station_id?: string
          station_title?: string | null
          status?: string
          total_points?: number
          used_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      community_post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_stations: {
        Row: {
          bibliographic_references: Json
          candidate_task: string
          case_description: string | null
          clinical_case: string
          common_mistakes: string | null
          competencies: string[]
          created_at: string
          created_by: string
          deliverable_materials: Json
          difficulty: string
          duration_minutes: number
          educational_goal: string | null
          evaluator_notes: string | null
          expected_conduct: string | null
          id: string
          patient_info: string | null
          patient_profile: Json
          patient_script: string | null
          post_materials: string | null
          published: boolean
          scoring_criteria: string | null
          specialty: string
          support_materials: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bibliographic_references?: Json
          candidate_task: string
          case_description?: string | null
          clinical_case: string
          common_mistakes?: string | null
          competencies?: string[]
          created_at?: string
          created_by: string
          deliverable_materials?: Json
          difficulty?: string
          duration_minutes?: number
          educational_goal?: string | null
          evaluator_notes?: string | null
          expected_conduct?: string | null
          id?: string
          patient_info?: string | null
          patient_profile?: Json
          patient_script?: string | null
          post_materials?: string | null
          published?: boolean
          scoring_criteria?: string | null
          specialty: string
          support_materials?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bibliographic_references?: Json
          candidate_task?: string
          case_description?: string | null
          clinical_case?: string
          common_mistakes?: string | null
          competencies?: string[]
          created_at?: string
          created_by?: string
          deliverable_materials?: Json
          difficulty?: string
          duration_minutes?: number
          educational_goal?: string | null
          evaluator_notes?: string | null
          expected_conduct?: string | null
          id?: string
          patient_info?: string | null
          patient_profile?: Json
          patient_script?: string | null
          post_materials?: string | null
          published?: boolean
          scoring_criteria?: string | null
          specialty?: string
          support_materials?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          from_user: string
          id: string
          read_at: string | null
          to_user: string
        }
        Insert: {
          body: string
          created_at?: string
          from_user: string
          id?: string
          read_at?: string | null
          to_user: string
        }
        Update: {
          body?: string
          created_at?: string
          from_user?: string
          id?: string
          read_at?: string | null
          to_user?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          position: number
          published: boolean
          specialty: string
          station_id: string | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          position?: number
          published?: boolean
          specialty: string
          station_id?: string | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          position?: number
          published?: boolean
          specialty?: string
          station_id?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "custom_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          card_id: string
          created_at: string
          ease: number
          id: string
          interval_days: number
          last_quality: number | null
          last_time_seconds: number
          next_review_at: string
          reviews_count: number
          total_time_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          ease?: number
          id?: string
          interval_days?: number
          last_quality?: number | null
          last_time_seconds?: number
          next_review_at?: string
          reviews_count?: number
          total_time_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          ease?: number
          id?: string
          interval_days?: number
          last_quality?: number | null
          last_time_seconds?: number
          next_review_at?: string
          reviews_count?: number
          total_time_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          created_by: string
          deck: string | null
          deck_id: string | null
          front: string
          id: string
          position: number
          published: boolean
          specialty: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          back: string
          created_at?: string
          created_by: string
          deck?: string | null
          deck_id?: string | null
          front: string
          id?: string
          position?: number
          published?: boolean
          specialty: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          back?: string
          created_at?: string
          created_by?: string
          deck?: string | null
          deck_id?: string | null
          front?: string
          id?: string
          position?: number
          published?: boolean
          specialty?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user: string
          id: string
          responded_at: string | null
          status: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          responded_at?: string | null
          status?: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          responded_at?: string | null
          status?: string
          to_user?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          allows_ator: boolean
          allows_candidato: boolean
          created_at: string
          description: string | null
          features: Json
          id: string
          name: string
          price_cents: number
          slug: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allows_ator?: boolean
          allows_candidato?: boolean
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          name: string
          price_cents?: number
          slug: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allows_ator?: boolean
          allows_candidato?: boolean
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          name?: string
          price_cents?: number
          slug?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          exam_year: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          selected_plan: string | null
          title: string | null
          updated_at: string
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          exam_year?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          selected_plan?: string | null
          title?: string | null
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          exam_year?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          selected_plan?: string | null
          title?: string | null
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      room_evaluations: {
        Row: {
          candidate_id: string | null
          checks: Json
          created_at: string
          evaluator_id: string
          final_feedback: string | null
          final_score: number | null
          id: string
          item_comments: Json
          preview_for_candidate: boolean
          room_id: string
          station_id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          checks?: Json
          created_at?: string
          evaluator_id: string
          final_feedback?: string | null
          final_score?: number | null
          id?: string
          item_comments?: Json
          preview_for_candidate?: boolean
          room_id: string
          station_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          checks?: Json
          created_at?: string
          evaluator_id?: string
          final_feedback?: string | null
          final_score?: number | null
          id?: string
          item_comments?: Json
          preview_for_candidate?: boolean
          room_id?: string
          station_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_evaluations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "training_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_invites: {
        Row: {
          created_at: string
          from_user: string
          id: string
          responded_at: string | null
          room_id: string
          station_id: string
          status: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          responded_at?: string | null
          room_id: string
          station_id: string
          status?: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          responded_at?: string | null
          room_id?: string
          station_id?: string
          status?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "training_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_material_deliveries: {
        Row: {
          delivered_at: string
          delivered_by: string
          id: string
          material_content: string | null
          material_description: string | null
          material_id: string
          material_image_url: string | null
          material_name: string
          material_type: string | null
          room_id: string
          station_id: string
        }
        Insert: {
          delivered_at?: string
          delivered_by: string
          id?: string
          material_content?: string | null
          material_description?: string | null
          material_id: string
          material_image_url?: string | null
          material_name: string
          material_type?: string | null
          room_id: string
          station_id?: string
        }
        Update: {
          delivered_at?: string
          delivered_by?: string
          id?: string
          material_content?: string | null
          material_description?: string | null
          material_id?: string
          material_image_url?: string | null
          material_name?: string
          material_type?: string | null
          room_id?: string
          station_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          colors: Json
          contact_email: string | null
          created_at: string
          custom_body_html: string | null
          custom_head_html: string | null
          favicon_url: string | null
          fb_pixel_id: string | null
          ga4_id: string | null
          gtm_id: string | null
          id: string
          intro_animation_variant: string
          is_singleton: boolean
          logo_url: string | null
          meta_capi_token: string | null
          privacy_md: string | null
          site_name: string
          tagline: string | null
          terms_md: string | null
          tiktok_pixel_id: string | null
          updated_at: string
          urgency_banner_text: string | null
          whatsapp_banner_enabled: boolean
          whatsapp_banner_label: string | null
          whatsapp_banner_url: string | null
        }
        Insert: {
          colors?: Json
          contact_email?: string | null
          created_at?: string
          custom_body_html?: string | null
          custom_head_html?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          id?: string
          intro_animation_variant?: string
          is_singleton?: boolean
          logo_url?: string | null
          meta_capi_token?: string | null
          privacy_md?: string | null
          site_name?: string
          tagline?: string | null
          terms_md?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string
          urgency_banner_text?: string | null
          whatsapp_banner_enabled?: boolean
          whatsapp_banner_label?: string | null
          whatsapp_banner_url?: string | null
        }
        Update: {
          colors?: Json
          contact_email?: string | null
          created_at?: string
          custom_body_html?: string | null
          custom_head_html?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          id?: string
          intro_animation_variant?: string
          is_singleton?: boolean
          logo_url?: string | null
          meta_capi_token?: string | null
          privacy_md?: string | null
          site_name?: string
          tagline?: string | null
          terms_md?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string
          urgency_banner_text?: string | null
          whatsapp_banner_enabled?: boolean
          whatsapp_banner_label?: string | null
          whatsapp_banner_url?: string | null
        }
        Relationships: []
      }
      station_checklist_items: {
        Row: {
          category: string
          created_at: string
          description: string
          helper_text: string | null
          id: string
          levels: Json
          order_index: number
          points: number
          station_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          helper_text?: string | null
          id?: string
          levels?: Json
          order_index?: number
          points?: number
          station_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          helper_text?: string | null
          id?: string
          levels?: Json
          order_index?: number
          points?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_checklist_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "custom_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          clinical_picture: string | null
          conduct: string | null
          content_md: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          definition: string | null
          diagnosis: string | null
          difficulty: string
          high_yield: boolean
          id: string
          key_points: string | null
          pitfalls: string | null
          position: number
          published: boolean
          read_time_minutes: number
          specialty: string
          station_id: string | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          clinical_picture?: string | null
          conduct?: string | null
          content_md: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          definition?: string | null
          diagnosis?: string | null
          difficulty?: string
          high_yield?: boolean
          id?: string
          key_points?: string | null
          pitfalls?: string | null
          position?: number
          published?: boolean
          read_time_minutes?: number
          specialty: string
          station_id?: string | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          clinical_picture?: string | null
          conduct?: string | null
          content_md?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          definition?: string | null
          diagnosis?: string | null
          difficulty?: string
          high_yield?: boolean
          id?: string
          key_points?: string | null
          pitfalls?: string | null
          position?: number
          published?: boolean
          read_time_minutes?: number
          specialty?: string
          station_id?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      training_room_participants: {
        Row: {
          display_name: string | null
          id: string
          is_ready: boolean
          joined_at: string
          last_seen_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_seen_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_seen_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "training_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      training_rooms: {
        Row: {
          actor_ready: boolean
          candidate_ready: boolean
          code: string
          created_at: string
          duration_minutes: number | null
          evaluated_candidate_id: string | null
          finished_at: string | null
          host_id: string
          id: string
          mode: string
          simulado_id: string | null
          simulado_index: number | null
          simulado_name: string | null
          simulado_total: number | null
          started_at: string | null
          starting_at: string | null
          station_id: string
          station_title: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_ready?: boolean
          candidate_ready?: boolean
          code: string
          created_at?: string
          duration_minutes?: number | null
          evaluated_candidate_id?: string | null
          finished_at?: string | null
          host_id: string
          id?: string
          mode?: string
          simulado_id?: string | null
          simulado_index?: number | null
          simulado_name?: string | null
          simulado_total?: number | null
          started_at?: string | null
          starting_at?: string | null
          station_id: string
          station_title: string
          status?: string
          updated_at?: string
        }
        Update: {
          actor_ready?: boolean
          candidate_ready?: boolean
          code?: string
          created_at?: string
          duration_minutes?: number | null
          evaluated_candidate_id?: string | null
          finished_at?: string | null
          host_id?: string
          id?: string
          mode?: string
          simulado_id?: string | null
          simulado_index?: number | null
          simulado_name?: string | null
          simulado_total?: number | null
          started_at?: string | null
          starting_at?: string | null
          station_id?: string
          station_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_active_session: {
        Row: {
          device_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          page: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          page?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          page?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      video_lessons: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_seconds: number
          id: string
          position: number
          published: boolean
          specialty: string | null
          title: string
          topic: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_seconds?: number
          id?: string
          position?: number
          published?: boolean
          specialty?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          position?: number
          published?: boolean
          specialty?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          birth_date: string
          cpf: string
          exam_year: string
          first_name: string
          full_name: string
          gender: string
          id: string
          last_name: string
          selected_plan: string
          title: string
          username: string
          whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_my_friends: {
        Args: never
        Returns: {
          avatar_url: string
          friended_at: string
          full_name: string
          id: string
          last_message_at: string
          unread_count: number
          username: string
        }[]
      }
      list_pending_friend_requests: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          from_user: string
          full_name: string
          request_id: string
          username: string
        }[]
      }
      list_station_buddies: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          is_friend: boolean
          last_shared_at: string
          request_from: string
          request_id: string
          request_status: string
          shared_rooms: number
          unread_count: number
          username: string
        }[]
      }
      lookup_login_email: { Args: { _identifier: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recent_invited_users: {
        Args: { _limit?: number }
        Returns: {
          allows_candidato: boolean
          avatar_url: string
          email: string
          full_name: string
          id: string
          last_invited_at: string
          username: string
        }[]
      }
      respond_room_invite: {
        Args: { _accept: boolean; _invite_id: string }
        Returns: {
          room_code: string
          room_id: string
        }[]
      }
      search_users_for_invite: {
        Args: { _q: string }
        Returns: {
          allows_candidato: boolean
          avatar_url: string
          email: string
          full_name: string
          id: string
          username: string
        }[]
      }
      send_friend_request: { Args: { _to_user: string }; Returns: string }
      send_room_invite: {
        Args: { _room_id: string; _station_id: string; _to_user: string }
        Returns: string
      }
      username_exists: { Args: { _username: string }; Returns: boolean }
    }
    Enums: {
      app_role: "aluno" | "professor" | "admin" | "mentor"
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
      app_role: ["aluno", "professor", "admin", "mentor"],
    },
  },
} as const
