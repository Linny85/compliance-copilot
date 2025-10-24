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
      approvals: {
        Row: {
          action: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          expires_at: string | null
          id: string
          reason: string | null
          requested_by: string
          resource_id: string
          resource_type: string
          status: string
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          requested_by: string
          resource_id: string
          resource_type: string
          status?: string
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          requested_by?: string
          resource_id?: string
          resource_type?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_tenant_id_fkey"
            columns: ["tenant_id"]
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
      ensemble_weight_history: {
        Row: {
          adjusted_at: string | null
          id: string
          mae: number | null
          reliability: number | null
          tenant_id: string
          weight_arima: number | null
          weight_bayes: number | null
          weight_gradient: number | null
        }
        Insert: {
          adjusted_at?: string | null
          id?: string
          mae?: number | null
          reliability?: number | null
          tenant_id: string
          weight_arima?: number | null
          weight_bayes?: number | null
          weight_gradient?: number | null
        }
        Update: {
          adjusted_at?: string | null
          id?: string
          mae?: number | null
          reliability?: number | null
          tenant_id?: string
          weight_arima?: number | null
          weight_bayes?: number | null
          weight_gradient?: number | null
        }
        Relationships: []
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
      explainability_feedback: {
        Row: {
          context: Json | null
          id: string
          noted_at: string
          noted_by: string | null
          signal_feature: string
          signal_key: string
          signal_metric: string
          tenant_id: string
          verdict: string
          weight: number
        }
        Insert: {
          context?: Json | null
          id?: string
          noted_at?: string
          noted_by?: string | null
          signal_feature: string
          signal_key: string
          signal_metric: string
          tenant_id: string
          verdict: string
          weight?: number
        }
        Update: {
          context?: Json | null
          id?: string
          noted_at?: string
          noted_by?: string | null
          signal_feature?: string
          signal_key?: string
          signal_metric?: string
          tenant_id?: string
          verdict?: string
          weight?: number
        }
        Relationships: []
      }
      explainability_signal_weights: {
        Row: {
          confidence: number
          feature: string
          id: string
          key: string
          mae_impact: number | null
          metric: string
          sample: number
          tenant_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          confidence?: number
          feature: string
          id?: string
          key: string
          mae_impact?: number | null
          metric: string
          sample?: number
          tenant_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          confidence?: number
          feature?: string
          id?: string
          key?: string
          mae_impact?: number | null
          metric?: string
          sample?: number
          tenant_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      explainability_signals: {
        Row: {
          created_at: string
          day: string
          direction: string | null
          feature: string
          id: string
          key: string
          metric: string
          p_value: number | null
          sample_size: number
          tenant_id: string
          value: number
        }
        Insert: {
          created_at?: string
          day: string
          direction?: string | null
          feature: string
          id?: string
          key: string
          metric: string
          p_value?: number | null
          sample_size?: number
          tenant_id: string
          value: number
        }
        Update: {
          created_at?: string
          day?: string
          direction?: string | null
          feature?: string
          id?: string
          key?: string
          metric?: string
          p_value?: number | null
          sample_size?: number
          tenant_id?: string
          value?: number
        }
        Relationships: []
      }
      feature_attribution: {
        Row: {
          computed_at: string
          factors: Json
          id: string
          tenant_id: string
          time_window: string
        }
        Insert: {
          computed_at?: string
          factors?: Json
          id?: string
          tenant_id: string
          time_window: string
        }
        Update: {
          computed_at?: string
          factors?: Json
          id?: string
          tenant_id?: string
          time_window?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_ensemble: {
        Row: {
          forecast_sr_90d: number | null
          generated_at: string | null
          id: string
          lower_ci: number | null
          model_arima: number | null
          model_bayes: number | null
          model_gradient: number | null
          tenant_id: string
          upper_ci: number | null
          weight_arima: number | null
          weight_bayes: number | null
          weight_gradient: number | null
        }
        Insert: {
          forecast_sr_90d?: number | null
          generated_at?: string | null
          id?: string
          lower_ci?: number | null
          model_arima?: number | null
          model_bayes?: number | null
          model_gradient?: number | null
          tenant_id: string
          upper_ci?: number | null
          weight_arima?: number | null
          weight_bayes?: number | null
          weight_gradient?: number | null
        }
        Update: {
          forecast_sr_90d?: number | null
          generated_at?: string | null
          id?: string
          lower_ci?: number | null
          model_arima?: number | null
          model_bayes?: number | null
          model_gradient?: number | null
          tenant_id?: string
          upper_ci?: number | null
          weight_arima?: number | null
          weight_bayes?: number | null
          weight_gradient?: number | null
        }
        Relationships: []
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
      helpbot_chunks: {
        Row: {
          chunk_no: number
          content: string
          doc_id: string
          embedding: string | null
          id: number
          tokens: number | null
        }
        Insert: {
          chunk_no: number
          content: string
          doc_id: string
          embedding?: string | null
          id?: number
          tokens?: number | null
        }
        Update: {
          chunk_no?: number
          content?: string
          doc_id?: string
          embedding?: string | null
          id?: number
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "helpbot_chunks_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "helpbot_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      helpbot_docs: {
        Row: {
          created_at: string | null
          doc_type: string | null
          file_sha256: string | null
          id: string
          jurisdiction: string | null
          lang: string | null
          source_uri: string
          title: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          doc_type?: string | null
          file_sha256?: string | null
          id?: string
          jurisdiction?: string | null
          lang?: string | null
          source_uri: string
          title: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          doc_type?: string | null
          file_sha256?: string | null
          id?: string
          jurisdiction?: string | null
          lang?: string | null
          source_uri?: string
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      helpbot_entities: {
        Row: {
          confidence: number | null
          created_at: string | null
          description: string | null
          embedding: string | null
          id: string
          label: string
          lang: string | null
          type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          label: string
          lang?: string | null
          type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          label?: string
          lang?: string | null
          type?: string | null
        }
        Relationships: []
      }
      helpbot_entity_links: {
        Row: {
          confidence: number | null
          created_at: string | null
          entity_id: string | null
          id: string
          message_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          message_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpbot_entity_links_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "helpbot_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpbot_entity_links_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "helpbot_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      helpbot_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          message_id: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpbot_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "helpbot_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      helpbot_inference_logs: {
        Row: {
          created_at: string | null
          entity_source: string | null
          entity_target: string | null
          id: string
          reasoning: string
        }
        Insert: {
          created_at?: string | null
          entity_source?: string | null
          entity_target?: string | null
          id?: string
          reasoning: string
        }
        Update: {
          created_at?: string | null
          entity_source?: string | null
          entity_target?: string | null
          id?: string
          reasoning?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpbot_inference_logs_entity_source_fkey"
            columns: ["entity_source"]
            isOneToOne: false
            referencedRelation: "helpbot_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpbot_inference_logs_entity_target_fkey"
            columns: ["entity_target"]
            isOneToOne: false
            referencedRelation: "helpbot_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      helpbot_logs: {
        Row: {
          base_url: string | null
          details: Json | null
          error_code: string | null
          func: string
          id: number
          latency_ms: number | null
          level: string
          message: string | null
          method: string | null
          path: string | null
          session_id: string | null
          status: number | null
          tenant_id: string | null
          ts: string
          using_proxy: boolean | null
        }
        Insert: {
          base_url?: string | null
          details?: Json | null
          error_code?: string | null
          func: string
          id?: number
          latency_ms?: number | null
          level: string
          message?: string | null
          method?: string | null
          path?: string | null
          session_id?: string | null
          status?: number | null
          tenant_id?: string | null
          ts?: string
          using_proxy?: boolean | null
        }
        Update: {
          base_url?: string | null
          details?: Json | null
          error_code?: string | null
          func?: string
          id?: number
          latency_ms?: number | null
          level?: string
          message?: string | null
          method?: string | null
          path?: string | null
          session_id?: string | null
          status?: number | null
          tenant_id?: string | null
          ts?: string
          using_proxy?: boolean | null
        }
        Relationships: []
      }
      helpbot_messages: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          relevance: number | null
          role: string | null
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          relevance?: number | null
          role?: string | null
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          relevance?: number | null
          role?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpbot_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "helpbot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      helpbot_relations: {
        Row: {
          created_at: string | null
          id: string
          inferred: boolean | null
          last_feedback: string | null
          relation: string | null
          source: string | null
          support_count: number | null
          target: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inferred?: boolean | null
          last_feedback?: string | null
          relation?: string | null
          source?: string | null
          support_count?: number | null
          target?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inferred?: boolean | null
          last_feedback?: string | null
          relation?: string | null
          source?: string | null
          support_count?: number | null
          target?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "helpbot_relations_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "helpbot_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpbot_relations_target_fkey"
            columns: ["target"]
            isOneToOne: false
            referencedRelation: "helpbot_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      helpbot_sessions: {
        Row: {
          id: string
          jurisdiction: string | null
          lang: string | null
          last_activity: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          jurisdiction?: string | null
          lang?: string | null
          last_activity?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          jurisdiction?: string | null
          lang?: string | null
          last_activity?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      helpbot_summaries: {
        Row: {
          created_at: string | null
          id: string
          lang: string | null
          session_id: string | null
          summary: string
          tokens: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lang?: string | null
          session_id?: string | null
          summary: string
          tokens?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lang?: string | null
          session_id?: string | null
          summary?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "helpbot_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "helpbot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_dlq: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          dedupe_key: string | null
          event_type: string
          failed_at: string
          id: string
          last_error: string | null
          payload: Json
          tenant_id: string
        }
        Insert: {
          attempts: number
          channel: string
          created_at: string
          dedupe_key?: string | null
          event_type: string
          failed_at?: string
          id: string
          last_error?: string | null
          payload: Json
          tenant_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          event_type?: string
          failed_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      integration_outbox: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          dedupe_key: string | null
          delivered_at: string | null
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_outbox_archive: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          dedupe_key: string | null
          delivered_at: string | null
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          status?: string
          tenant_id?: string
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
      qa_monitor: {
        Row: {
          avg_latency_ms: number | null
          created_at: string | null
          failed_24h: number | null
          id: string
          last_run_at: string | null
          last_run_id: string | null
          last_run_status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avg_latency_ms?: number | null
          created_at?: string | null
          failed_24h?: number | null
          id?: string
          last_run_at?: string | null
          last_run_id?: string | null
          last_run_status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          avg_latency_ms?: number | null
          created_at?: string | null
          failed_24h?: number | null
          id?: string
          last_run_at?: string | null
          last_run_id?: string | null
          last_run_status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_results: {
        Row: {
          created_by: string | null
          failed: number
          finished_at: string | null
          id: string
          notes: string | null
          passed: number
          started_at: string
          suite: string
          tenant_id: string
          total: number
        }
        Insert: {
          created_by?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          passed?: number
          started_at?: string
          suite?: string
          tenant_id: string
          total?: number
        }
        Update: {
          created_by?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          passed?: number
          started_at?: string
          suite?: string
          tenant_id?: string
          total?: number
        }
        Relationships: []
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
          approval_required_for_untrusted: boolean | null
          created_at: string
          explainability_enabled: boolean | null
          id: string
          integration_jira_base_url: string | null
          integration_jira_enabled: boolean | null
          integration_jira_project_key: string | null
          integration_slack_enabled: boolean | null
          integration_slack_webhook_url: string | null
          notification_email: string | null
          notification_webhook_url: string | null
          settings: Json
          tenant_id: string
          updated_at: string
          webhook_domain_allowlist: string[] | null
          webhook_secret: string | null
        }
        Insert: {
          approval_required_for_untrusted?: boolean | null
          created_at?: string
          explainability_enabled?: boolean | null
          id?: string
          integration_jira_base_url?: string | null
          integration_jira_enabled?: boolean | null
          integration_jira_project_key?: string | null
          integration_slack_enabled?: boolean | null
          integration_slack_webhook_url?: string | null
          notification_email?: string | null
          notification_webhook_url?: string | null
          settings?: Json
          tenant_id: string
          updated_at?: string
          webhook_domain_allowlist?: string[] | null
          webhook_secret?: string | null
        }
        Update: {
          approval_required_for_untrusted?: boolean | null
          created_at?: string
          explainability_enabled?: boolean | null
          id?: string
          integration_jira_base_url?: string | null
          integration_jira_enabled?: boolean | null
          integration_jira_project_key?: string | null
          integration_slack_enabled?: boolean | null
          integration_slack_webhook_url?: string | null
          notification_email?: string | null
          notification_webhook_url?: string | null
          settings?: Json
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
      v_approvals_pending: {
        Row: {
          action: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          expires_at: string | null
          id: string | null
          reason: string | null
          requested_by: string | null
          requester_email: string | null
          requester_name: string | null
          resource_id: string | null
          resource_type: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
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
      v_compliance_summary: {
        Row: {
          failed: number | null
          last_run_at: string | null
          passed: number | null
          success_rate: number | null
          tenant_id: string | null
          total: number | null
          warnings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_current_tenant: {
        Row: {
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_sr_30d: {
        Row: {
          day: string | null
          passed: number | null
          sr: number | null
          tenant_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ensemble_weight_latest: {
        Row: {
          adjusted_at: string | null
          mae: number | null
          reliability: number | null
          tenant_id: string | null
          weight_arima: number | null
          weight_bayes: number | null
          weight_gradient: number | null
        }
        Relationships: []
      }
      v_explainability_top_30d: {
        Row: {
          computed_at: string | null
          tenant_id: string | null
          top_signals: Json | null
        }
        Relationships: []
      }
      v_explainability_top_weighted: {
        Row: {
          computed_at: string | null
          tenant_id: string | null
          top_signals_weighted: Json | null
        }
        Relationships: []
      }
      v_forecast_ensemble_latest: {
        Row: {
          forecast_sr_90d: number | null
          generated_at: string | null
          lower_ci: number | null
          tenant_id: string | null
          upper_ci: number | null
          weight_arima: number | null
          weight_bayes: number | null
          weight_gradient: number | null
        }
        Relationships: []
      }
      v_integration_pending: {
        Row: {
          attempts: number | null
          channel: string | null
          created_at: string | null
          dedupe_key: string | null
          delivered_at: string | null
          event_type: string | null
          id: string | null
          last_error: string | null
          next_attempt_at: string | null
          payload: Json | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rc_factors: {
        Row: {
          check_type: string | null
          fail_rate: number | null
          fails: number | null
          r_fail: number | null
          r_rate: number | null
          region: string | null
          rule_group: string | null
          tenant_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_root_cause_top: {
        Row: {
          computed_at: string | null
          tenant_id: string | null
          top_fails: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_relation_weight: {
        Args: { p_delta: number; p_relation_id: string }
        Returns: undefined
      }
      adjust_relevance: {
        Args: { p_delta: number; p_message_id: string }
        Returns: undefined
      }
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
      deadjobs_by_tenant: {
        Args: { since_ts: string }
        Returns: {
          cnt: number
          tenant_id: string
        }[]
      }
      deadjobs_top_errors: {
        Args: { since_ts: string; top_n?: number }
        Returns: {
          cnt: number
          err: string
        }[]
      }
      enqueue_integration_event: {
        Args: {
          _channel: string
          _dedupe_key?: string
          _event_type: string
          _payload: Json
          _tenant: string
        }
        Returns: string
      }
      feature_enabled: {
        Args: { _fallback?: boolean; _path: string[]; _tenant: string }
        Returns: boolean
      }
      get_graph_context: {
        Args: { p_entity_labels: string[]; p_limit: number }
        Returns: {
          entity: string
          lang: string
          neighbor: string
          relation: string
          type: string
          weight: number
        }[]
      }
      get_hybrid_rag_context: {
        Args: {
          p_chunk_limit?: number
          p_entity_limit?: number
          p_query_vec: string
        }
        Returns: {
          content: string
          lang: string
          relevance: number
          source_type: string
        }[]
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
      helpbot_search_chunks: {
        Args: { limit_k?: number; query_vec: string; where_sql?: string }
        Returns: {
          content: string
          doc_id: string
          sim: number
          source_uri: string
          title: string
        }[]
      }
      match_helpbot_entities: {
        Args: { match_count?: number; query_vec: string }
        Returns: {
          description: string
          id: string
          label: string
          lang: string
          similarity: number
          type: string
        }[]
      }
      ops_metrics: { Args: { p_lookback_hours?: number }; Returns: Json }
      outbox_archive_prune: { Args: { p_days?: number }; Returns: number }
      outbox_cleanup: {
        Args: { p_batch_limit?: number; p_retention_days?: number }
        Returns: Json
      }
      set_default_flags: { Args: { _tenant: string }; Returns: undefined }
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
