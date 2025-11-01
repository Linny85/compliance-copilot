import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";

interface CreateDocumentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateDocumentForm({ onSuccess, onCancel }: CreateDocumentFormProps) {
  const { t } = useTranslation(['documents', 'admin']);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("policy");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error(t('documents:errors.validation'), {
        description: t('documents:errors.titleRequired')
      });
      return;
    }

    setGenerating(true);

    try {
      // Simulate document generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(t('documents:success.generated'), {
        description: t('documents:success.generatedDesc')
      });
      
      onSuccess();
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(t('documents:errors.generateFailed'), {
        description: t('documents:errors.generateFailedDesc')
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('documents:documentDetails')}
          </CardTitle>
          <CardDescription>
            {t('documents:generateSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentType">{t('documents:fields.documentType')}</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="policy">{t('documents:types.policy')}</SelectItem>
                <SelectItem value="procedure">{t('documents:types.procedure')}</SelectItem>
                <SelectItem value="guideline">{t('documents:types.guideline')}</SelectItem>
                <SelectItem value="report">{t('documents:types.report')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t('documents:fields.documentTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('documents:placeholders.title')}
              disabled={generating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('documents:fields.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('documents:placeholders.description')}
              rows={4}
              disabled={generating}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">{t('documents:aiPoweredTitle')}</CardTitle>
          <CardDescription>{t('documents:aiPoweredDesc')}</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={generating}
        >
          {t('admin:documents.empty.cancel', { defaultValue: 'Abbrechen' })}
        </Button>
        <Button 
          onClick={handleGenerate}
          disabled={generating || !title.trim()}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('documents:generating')}
            </>
          ) : (
            t('documents:generateButton')
          )}
        </Button>
      </div>
    </div>
  );
}
