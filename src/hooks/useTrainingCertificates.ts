import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrainingCertificate, CreateTrainingCertificateInput, VerifyTrainingCertificateInput } from '@/types/training';
import { toast } from 'sonner';

const FEATURE_ENABLED = import.meta.env.VITE_FEATURE_TRAINING_CERTS === 'true';

export function useTrainingCertificates() {
  return useQuery({
    queryKey: ['training-certificates'],
    queryFn: async () => {
      if (!FEATURE_ENABLED) return [];
      
      const { data, error } = await supabase
        .from('training_certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingCertificate[];
    },
    enabled: FEATURE_ENABLED,
  });
}

export function useUserTrainingCertificates(userId?: string) {
  return useQuery({
    queryKey: ['training-certificates', 'user', userId],
    queryFn: async () => {
      if (!FEATURE_ENABLED || !userId) return [];
      
      const { data, error } = await supabase
        .from('training_certificates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingCertificate[];
    },
    enabled: FEATURE_ENABLED && !!userId,
  });
}

export function useCreateTrainingCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTrainingCertificateInput) => {
      if (!FEATURE_ENABLED) {
        throw new Error('Feature not enabled');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No company found');

      // Generate unique filename with tenant/user folder structure
      const fileExt = input.file.name.split('.').pop();
      const fileName = `${profile.company_id}/${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('training-certificates')
        .upload(fileName, input.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Calculate retention (e.g., 7 years for compliance records)
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 7);

      // Create database record with file_path
      const { data, error } = await supabase
        .from('training_certificates')
        .insert({
          tenant_id: profile.company_id,
          user_id: user.id,
          title: input.title,
          provider: input.provider,
          date_completed: input.date_completed,
          file_path: fileName,
          training_tag: input.training_tag || null,
          retention_until: retentionDate.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        // Cleanup uploaded file on error
        await supabase.storage.from('training-certificates').remove([fileName]);
        throw error;
      }

      return data as TrainingCertificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-certificates'] });
      toast.success('Zertifikat eingereicht', {
        description: 'Ihr Zertifikat wird geprüft',
      });
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Hochladen', {
        description: error.message,
      });
    },
  });
}

export function useVerifyTrainingCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VerifyTrainingCertificateInput }) => {
      if (!FEATURE_ENABLED) {
        throw new Error('Feature not enabled');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_certificates')
        .update({
          status: input.status,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes: input.notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TrainingCertificate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-certificates'] });
      const status = variables.input.status === 'verified' ? 'bestätigt' : 'abgelehnt';
      toast.success(`Zertifikat ${status}`);
    },
    onError: (error: Error) => {
      toast.error('Fehler bei der Verifizierung', {
        description: error.message,
      });
    },
  });
}

export function useDeleteTrainingCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!FEATURE_ENABLED) {
        throw new Error('Feature not enabled');
      }

      // Get certificate to find file path
      const { data: cert } = await supabase
        .from('training_certificates')
        .select('file_path')
        .eq('id', id)
        .single();

      // Delete from database
      const { error } = await supabase
        .from('training_certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete file from storage using file_path
      if (cert?.file_path) {
        await supabase.storage
          .from('training-certificates')
          .remove([cert.file_path]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-certificates'] });
      toast.success('Zertifikat gelöscht');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Löschen', {
        description: error.message,
      });
    },
  });
}
