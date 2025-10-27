import { useState, useEffect } from "react";
import { ScopeForm } from "@/features/scope/ScopeForm";
import { ScopeResultCards } from "@/features/scope/ScopeResultCards";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function ScopeAnalysis() {
  const { t } = useTranslation("scope");
  const [analysis, setAnalysis] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function exportScopeReport() {
    if (!tenantId) return;
    
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("exportScope", {
        body: { tenant_id: tenantId }
      });

      if (error) throw error;

      // Open HTML report in new window for printing
      const w = window.open("", "_blank");
      if (w) {
        w.document.open();
        w.document.write(data as string);
        w.document.close();
      }
      
      toast.success("Report erfolgreich exportiert");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Fehler beim Export: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setExporting(false);
    }
  }

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("title", "Mandanten-Analyse")}</h1>
        {analysis && (
          <Button 
            onClick={exportScopeReport} 
            disabled={exporting}
            variant="outline"
          >
            <FileDown className="mr-2 h-4 w-4" />
            {exporting ? "Exportiere..." : "Report exportieren"}
          </Button>
        )}
      </div>
      <ScopeForm tenantId={tenantId} onAnalyzed={setAnalysis} />
      {analysis && <ScopeResultCards analysis={analysis} />}
    </div>
  );
}
