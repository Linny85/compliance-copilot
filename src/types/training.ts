export type TrainingCertificateStatus = 'pending' | 'verified' | 'rejected';

export interface TrainingCertificate {
  id: string;
  tenant_id: string;
  user_id: string;
  holder_email: string;
  holder_name?: string | null;
  title: string;
  provider: string;
  date_completed: string;
  file_path: string;
  file_url?: string | null;
  course_code?: string | null;
  training_tag?: string | null;
  verification_code?: string | null;
  source: 'upload' | 'api' | 'manual';
  status: TrainingCertificateStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  retention_until?: string | null;
  jurisdiction_iso2?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingCertificateInput {
  title: string;
  provider: string;
  date_completed: string;
  file: File;
  training_tag?: string;
  verification_code?: string;
}

export interface VerifyTrainingCertificateInput {
  status: 'verified' | 'rejected';
  notes?: string;
}
