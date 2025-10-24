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
      assets: {
        Row: {
          created_at: string
          criticality: string
          id: string
          metadata: Json | null
          name: string
          ou_id: string | null
          owner_id: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criticality?: string
          id?: string
          metadata?: Json | null
          name: string
          ou_id?: string | null
          owner_id?: string | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criticality?: string
          id?: string
          metadata?: Json | null
          name?: string
          ou_id?: string | null
          owner_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_ou_id_fkey"
            columns: ["ou_id"]
            isOneToOne: false
            referencedRelation: "orgunits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
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
          chain_ok: boolean | null
          chain_order: number | null
          created_at: string
          entity: string
          entity_id: string
          event_hash: string | null
          id: number
          ip: unknown
          payload: Json
          prev_hash: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          chain_ok?: boolean | null
          chain_order?: number | null
          created_at?: string
          entity: string
          entity_id: string
          event_hash?: string | null
          id?: number
          ip?: unknown
          payload?: Json
          prev_hash?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          chain_ok?: boolean | null
          chain_order?: number | null
          created_at?: string
          entity?: string
          entity_id?: string
          event_hash?: string | null
          id?: number
          ip?: unknown
          payload?: Json
          prev_hash?: string | null
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
      dpia_answers: {
        Row: {
          created_at: string
          evidence_id: string | null
          id: string
          question_id: string
          record_id: string
          tenant_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          evidence_id?: string | null
          id?: string
          question_id: string
          record_id: string
          tenant_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          evidence_id?: string | null
          id?: string
          question_id?: string
          record_id?: string
          tenant_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dpia_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "v_evidence_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "dpia_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "dpia_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "v_dpia_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      dpia_questionnaires: {
        Row: {
          code: string
          created_at: string
          id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dpia_questionnaires_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      dpia_questions: {
        Row: {
          code: string
          control_id: string | null
          created_at: string
          id: string
          options: Json | null
          questionnaire_id: string
          required: boolean | null
          section: string | null
          tenant_id: string
          text: string
          type: string
          updated_at: string
          weight: number
        }
        Insert: {
          code: string
          control_id?: string | null
          created_at?: string
          id?: string
          options?: Json | null
          questionnaire_id: string
          required?: boolean | null
          section?: string | null
          tenant_id: string
          text: string
          type: string
          updated_at?: string
          weight?: number
        }
        Update: {
          code?: string
          control_id?: string | null
          created_at?: string
          id?: string
          options?: Json | null
          questionnaire_id?: string
          required?: boolean | null
          section?: string | null
          tenant_id?: string
          text?: string
          type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "dpia_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dpia_questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      dpia_records: {
        Row: {
          approved_at: string | null
          created_at: string
          due_at: string | null
          id: string
          mitigation: Json | null
          owner_id: string | null
          process_id: string | null
          questionnaire_id: string
          risk_level: string | null
          score: Json | null
          scored_at: string | null
          status: string
          submitted_at: string | null
          tenant_id: string
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          mitigation?: Json | null
          owner_id?: string | null
          process_id?: string | null
          questionnaire_id: string
          risk_level?: string | null
          score?: Json | null
          scored_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          mitigation?: Json | null
          owner_id?: string | null
          process_id?: string | null
          questionnaire_id?: string
          risk_level?: string | null
          score?: Json | null
          scored_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dpia_records_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dpia_questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
          expires_at: string | null
          file_path: string
          file_size: number
          hash_sha256: string
          id: string
          locked: boolean | null
          mime_type: string | null
          note: string | null
          request_id: string | null
          review_due_at: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          supersedes: string | null
          tenant_id: string
          uploaded_at: string
          uploaded_by: string
          verdict: string
          version_id: string
        }
        Insert: {
          control_id: string
          expires_at?: string | null
          file_path: string
          file_size: number
          hash_sha256: string
          id?: string
          locked?: boolean | null
          mime_type?: string | null
          note?: string | null
          request_id?: string | null
          review_due_at?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          supersedes?: string | null
          tenant_id: string
          uploaded_at?: string
          uploaded_by: string
          verdict?: string
          version_id?: string
        }
        Update: {
          control_id?: string
          expires_at?: string | null
          file_path?: string
          file_size?: number
          hash_sha256?: string
          id?: string
          locked?: boolean | null
          mime_type?: string | null
          note?: string | null
          request_id?: string | null
          review_due_at?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          supersedes?: string | null
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string
          verdict?: string
          version_id?: string
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
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "evidences_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "v_evidence_index"
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
      orgunits: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgunits_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "orgunits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orgunits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_assignments: {
        Row: {
          control_id: string
          created_at: string
          exception_flag: boolean | null
          exception_reason: string | null
          id: string
          inheritance_rule: string | null
          owner_id: string | null
          scope_ref: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          control_id: string
          created_at?: string
          exception_flag?: boolean | null
          exception_reason?: string | null
          id?: string
          inheritance_rule?: string | null
          owner_id?: string | null
          scope_ref: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          control_id?: string
          created_at?: string
          exception_flag?: boolean | null
          exception_reason?: string | null
          id?: string
          inheritance_rule?: string | null
          owner_id?: string | null
          scope_ref?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_assignments_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
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
      processes: {
        Row: {
          created_at: string
          criticality: string
          id: string
          metadata: Json | null
          name: string
          ou_id: string | null
          owner_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criticality?: string
          id?: string
          metadata?: Json | null
          name: string
          ou_id?: string | null
          owner_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criticality?: string
          id?: string
          metadata?: Json | null
          name?: string
          ou_id?: string | null
          owner_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_ou_id_fkey"
            columns: ["ou_id"]
            isOneToOne: false
            referencedRelation: "orgunits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_tenant_id_fkey"
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
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          due_at: string | null
          id: string
          kind: string
          payload: Json | null
          ref_id: string
          ref_table: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          kind: string
          payload?: Json | null
          ref_id: string
          ref_table: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          kind?: string
          payload?: Json | null
          ref_id?: string
          ref_table?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_frameworks: {
        Row: {
          activated_at: string
          framework_code: string
          tenant_id: string
        }
        Insert: {
          activated_at?: string
          framework_code: string
          tenant_id: string
        }
        Update: {
          activated_at?: string
          framework_code?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_frameworks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
          criticality_profile: string | null
          default_locale: string | null
          delete_code_hash: string
          erstellt_von: string | null
          headcount_band: string | null
          id: string
          industry: string | null
          legal_name: string | null
          master_code_hash: string
          name: string
          onboarding_completed_at: string | null
          onboarding_done: boolean | null
          onboarding_progress: number | null
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
          criticality_profile?: string | null
          default_locale?: string | null
          delete_code_hash: string
          erstellt_von?: string | null
          headcount_band?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          master_code_hash: string
          name: string
          onboarding_completed_at?: string | null
          onboarding_done?: boolean | null
          onboarding_progress?: number | null
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
          criticality_profile?: string | null
          default_locale?: string | null
          delete_code_hash?: string
          erstellt_von?: string | null
          headcount_band?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          master_code_hash?: string
          name?: string
          onboarding_completed_at?: string | null
          onboarding_done?: boolean | null
          onboarding_progress?: number | null
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
      vendor_answers: {
        Row: {
          assessment_id: string
          created_at: string | null
          evidence_id: string | null
          id: string
          question_id: string
          tenant_id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          evidence_id?: string | null
          id?: string
          question_id: string
          tenant_id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          evidence_id?: string | null
          id?: string
          question_id?: string
          tenant_id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "vendor_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "v_evidence_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "vendor_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_assessments: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          due_at: string | null
          id: string
          questionnaire_id: string
          risk_level: string | null
          score: Json | null
          scored_at: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          questionnaire_id: string
          risk_level?: string | null
          score?: Json | null
          scored_at?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          questionnaire_id?: string
          risk_level?: string | null
          score?: Json | null
          scored_at?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_assessments_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "vendor_questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_assessments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_assessments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profiles: {
        Row: {
          code: string
          id: string
          questionnaire_id: string | null
          tenant_id: string
          title: string
          weighting: Json
        }
        Insert: {
          code: string
          id?: string
          questionnaire_id?: string | null
          tenant_id: string
          title: string
          weighting?: Json
        }
        Update: {
          code?: string
          id?: string
          questionnaire_id?: string | null
          tenant_id?: string
          title?: string
          weighting?: Json
        }
        Relationships: []
      }
      vendor_questionnaires: {
        Row: {
          code: string
          created_at: string | null
          id: string
          sections: Json
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          sections?: Json
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          sections?: Json
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      vendor_questions: {
        Row: {
          code: string
          control_id: string | null
          id: string
          options: Json | null
          prompt: string
          questionnaire_id: string
          required: boolean | null
          section_code: string
          tenant_id: string
          type: string
          weight: number
        }
        Insert: {
          code: string
          control_id?: string | null
          id?: string
          options?: Json | null
          prompt: string
          questionnaire_id: string
          required?: boolean | null
          section_code: string
          tenant_id: string
          type: string
          weight?: number
        }
        Update: {
          code?: string
          control_id?: string | null
          id?: string
          options?: Json | null
          prompt?: string
          questionnaire_id?: string
          required?: boolean | null
          section_code?: string
          tenant_id?: string
          type?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "vendor_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          created_at: string | null
          criticality: string | null
          data_classes: string[] | null
          id: string
          name: string
          owner_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          criticality?: string | null
          data_classes?: string[] | null
          id?: string
          name: string
          owner_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          criticality?: string | null
          data_classes?: string[] | null
          id?: string
          name?: string
          owner_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      evidences_current: {
        Row: {
          control_id: string | null
          expires_at: string | null
          file_path: string | null
          file_size: number | null
          hash_sha256: string | null
          id: string | null
          mime_type: string | null
          note: string | null
          request_id: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          supersedes: string | null
          tenant_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          verdict: string | null
          version_id: string | null
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
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "evidences_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "v_evidence_index"
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
      v_dpia_answers_export: {
        Row: {
          control_id: string | null
          created_at: string | null
          dpia_title: string | null
          evidence_id: string | null
          id: string | null
          process_id: string | null
          question_code: string | null
          question_id: string | null
          question_text: string | null
          record_id: string | null
          tenant_id: string | null
          updated_at: string | null
          value: Json | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dpia_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "v_evidence_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "dpia_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "dpia_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "v_dpia_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_answers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dpia_overview: {
        Row: {
          answers_count: number | null
          approved_at: string | null
          created_at: string | null
          due_at: string | null
          id: string | null
          mitigation: Json | null
          owner_id: string | null
          process_id: string | null
          process_name: string | null
          questionnaire_id: string | null
          risk_level: string | null
          score: Json | null
          scored_at: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dpia_records_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dpia_questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dpia_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_effective_controls: {
        Row: {
          control_id: string | null
          created_at: string | null
          effective_mode: string | null
          exception_flag: boolean | null
          exception_reason: string | null
          inheritance_rule: string | null
          owner_id: string | null
          scope_id: string | null
          scope_type: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_assignments_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_assignments_tenant_id_fkey"
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
      v_evidence_index: {
        Row: {
          content_hash: string | null
          control_id: string | null
          expires_at: string | null
          file_path: string | null
          file_size: number | null
          id: string | null
          locked: boolean | null
          mime_type: string | null
          note: string | null
          request_id: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          supersedes: string | null
          tenant_id: string | null
          uploaded_at: string | null
          uploader_id: string | null
          verdict: string | null
          version_id: string | null
        }
        Insert: {
          content_hash?: string | null
          control_id?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string | null
          locked?: boolean | null
          mime_type?: string | null
          note?: string | null
          request_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          supersedes?: string | null
          tenant_id?: string | null
          uploaded_at?: string | null
          uploader_id?: string | null
          verdict?: string | null
          version_id?: string | null
        }
        Update: {
          content_hash?: string | null
          control_id?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string | null
          locked?: boolean | null
          mime_type?: string | null
          note?: string | null
          request_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          supersedes?: string | null
          tenant_id?: string | null
          uploaded_at?: string | null
          uploader_id?: string | null
          verdict?: string | null
          version_id?: string | null
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
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "evidences_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "v_evidence_index"
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
      v_scope_conflicts: {
        Row: {
          cnt: number | null
          conflict_kind: string | null
          control_id: string | null
          has_exception: boolean | null
          rules: string[] | null
          scope_id: string | null
          scope_type: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_assignments_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "Unternehmen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_scopes: {
        Row: {
          name: string | null
          scope_id: string | null
          scope_type: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      v_vendor_answers_export: {
        Row: {
          assessment_id: string | null
          control_id: string | null
          created_at: string | null
          evidence_id: string | null
          id: string | null
          question_code: string | null
          question_id: string | null
          tenant_id: string | null
          updated_at: string | null
          value: Json | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "vendor_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "v_evidence_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "vendor_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vendor_overview: {
        Row: {
          category: string | null
          created_at: string | null
          criticality: string | null
          data_classes: string[] | null
          id: string | null
          latest_risk: string | null
          latest_score: string | null
          latest_status: string | null
          name: string | null
          owner_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          criticality?: string | null
          data_classes?: string[] | null
          id?: string | null
          latest_risk?: never
          latest_score?: never
          latest_status?: never
          name?: string | null
          owner_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          criticality?: string | null
          data_classes?: string[] | null
          id?: string | null
          latest_risk?: never
          latest_score?: never
          latest_status?: never
          name?: string | null
          owner_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
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
      audit_verify_chain: {
        Args: { p_from: string; p_tenant: string; p_to: string }
        Returns: {
          checked_count: number
          first_break_at: number
          ok: boolean
        }[]
      }
      cleanup_notification_deliveries: { Args: never; Returns: undefined }
      cleanup_run_events: { Args: never; Returns: undefined }
      compute_audit_hash: {
        Args: {
          p_action: string
          p_actor: string
          p_created_at: string
          p_entity: string
          p_entity_id: string
          p_ip: unknown
          p_payload: Json
          p_prev_hash: string
          p_tenant: string
        }
        Returns: string
      }
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
      jsonb_canon: { Args: { j: Json }; Returns: string }
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
      resolve_effective_control: {
        Args: {
          p_control: string
          p_scope_id: string
          p_scope_type: string
          p_tenant: string
        }
        Returns: {
          effective_mode: string
          exception_flag: boolean
          exception_reason: string
          owner_id: string
          source_assignments: Json
        }[]
      }
      set_default_flags: { Args: { _tenant: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      svc_evidence_bulk_update: { Args: { p_updates: Json }; Returns: number }
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
