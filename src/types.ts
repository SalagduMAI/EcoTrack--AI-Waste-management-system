// Shared type definitions representing Laravel structures in EcoTrack

export type UserRole = 'admin' | 'worker' | 'resident';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  shift?: 'morning' | 'evening' | 'night' | null;
  status: 'active' | 'suspended';
  profile_photo_path?: string | null;
  created_at?: string;
}

/** User profile as returned by the /api/login endpoint */
export interface LoginUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  shift?: 'morning' | 'evening' | 'night' | null;
  profile_photo_url?: string | null;
}

export interface Block {
  id: number;
  name: string;
  notes?: string | null;
  floors_count?: number;
  floors?: Floor[];
}

export interface Floor {
  id: number;
  block_id: number;
  floor_number: number;
  qr_code_hash: string;
  block?: Block;
  units?: Unit[];
}

export interface Unit {
  id: number;
  floor_id: number;
  unit_number: string;
  resident_id?: number | null;
  qr_code_hash: string;
  floor?: Floor;
  resident?: User | null;
}

export interface Job {
  id: number;
  worker_id?: number | null;
  block_id: number;
  floor_id: number;
  unit_id?: number | null;
  scheduled_date: string;
  shift: 'morning' | 'evening' | 'night';
  status: 'pending' | 'in_progress' | 'done' | 'issue';
  scanned_at?: string | null;
  completed_at?: string | null;
  issue_reason?: string | null;
  incident_photo_path?: string | null;
  created_at?: string;
  
  // Relations
  worker?: User | null;
  block?: Block | null;
  floor?: Floor | null;
  unit?: Unit | null;
  rating?: Rating | null;
}

export interface Rating {
  id: number;
  job_id: number;
  resident_id: number;
  worker_id: number;
  rating: number; // 1-5
  feedback?: string | null;
  created_at?: string;
}

export interface Payment {
  id: number;
  resident_id: number;
  unit_id: number;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'refunded';
  payment_method?: 'stripe' | 'payhere' | 'bank_transfer' | null;
  transaction_id?: string | null;
  reference_code: string;
  payment_type: 'monthly_fee' | 'special_pickup';
  notes?: string | null;
  paid_at?: string | null;
  created_at?: string;
  
  // Relations
  unit?: Unit;
}

export interface Complaint {
  id: number;
  complaint_code: string;
  resident_id: number;
  unit_id?: number | null;
  job_id?: number | null;
  category: 'missed_collection' | 'worker_rudeness' | 'spilled_waste' | 'wrong_time' | 'other';
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  resolved_notes?: string | null;
  created_at?: string;
  
  // Relations
  job?: Job | null;
  resident?: User;
}

export interface ChatbotLog {
  id: number;
  resident_id: number;
  user_message: string;
  bot_response: string;
  is_helpful?: boolean | null;
  created_at?: string;
}

export interface KnowledgeBase {
  id: number;
  title: string;
  category: string;
  content: string;
  tags?: string | null;
}
