import type {
  AttendanceStatus,
  AuditAction,
  EntityStatus,
  SalesStatus,
  SpinStatus,
  UserRole,
} from '@/src/types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sales: {
        Row: {
          id: string;
          sales_code: string;
          name: string;
          email: string;
          username: string | null;
          status: SalesStatus;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          sales_code: string;
          name: string;
          email: string;
          username?: string | null;
          status?: SalesStatus;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          sales_code?: string;
          name?: string;
          email?: string;
          username?: string | null;
          status?: SalesStatus;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          store_code: string;
          name: string;
          address: string | null;
          latitude: number;
          longitude: number;
          radius_meters: number;
          status: EntityStatus;
          phone_number: string;
          owner_name: string;
          usual_order: string;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_code: string;
          name: string;
          address?: string | null;
          latitude: number;
          longitude: number;
          radius_meters?: number;
          status?: EntityStatus;
          phone_number?: string;
          owner_name?: string;
          usual_order?: string;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_code?: string;
          name?: string;
          address?: string | null;
          latitude?: number;
          longitude?: number;
          radius_meters?: number;
          status?: EntityStatus;
          phone_number?: string;
          owner_name?: string;
          usual_order?: string;
          notes?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          sales_id: string;
          store_id: string;
          latitude: number;
          longitude: number;
          gps_accuracy: number | null;
          distance_meters: number | null;
          photo_path: string | null;
          client_captured_at: string;
          server_created_at: string;
          status: AttendanceStatus;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sales_id: string;
          store_id: string;
          latitude: number;
          longitude: number;
          gps_accuracy?: number | null;
          distance_meters?: number | null;
          photo_path?: string | null;
          client_captured_at: string;
          server_created_at?: string;
          status?: AttendanceStatus;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sales_id?: string;
          store_id?: string;
          latitude?: number;
          longitude?: number;
          gps_accuracy?: number | null;
          distance_meters?: number | null;
          photo_path?: string | null;
          client_captured_at?: string;
          server_created_at?: string;
          status?: AttendanceStatus;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          name: string;
          value: string;
          probability: number;
          status: EntityStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          value: string;
          probability: number;
          status?: EntityStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          value?: string;
          probability?: number;
          status?: EntityStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      spins: {
        Row: {
          id: string;
          sales_id: string;
          store_id: string;
          attendance_id: string;
          reward_id: string | null;
          latitude: number;
          longitude: number;
          spin_date: string;
          status: SpinStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          sales_id: string;
          store_id: string;
          attendance_id: string;
          reward_id?: string | null;
          latitude: number;
          longitude: number;
          spin_date?: string;
          status?: SpinStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          sales_id?: string;
          store_id?: string;
          attendance_id?: string;
          reward_id?: string | null;
          latitude?: number;
          longitude?: number;
          spin_date?: string;
          status?: SpinStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          sales_id: string;
          device_identifier: string;
          platform: string | null;
          app_version: string | null;
          last_seen_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sales_id: string;
          device_identifier: string;
          platform?: string | null;
          app_version?: string | null;
          last_seen_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sales_id?: string;
          device_identifier?: string;
          platform?: string | null;
          app_version?: string | null;
          last_seen_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          sales_id: string | null;
          action: AuditAction;
          store_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sales_id?: string | null;
          action: AuditAction;
          store_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sales_id?: string | null;
          action?: AuditAction;
          store_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_attendance: {
        Args: {
          p_store_id: string;
          p_latitude: number;
          p_longitude: number;
          p_gps_accuracy: number | null;
          p_client_captured_at: string;
          p_photo_path: string;
        };
        Returns: {
          attendance_id: string;
          status: AttendanceStatus;
          distance_meters: number;
          rejection_reason: string | null;
        }[];
      };
      request_spin: {
        Args: {
          p_attendance_id: string;
          p_store_id: string;
          p_latitude: number;
          p_longitude: number;
        };
        Returns: {
          spin_id: string;
          status: SpinStatus;
          reward_id: string | null;
          reward_name: string | null;
          reward_value: string | null;
          rejection_reason: string | null;
        }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      signup_sales_user: {
        Args: {
          p_username: string;
          p_email: string;
          p_password: string;
          p_name?: string;
          p_sales_code?: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}