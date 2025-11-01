import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FileText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isDemo } from "@/config/appMode";
import { CreateDocumentForm } from "@/components/documents/CreateDocumentForm";

const Documents = () => {
  const navigate = useNavigate();
  const { t, ready } = useTranslation(['documents', 'common', 'admin']);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = () => setCreateOpen(true);
  const closeCreate = () => setCreateOpen(false);

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{ready ? t('common:loading') : 'Loading...'}</p>
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
          {t('documents:title')}
        </h1>
        <p className="text-muted-foreground">{t('documents:subtitle')}</p>
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
    <>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              {t('documents:title')}
            </h1>
            <p className="text-muted-foreground">{t('documents:subtitle')}</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('admin:documents.create')}
          </Button>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('admin:documents.empty.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('admin:documents.empty.desc')}
            </p>
            <Button onClick={openCreate} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              {t('admin:documents.empty.cta')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('admin:documents.create')}</SheetTitle>
          </SheetHeader>
          <CreateDocumentForm 
            onSuccess={closeCreate}
            onCancel={closeCreate}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Documents;
