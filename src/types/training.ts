export type TrainingCertificateStatus = 'pending' | 'verified' | 'rejected';

export interface TrainingCertificate {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  provider: string;
  date_completed: string; // ISO Date (YYYY-MM-DD)
  file_path: string; // Relative path in storage bucket
  file_url?: string | null; // Legacy field (deprecated)
  status: TrainingCertificateStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  training_tag?: string | null; // Stable key for mapping to requirements
  retention_until?: string | null; // GDPR retention
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingCertificateInput {
  title: string;
  provider: string;
  date_completed: string;
  file: File;
  training_tag?: string; // Optional stable key
}

export interface VerifyTrainingCertificateInput {
  status: 'verified' | 'rejected';
  notes?: string;
}
