import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
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
  const { tx, language } = useI18n();
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
          title: tx("common.error"),
          description: tx("documents.errors.loadControl"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      setControl(data);
      setTitle(`${data.code} - ${tx("documents.policyDocument")}`);
      setDescription(data.objective || "");
    } catch (error) {
      console.error("Failed to load control:", error);
      toast({
        title: tx("common.error"),
        description: tx("documents.errors.loadControl"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to get translated title
  const getControlTitle = (control: Control): string => {
    const fw = control.frameworks?.code;
    if (!fw) return control.title;
    return tDb(`catalog.${fw}.${control.code}.title`, control.title);
  };

  // Helper to get translated objective
  const getControlObjective = (control: Control): string => {
    const fw = control.frameworks?.code;
    if (!fw) return control.objective;
    return tDb(`catalog.${fw}.${control.code}.objective`, control.objective);
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({
        title: tx("documents.errors.validation"),
        description: tx("documents.errors.titleRequired"),
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
        title: tx("documents.success.generated"),
        description: tx("documents.success.generatedDesc"),
      });
      
      navigate("/documents");
    } catch (error) {
      console.error("Failed to generate document:", error);
      toast({
        title: tx("documents.errors.generateFailed"),
        description: tx("documents.errors.generateFailedDesc"),
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
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{tx("documents.generateTitle")}</h1>
          <p className="text-muted-foreground mt-2">
            {tx("documents.generateSubtitle")}
          </p>
        </div>
      </div>

      {control && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tx("documents.selectedControl")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{tx("documents.fields.code")}:</span>
                <span className="text-sm text-muted-foreground">{control.code}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">{tx("documents.fields.title")}:</span>
                <span className="text-sm text-muted-foreground">{getControlTitle(control)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">{tx("documents.fields.objective")}:</span>
                <span className="text-sm text-muted-foreground">{getControlObjective(control)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{tx("documents.documentDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentType">{tx("documents.fields.documentType")}</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="policy">{tx("documents.types.policy")}</SelectItem>
                <SelectItem value="procedure">{tx("documents.types.procedure")}</SelectItem>
                <SelectItem value="guideline">{tx("documents.types.guideline")}</SelectItem>
                <SelectItem value="report">{tx("documents.types.report")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{tx("documents.fields.documentTitle")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tx("documents.placeholders.title")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tx("documents.fields.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tx("documents.placeholders.description")}
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
                  {tx("documents.generating")}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {tx("documents.generateButton")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={generating}
            >
              {tx("common.cancel")}
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
                {tx("documents.aiPoweredTitle")}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {tx("documents.aiPoweredDesc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
