import { useState, useEffect } from "react";
import { ScopeForm } from "@/features/scope/ScopeForm";
import { ScopeResultCards } from "@/features/scope/ScopeResultCards";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScopeAnalysis() {
  const { t } = useTranslation("scope");
  const [analysis, setAnalysis] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getTenantId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();
        
        if (profile?.company_id) {
          setTenantId(profile.company_id);
        }
      }
      setLoading(false);
    }
    getTenantId();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-destructive">Keine Tenant-ID gefunden. Bitte melden Sie sich an.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">{t("title", "Mandanten-Analyse")}</h1>
      <ScopeForm tenantId={tenantId} onAnalyzed={setAnalysis} />
      {analysis && <ScopeResultCards analysis={analysis} />}
    </div>
  );
}
