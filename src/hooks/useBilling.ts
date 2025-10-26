import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BillingStatus = {
  company_id: string;
  plan: string;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  trial_days_left: number;
  trial_active: boolean;
  paid_active: boolean;
};

export function useBillingStatus(tenantId?: string | null) {
  const [data, setData] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from('v_billing_status' as any)
          .select('*')
          .eq('company_id', tenantId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching billing status:', error);
          setData(null);
        } else {
          setData(row ? (row as unknown as BillingStatus) : null);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  return { data, loading };
}
