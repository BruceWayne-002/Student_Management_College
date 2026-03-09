import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export interface Student {
  register_no: string;
  name: string;
  father_name?: string | null;
  mother_name?: string | null;
  address?: string | null;
  class?: string | null;
  year?: string | null;
  department?: string | null;
  cia_1_mark?: number | null;
  cia_2_mark?: number | null;
  present_today?: number | null;
  leave_taken?: number | null;
  attendance_percentage?: number | null;
  email?: string | null;
  phone_number?: string | null;
  profile_image_url?: string;
  last_updated?: string;
  created_at?: string;
  created_by?: string;
  overall_attendance_percentage?: number | null;
  result_percentage?: number | null;
  student_number?: string | null;
  parents_number?: string | null;
  blood_group?: string | null;
  hostel?: string | null;
  dob?: string | null;
  disciplinary_action?: string | null;
  year_of_passing?: number | null;
  mentor?: string | null;
}

export type UserRole = {
  role: 'admin' | 'staff';
};

export interface Profile {
  id: string;
  email: string | null;
  role: 'admin' | 'staff';
  created_at?: string | null;
}

export interface UploadHistory {
  id: string;
  uploaded_by: string;
  file_name: string;
  records_count: number;
  status: 'success' | 'partial' | 'failed';
  error_log: string | null;
  uploaded_at: string;
}
