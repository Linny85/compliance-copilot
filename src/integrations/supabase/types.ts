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
      ai_systems: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          data_types: string[] | null
          deployment_status: string | null
          description: string | null
          id: string
          name: string
          purpose: string | null
          risk_classification: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          data_types?: string[] | null
          deployment_status?: string | null
          description?: string | null
          id?: string
          name: string
          purpose?: string | null
          risk_classification?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          data_types?: string[] | null
          deployment_status?: string | null
          description?: string | null
          id?: string
          name?: string
          purpose?: string | null
          risk_classification?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_systems_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity: string
          entity_id: string
          id: number
          ip: unknown
          payload: Json
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity: string
          entity_id: string
          id?: number
          ip?: unknown
          payload?: Json
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity?: string
          entity_id?: string
          id?: number
          ip?: unknown
          payload?: Json
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          company_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          meta_json: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          meta_json?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          meta_json?: Json | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      check_results: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          message: string | null
          outcome: string
          rule_id: string
          run_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          message?: string | null
          outcome: string
          rule_id: string
          run_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          message?: string | null
          outcome?: string
          rule_id?: string
          run_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "check_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "v_check_results_join"
            referencedColumns: ["rule_id"]
          },
          {
            foreignKeyName: "check_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "v_check_rules_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "check_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      check_rules: {
        Row: {
          code: string
          control_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          enabled: boolean
          id: string
          kind: string
          schedule: string | null
          severity: string
          spec: Json
          tenant_id: string
          title: string
        }
        Insert: {
          code: string
          control_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          kind: string
          schedule?: string | null
          severity?: string
          spec: Json
          tenant_id: string
          title: string
        }
        Update: {
          code?: string
          control_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          schedule?: string | null
          severity?: string
          spec?: Json
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_rules_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      check_runs: {
        Row: {
          finished_at: string | null
          id: string
          requested_by: string | null
          rule_id: string
          started_at: string
          status: string
          tenant_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          requested_by?: string | null
          rule_id: string
          started_at?: string
          status?: string
          tenant_id: string
          window_end: string
          window_start: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          requested_by?: string | null
          rule_id?: string
          started_at?: string
          status?: string
          tenant_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "check_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "v_check_results_join"
            referencedColumns: ["rule_id"]
          },
          {
            foreignKeyName: "check_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "v_check_rules_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          code: string
          created_at: string
          evidence_types: string[] | null
          framework_id: string
          id: string
          objective: string | null
          severity: string | null
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          evidence_types?: string[] | null
          framework_id: string
          id?: string
          objective?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          evidence_types?: string[] | null
          framework_id?: string
          id?: string
          objective?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_requests: {
        Row: {
          control_id: string
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          requested_by: string
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          control_id: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          requested_by: string
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          control_id?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          requested_by?: string
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_requests_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          control_id: string
          file_path: string
          file_size: number
          hash_sha256: string
          id: string
          mime_type: string | null
          note: string | null
          request_id: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          tenant_id: string
          uploaded_at: string
          uploaded_by: string
          verdict: string
        }
        Insert: {
          control_id: string
          file_path: string
          file_size: number
          hash_sha256: string
          id?: string
          mime_type?: string | null
          note?: string | null
          request_id?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          tenant_id: string
          uploaded_at?: string
          uploaded_by: string
          verdict?: string
        }
        Update: {
          control_id?: string
          file_path?: string
          file_size?: number
          hash_sha256?: string
          id?: string
          mime_type?: string | null
          note?: string | null
          request_id?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidences_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "evidence_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      frameworks: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          title: string
          version: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          version?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      nis2_risks: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          mitigation_plan: string | null
          risk_level: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          mitigation_plan?: string | null
          risk_level?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          mitigation_plan?: string | null
          risk_level?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nis2_risks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          duration_ms: number | null
          error_excerpt: string | null
          id: number
          run_id: string
          status_code: number | null
          tenant_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          id?: number
          run_id: string
          status_code?: number | null
          tenant_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          id?: number
          run_id?: string
          status_code?: number | null
          tenant_id?: string
        }
        Relationships: []
      }
      policy_templates: {
        Row: {
          body_md: string
          control_id: string
          created_at: string
          created_by: string
          id: string
          tenant_id: string
          title: string
          updated_at: string
          valid_from: string
          valid_to: string | null
          version: number
        }
        Insert: {
          body_md: string
          control_id: string
          created_at?: string
          created_by: string
          id?: string
          tenant_id: string
          title: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Update: {
          body_md?: string
          control_id?: string
          created_at?: string
          created_by?: string
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_templates_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          language: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          language?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      run_events_deadletter: {
        Row: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: number
          last_error: string | null
          original_id: number
          rule_code: string | null
          run_id: string
          started_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts: number
          created_at?: string
          finished_at?: string | null
          id?: number
          last_error?: string | null
          original_id: number
          rule_code?: string | null
          run_id: string
          started_at?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: number
          last_error?: string | null
          original_id?: number
          rule_code?: string | null
          run_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      run_events_queue: {
        Row: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: number
          last_error: string | null
          next_attempt_at: string
          processed_at: string | null
          rule_code: string | null
          run_id: string
          started_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: number
          last_error?: string | null
          next_attempt_at?: string
          processed_at?: string | null
          rule_code?: string | null
          run_id: string
          started_at?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: number
          last_error?: string | null
          next_attempt_at?: string
          processed_at?: string | null
          rule_code?: string | null
          run_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      scope_assignments: {
        Row: {
          control_id: string
          created_at: string
          id: string
          note: string | null
          status: string
          tenant_id: string
          unit_id: string
        }
        Insert: {
          control_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: string
          tenant_id: string
          unit_id: string
        }
        Update: {
          control_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          tenant_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_assignments_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "scope_units"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_units: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          owner_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          plan_id: string | null
          provider: string | null
          status: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id?: string | null
          provider?: string | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id?: string | null
          provider?: string | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          id: string
          notification_email: string | null
          notification_webhook_url: string | null
          tenant_id: string
          updated_at: string
          webhook_domain_allowlist: string[] | null
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notification_email?: string | null
          notification_webhook_url?: string | null
          tenant_id: string
          updated_at?: string
          webhook_domain_allowlist?: string[] | null
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notification_email?: string | null
          notification_webhook_url?: string | null
          tenant_id?: string
          updated_at?: string
          webhook_domain_allowlist?: string[] | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      Unternehmen: {
        Row: {
          address: string | null
          city: string | null
          company_size: string | null
          country: string | null
          created_at: string | null
          default_locale: string | null
          delete_code_hash: string
          erstellt_von: string | null
          id: string
          legal_name: string | null
          master_code_hash: string
          name: string
          sector: string | null
          street: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          vat_id: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          default_locale?: string | null
          delete_code_hash: string
          erstellt_von?: string | null
          id?: string
          legal_name?: string | null
          master_code_hash: string
          name: string
          sector?: string | null
          street?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vat_id?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          default_locale?: string | null
          delete_code_hash?: string
          erstellt_von?: string | null
          id?: string
          legal_name?: string | null
          master_code_hash?: string
          name?: string
          sector?: string | null
          street?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vat_id?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_check_results_join: {
        Row: {
          control_id: string | null
          created_at: string | null
          details: Json | null
          id: string | null
          message: string | null
          outcome: string | null
          rule_code: string | null
          rule_id: string | null
          rule_title: string | null
          run_id: string | null
          run_status: string | null
          severity: string | null
          tenant_id: string | null
          window_end: string | null
          window_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "check_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_rules_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
        ]
      }
      v_check_rules_active: {
        Row: {
          code: string | null
          control_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          enabled: boolean | null
          id: string | null
          kind: string | null
          schedule: string | null
          severity: string | null
          spec: Json | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          code?: string | null
          control_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string | null
          kind?: string | null
          schedule?: string | null
          severity?: string | null
          spec?: Json | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          code?: string | null
          control_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string | null
          kind?: string | null
          schedule?: string | null
          severity?: string | null
          spec?: Json | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_rules_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_notification_deliveries: { Args: never; Returns: undefined }
      cleanup_run_events: { Args: never; Returns: undefined }
      create_audit_log: {
        Args: {
          _action: string
          _actor_user_id: string
          _company_id: string
          _ip_address?: string
          _meta_json?: Json
          _target: string
        }
        Returns: string
      }
      get_user_company: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "master_admin" | "admin" | "member" | "editor"
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
      app_role: ["master_admin", "admin", "member", "editor"],
    },
  },
} as const
