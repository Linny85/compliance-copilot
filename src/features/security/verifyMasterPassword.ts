import { supabase } from '@/integrations/supabase/client';

export interface VerifyMasterPasswordResult {
  success: boolean;
  error?: 'invalid_password' | 'rate_limited' | 'service_unavailable' | 'no_company';
}

/**
 * Securely verifies the master password for the current user's company.
 * Uses edge function with fallback to RPC for maximum reliability.
 * 
 * @param password - Plain text master password to verify
 * @returns Result object with success status and optional error code
 */
export async function verifyMasterPassword(password: string): Promise<VerifyMasterPasswordResult> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to get current user:', userError);
      return { success: false, error: 'service_unavailable' };
    }

    // Get user's company_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      console.error('Failed to fetch user profile:', profileError);
      return { success: false, error: 'no_company' };
    }

    // Try edge function first (preferred method with rate limiting)
    try {
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('verify-master', {
        body: {
          company_id: profile.company_id,
          password
        }
      });

      if (!edgeError) {
        if (edgeResult?.ok === true) {
          return { success: true };
        }
        
        // Handle specific error reasons from edge function
        if (edgeResult?.reason === 'rate_limited') {
          return { success: false, error: 'rate_limited' };
        }
        
        return { success: false, error: 'invalid_password' };
      }

      // If edge function fails, log and fall through to RPC
      console.warn('Edge function failed, falling back to RPC:', edgeError);
    } catch (edgeException) {
      console.warn('Edge function exception, falling back to RPC:', edgeException);
    }

    // Fallback: Use RPC function
    const { data: isValid, error: rpcError } = await supabase
      .rpc('verify_master_password', {
        p_company_id: profile.company_id,
        p_password: password
      });

    if (rpcError) {
      console.error('RPC verification failed:', rpcError);
      
      // Check for network/CORS errors
      if (rpcError.message?.includes('Failed to fetch') || rpcError.message?.includes('CORS')) {
        return { success: false, error: 'service_unavailable' };
      }
      
      return { success: false, error: 'service_unavailable' };
    }

    if (isValid === true) {
      return { success: true };
    }

    return { success: false, error: 'invalid_password' };

  } catch (error) {
    console.error('Unexpected verification error:', error);
    return { success: false, error: 'service_unavailable' };
  }
}
