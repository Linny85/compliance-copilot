import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
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
}

export default function DocumentsNew() {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
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

  const loadControl = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("controls")
        .select("id, code, title, objective")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setControl(data);
      setTitle(`${data.code} - Policy Document`);
      setDescription(data.objective || "");
    } catch (error) {
      console.error("Failed to load control:", error);
      toast({
        title: "Error",
        description: "Failed to load control information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a document title",
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
        title: "Document Generated",
        description: "Your policy document has been created successfully",
      });
      
      navigate("/documents");
    } catch (error) {
      console.error("Failed to generate document:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate the document. Please try again.",
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
          <h1 className="text-3xl font-bold">Generate Policy Document</h1>
          <p className="text-muted-foreground mt-2">
            Create compliance documentation based on control requirements
          </p>
        </div>
      </div>

      {control && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Code:</span>
                <span className="text-sm text-muted-foreground">{control.code}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">Title:</span>
                <span className="text-sm text-muted-foreground">{control.title}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">Objective:</span>
                <span className="text-sm text-muted-foreground">{control.objective}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="policy">Policy Document</SelectItem>
                <SelectItem value="procedure">Procedure</SelectItem>
                <SelectItem value="guideline">Guideline</SelectItem>
                <SelectItem value="report">Compliance Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description or objectives..."
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
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Document
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={generating}
            >
              Cancel
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
                AI-Powered Document Generation
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This feature uses AI to generate compliance documentation based on the selected control requirements. 
                The generated document will include relevant policies, procedures, and implementation guidelines.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
