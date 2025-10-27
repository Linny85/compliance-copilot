import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useHybridTranslation } from "@/hooks/useHybridTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

interface Control {
  id: string;
  code: string;
  title: string;
  objective: string;
  frameworks?: { code: string };
}

export default function DocumentsNew() {
  const { t, i18n } = useTranslation(['common', 'documents']);
  const language = i18n.language as 'de' | 'en' | 'sv';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Hybrid translation for control catalog
  const { t: tDb, prime } = useHybridTranslation(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    language,
    null
  );
  
  const controlId = searchParams.get("controlId");
  const [control, setControl] = useState<Control | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<string>("policy");

  useEffect(() => {
    if (controlId) {
      loadControl(controlId);
    } else {
      setLoading(false);
    }
  }, [controlId]);

  // Prime DB translations
  useEffect(() => {
    prime("controls");
  }, [language]);

  const loadControl = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("controls")
        .select("id, code, title, objective, frameworks(code)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: t("common:error"),
          description: t("documents:errors.loadControl"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      setControl(data);
      setTitle(`${data.code} - ${t("documents:policyDocument")}`);
      setDescription(data.objective || "");
    } catch (error) {
      console.error("Failed to load control:", error);
      toast({
        title: t("common:error"),
        description: t("documents:errors.loadControl"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to get translated title
  const getControlTitle = (control: Control): string => {
    const fw = control.frameworks?.code || control.code?.split("-")?.[0];
    if (!fw) return control.title;
    return tDb(`catalog.${fw}.${control.code}.title`, control.title);
  };

  // Helper to get translated objective
  const getControlObjective = (control: Control): string => {
    const fw = control.frameworks?.code || control.code?.split("-")?.[0];
    if (!fw) return control.objective;
    return tDb(`catalog.${fw}.${control.code}.objective`, control.objective);
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({
        title: t("documents:errors.validation"),
        description: t("documents:errors.titleRequired"),
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // TODO: Implement actual document generation logic
      // For now, just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: t("documents:success.generated"),
        description: t("documents:success.generatedDesc"),
      });
      
      // Return to Controls if came from there, otherwise to Documents
      const returnPath = controlId ? "/controls" : "/documents";
      navigate(returnPath, { replace: true });
    } catch (error) {
      console.error("Failed to generate document:", error);
      toast({
        title: t("documents:errors.generateFailed"),
        description: t("documents:errors.generateFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const returnPath = controlId ? "/controls" : "/documents";
            navigate(returnPath, { replace: true });
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t("documents:generateTitle")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("documents:generateSubtitle")}
          </p>
        </div>
      </div>

      {control && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("documents:selectedControl")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("documents:fields.code")}:</span>
                <span className="text-sm text-muted-foreground">{control.code}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">{t("documents:fields.title")}:</span>
                <span className="text-sm text-muted-foreground">{getControlTitle(control)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">{t("documents:fields.objective")}:</span>
                <span className="text-sm text-muted-foreground">{getControlObjective(control)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("documents:documentDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentType">{t("documents:fields.documentType")}</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="policy">{t("documents:types.policy")}</SelectItem>
                <SelectItem value="procedure">{t("documents:types.procedure")}</SelectItem>
                <SelectItem value="guideline">{t("documents:types.guideline")}</SelectItem>
                <SelectItem value="report">{t("documents:types.report")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t("documents:fields.documentTitle")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("documents:placeholders.title")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("documents:fields.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("documents:placeholders.description")}
              rows={5}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={generating || !title.trim()}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("documents:generating")}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("documents:generateButton")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const returnPath = controlId ? "/controls" : "/documents";
                navigate(returnPath, { replace: true });
              }}
              disabled={generating}
            >
              {t("common:cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t("documents:aiPoweredTitle")}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t("documents:aiPoweredDesc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
