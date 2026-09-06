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
      action_plans: {
        Row: {
          case_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          hazard_id: string | null
          id: string
          organization_id: string
          owner_id: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          hazard_id?: string | null
          id?: string
          organization_id: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          hazard_id?: string | null
          id?: string
          organization_id?: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          action_plan_id: string
          completed_at: string | null
          control_type: Database["public"]["Enums"]["control_type"]
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          evidence_path: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          progress_notes: string | null
          responsible_id: string | null
          status: Database["public"]["Enums"]["action_status"]
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_plan_id: string
          completed_at?: string | null
          control_type?: Database["public"]["Enums"]["control_type"]
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          evidence_path?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress_notes?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_plan_id?: string
          completed_at?: string | null
          control_type?: Database["public"]["Enums"]["control_type"]
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          evidence_path?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress_notes?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_action_plan_id_fkey"
            columns: ["action_plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string | null
          id: string
          name: string
          updated_at: string
          work_center_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          id?: string
          name: string
          updated_at?: string
          work_center_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          id?: string
          name?: string
          updated_at?: string
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      case_evidences: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_evidences_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_evidences_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          affected_person_job: string | null
          affected_person_name: string | null
          affected_profile_id: string | null
          area_id: string | null
          assigned_to: string | null
          closed_at: string | null
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          immediate_actions: string | null
          location_detail: string | null
          lost_days: number
          occurred_at: string
          organization_id: string
          reported_at: string
          reported_by: string | null
          requires_investigation: boolean
          severity: Database["public"]["Enums"]["case_severity"]
          status: Database["public"]["Enums"]["case_status"]
          title: string
          type: Database["public"]["Enums"]["case_type"]
          updated_at: string
          work_center_id: string | null
        }
        Insert: {
          affected_person_job?: string | null
          affected_person_name?: string | null
          affected_profile_id?: string | null
          area_id?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          immediate_actions?: string | null
          location_detail?: string | null
          lost_days?: number
          occurred_at?: string
          organization_id: string
          reported_at?: string
          reported_by?: string | null
          requires_investigation?: boolean
          severity?: Database["public"]["Enums"]["case_severity"]
          status?: Database["public"]["Enums"]["case_status"]
          title: string
          type?: Database["public"]["Enums"]["case_type"]
          updated_at?: string
          work_center_id?: string | null
        }
        Update: {
          affected_person_job?: string | null
          affected_person_name?: string | null
          affected_profile_id?: string | null
          area_id?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          immediate_actions?: string | null
          location_detail?: string | null
          lost_days?: number
          occurred_at?: string
          organization_id?: string
          reported_at?: string
          reported_by?: string | null
          requires_investigation?: boolean
          severity?: Database["public"]["Enums"]["case_severity"]
          status?: Database["public"]["Enums"]["case_status"]
          title?: string
          type?: Database["public"]["Enums"]["case_type"]
          updated_at?: string
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_affected_profile_id_fkey"
            columns: ["affected_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      hazards: {
        Row: {
          activity: string
          area_id: string | null
          consequence: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          existing_controls: string | null
          hazard: string
          id: string
          is_routine: boolean
          last_reviewed_at: string | null
          legal_requirements: string | null
          next_review_at: string | null
          organization_id: string
          owner_id: string | null
          probability: number
          process: string | null
          proposed_controls: string | null
          residual_consequence: number | null
          residual_probability: number | null
          residual_risk_level: Database["public"]["Enums"]["risk_level"] | null
          risk: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number | null
          source_case_id: string | null
          updated_at: string
          work_center_id: string | null
        }
        Insert: {
          activity: string
          area_id?: string | null
          consequence?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          existing_controls?: string | null
          hazard: string
          id?: string
          is_routine?: boolean
          last_reviewed_at?: string | null
          legal_requirements?: string | null
          next_review_at?: string | null
          organization_id: string
          owner_id?: string | null
          probability?: number
          process?: string | null
          proposed_controls?: string | null
          residual_consequence?: number | null
          residual_probability?: number | null
          residual_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          risk: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number | null
          source_case_id?: string | null
          updated_at?: string
          work_center_id?: string | null
        }
        Update: {
          activity?: string
          area_id?: string | null
          consequence?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          existing_controls?: string | null
          hazard?: string
          id?: string
          is_routine?: boolean
          last_reviewed_at?: string | null
          legal_requirements?: string | null
          next_review_at?: string | null
          organization_id?: string
          owner_id?: string | null
          probability?: number
          process?: string | null
          proposed_controls?: string | null
          residual_consequence?: number | null
          residual_probability?: number | null
          residual_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          risk?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number | null
          source_case_id?: string | null
          updated_at?: string
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazards_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazards_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazards_source_case_id_fkey"
            columns: ["source_case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazards_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_causes: {
        Row: {
          category: string | null
          cause_type: Database["public"]["Enums"]["cause_type"]
          created_at: string
          created_by: string | null
          description: string
          id: string
          investigation_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cause_type?: Database["public"]["Enums"]["cause_type"]
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          investigation_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cause_type?: Database["public"]["Enums"]["cause_type"]
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          investigation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_causes_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_interviews: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          interviewed_at: string
          interviewee_name: string
          interviewee_role: string | null
          investigation_id: string
          notes: string | null
          relation_to_event: string | null
          statement: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          interviewed_at?: string
          interviewee_name: string
          interviewee_role?: string | null
          investigation_id: string
          notes?: string | null
          relation_to_event?: string | null
          statement?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          interviewed_at?: string
          interviewee_name?: string
          interviewee_role?: string | null
          investigation_id?: string
          notes?: string | null
          relation_to_event?: string | null
          statement?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_interviews_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      investigations: {
        Row: {
          case_id: string
          conclusions: string | null
          conditions_description: string | null
          created_at: string
          created_by: string | null
          equipment_involved: string | null
          event_sequence: string | null
          existing_controls: string | null
          facts_summary: string | null
          finished_at: string | null
          id: string
          lead_investigator_id: string | null
          methodology: string
          observations: string | null
          prior_training: string | null
          procedures_review: string | null
          started_at: string
          team: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          conclusions?: string | null
          conditions_description?: string | null
          created_at?: string
          created_by?: string | null
          equipment_involved?: string | null
          event_sequence?: string | null
          existing_controls?: string | null
          facts_summary?: string | null
          finished_at?: string | null
          id?: string
          lead_investigator_id?: string | null
          methodology?: string
          observations?: string | null
          prior_training?: string | null
          procedures_review?: string | null
          started_at?: string
          team?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          conclusions?: string | null
          conditions_description?: string | null
          created_at?: string
          created_by?: string | null
          equipment_involved?: string | null
          event_sequence?: string | null
          existing_controls?: string | null
          facts_summary?: string | null
          finished_at?: string | null
          id?: string
          lead_investigator_id?: string | null
          methodology?: string
          observations?: string | null
          prior_training?: string | null
          procedures_review?: string | null
          started_at?: string
          team?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investigations_lead_investigator_id_fkey"
            columns: ["lead_investigator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_demo: boolean
          name: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_demo?: boolean
          name: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendees: {
        Row: {
          attended: boolean
          certificate_path: string | null
          created_at: string
          created_by: string | null
          external_name: string | null
          id: string
          profile_id: string | null
          score: number | null
          training_id: string
          updated_at: string
        }
        Insert: {
          attended?: boolean
          certificate_path?: string | null
          created_at?: string
          created_by?: string | null
          external_name?: string | null
          id?: string
          profile_id?: string | null
          score?: number | null
          training_id: string
          updated_at?: string
        }
        Update: {
          attended?: boolean
          certificate_path?: string | null
          created_at?: string
          created_by?: string | null
          external_name?: string | null
          id?: string
          profile_id?: string | null
          score?: number | null
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendees_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          area_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_hours: number
          id: string
          instructor: string | null
          organization_id: string
          scheduled_at: string
          source_case_id: string | null
          status: Database["public"]["Enums"]["training_status"]
          title: string
          training_type: string | null
          updated_at: string
          work_center_id: string | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          instructor?: string | null
          organization_id: string
          scheduled_at?: string
          source_case_id?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          title: string
          training_type?: string | null
          updated_at?: string
          work_center_id?: string | null
        }
        Update: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          instructor?: string | null
          organization_id?: string
          scheduled_at?: string
          source_case_id?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          title?: string
          training_type?: string | null
          updated_at?: string
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_source_case_id_fkey"
            columns: ["source_case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
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
      work_centers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      case_in_my_org: { Args: { _case_id: string }; Returns: boolean }
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hse_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      action_status:
        | "pendiente"
        | "en_progreso"
        | "completada"
        | "verificada"
        | "vencida"
        | "cancelada"
      app_role: "administrador" | "prevencionista" | "supervisor" | "auditor"
      case_severity: "leve" | "moderada" | "grave" | "fatal"
      case_status:
        | "borrador"
        | "reportado"
        | "en_investigacion"
        | "plan_accion"
        | "verificacion"
        | "cerrado"
        | "anulado"
      case_type:
        | "accidente"
        | "incidente"
        | "cuasi_accidente"
        | "enfermedad_profesional"
        | "condicion_insegura"
      cause_type: "inmediata" | "basica" | "raiz"
      control_type:
        | "eliminacion"
        | "sustitucion"
        | "ingenieria"
        | "administrativo"
        | "epp"
      priority_level: "baja" | "media" | "alta" | "critica"
      risk_level: "bajo" | "medio" | "alto" | "critico"
      training_status: "planificada" | "en_curso" | "realizada" | "cancelada"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      action_status: [
        "pendiente",
        "en_progreso",
        "completada",
        "verificada",
        "vencida",
        "cancelada",
      ],
      app_role: ["administrador", "prevencionista", "supervisor", "auditor"],
      case_severity: ["leve", "moderada", "grave", "fatal"],
      case_status: [
        "borrador",
        "reportado",
        "en_investigacion",
        "plan_accion",
        "verificacion",
        "cerrado",
        "anulado",
      ],
      case_type: [
        "accidente",
        "incidente",
        "cuasi_accidente",
        "enfermedad_profesional",
        "condicion_insegura",
      ],
      cause_type: ["inmediata", "basica", "raiz"],
      control_type: [
        "eliminacion",
        "sustitucion",
        "ingenieria",
        "administrativo",
        "epp",
      ],
      priority_level: ["baja", "media", "alta", "critica"],
      risk_level: ["bajo", "medio", "alto", "critico"],
      training_status: ["planificada", "en_curso", "realizada", "cancelada"],
    },
  },
} as const
