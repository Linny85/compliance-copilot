import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { isDemo } from "@/config/appMode";

const Documents = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      navigate("/onboarding");
      return;
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Demo-Modus: Nur Placeholder
  if (isDemo()) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            {t('documents.title')}
          </h1>
          <p className="text-muted-foreground">{t('documents.subtitle')}</p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Demo-Modus</h3>
            <p className="text-muted-foreground">
              Dokumentengenerierung in der Demo deaktiviert.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          {t('documents.title')}
        </h1>
        <p className="text-muted-foreground">{t('documents.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('documents.comingSoon')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('documents.comingSoonDesc')}
          </p>
          <Button disabled>
            <Download className="h-4 w-4 mr-2" />
            {t('documents.generate')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;
