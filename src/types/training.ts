export type TrainingCertificateStatus = 'pending' | 'verified' | 'rejected';

export interface TrainingCertificate {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  provider: string;
  date_completed: string; // ISO Date (YYYY-MM-DD)
  file_url: string;
  status: TrainingCertificateStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingCertificateInput {
  title: string;
  provider: string;
  date_completed: string;
  file: File;
}

export interface VerifyTrainingCertificateInput {
  status: 'verified' | 'rejected';
  notes?: string;
}
