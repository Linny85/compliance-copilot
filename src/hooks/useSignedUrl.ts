import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to generate signed URLs for private storage files
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export function useSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 3600) {
  return useQuery({
    queryKey: ['signed-url', bucket, path, expiresIn],
    queryFn: async () => {
      if (!path) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: (expiresIn - 300) * 1000, // Refresh 5 minutes before expiry
  });
}
