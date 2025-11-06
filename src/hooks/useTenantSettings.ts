import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TenantSettings = {
  overall_training_mode?: 'weighted' | 'strict';
  overall_training_weight?: number;
  [key: string]: any;
};

export function useTenantSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from('tenant_settings')
        .select('overall_training_mode, overall_training_weight')
        .eq('tenant_id', profile.company_id)
        .maybeSingle();

      if (data) setSettings(data as TenantSettings);
    };

    loadSettings();
  }, [user]);

  return settings;
}
