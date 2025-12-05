import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { FileText, Save, Send, BarChart3, Download } from "lucide-react";

type AnswerValue = string | number | boolean | null;

interface Question {
  id: string;
  code: string;
  text: string;
  type: string;
  required: boolean;
  section: string | null;
}

interface Answer {
  question_id: string;
  value: AnswerValue;
  evidence_id: string | null;
}

type AnswerPayload = {
  question_id: string;
  value: AnswerValue;
};

interface DPIARecord {
  id: string;
  title: string;
  status: string;
  risk_level: string | null;
  questionnaire_id: string;
  score: {
    overall: number;
    impact?: number;
    likelihood?: number;
  } | null;
}

interface ScoreResponse {
  risk_level: string;
  score: {
    overall: number;
    impact?: number;
    likelihood?: number;
  };
}

export default function DPIADetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { t } = useTranslation(['privacy', 'common']);
  const [record, setRecord] = useState<DPIARecord | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Load record
      const { data: recordData, error: recError } = await supabase
        .from("dpia_records")
        .select("*, dpia_questionnaires(id)")
        .eq("id", id)
        .single<DPIARecord>();

      if (recError) throw recError;
      setRecord(recordData);

      // Load questions
      const { data: qData, error: qError } = await supabase
        .from("dpia_questions")
        .select("*")
        .eq("questionnaire_id", recordData.questionnaire_id)
        .order("section", { ascending: true });

      if (qError) throw qError;
      const typedQuestions = (qData ?? []) as Question[];
      setQuestions(typedQuestions);

      // Load answers
      const { data: aData } = await supabase
        .from("dpia_answers")
        .select("*")
        .eq("record_id", id);

      const ansMap: Record<string, AnswerValue> = {};
      const typedAnswers = (aData ?? []) as Answer[];
      typedAnswers.forEach((a) => {
        ansMap[a.question_id] = a.value;
      });
      setAnswers(ansMap);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: t('privacy:dpiaDetail.toast.loadError', 'Error loading DPIA'), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildAnswerPayload = (): AnswerPayload[] => (
    questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id] ?? null,
    }))
  );

  const handleSave = async () => {
    if (!id) return;
    const answerArray = buildAnswerPayload();

    try {
      const { error } = await supabase.functions.invoke("dpia-save", {
        body: { record_id: id, answers: answerArray },
      });

      if (error) throw error;
      toast({ title: t('privacy:dpiaDetail.toast.progressSaved', 'Progress saved') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: t('privacy:dpiaDetail.toast.saveError', 'Error saving'), description: message, variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    const answerArray = buildAnswerPayload();

    try {
      const { error } = await supabase.functions.invoke("dpia-submit", {
        body: { record_id: id, answers: answerArray },
      });

      if (error) throw error;
      toast({ title: t('privacy:dpiaDetail.toast.submitted', 'DPIA submitted') });
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: t('privacy:dpiaDetail.toast.submitError', 'Error submitting'), description: message, variant: "destructive" });
    }
  };

  const handleScore = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.functions.invoke<ScoreResponse>("dpia-score", {
        body: { record_id: id },
      });

      if (error) throw error;
      if (!data) throw new Error(t('privacy:dpiaDetail.toast.scoreMissing', 'No score data returned'));
      toast({
        title: t('privacy:dpiaDetail.toast.scored', 'DPIA scored'),
        description: t('privacy:dpiaDetail.toast.scoreDescription', 'Risk: {{risk}}, Score: {{score}}%', {
          risk: data.risk_level,
          score: (data.score.overall * 100).toFixed(1),
        }),
      });
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: t('privacy:dpiaDetail.toast.scoreError', 'Error scoring'), description: message, variant: "destructive" });
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.functions.invoke<Record<string, unknown>>("dpia-export", {
        body: { record_id: id },
      });

      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dpia-bundle-${id}.json`;
      a.click();
      toast({ title: t('privacy:dpiaDetail.toast.exported', 'DPIA exported') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: t('privacy:dpiaDetail.toast.exportError', 'Error exporting'), description: message, variant: "destructive" });
    }
  };

  const renderQuestion = (q: Question) => {
    const value = answers[q.id];
    const onChange = (nextValue: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [q.id]: nextValue }));
    };

    switch (q.type) {
      case "bool":
        return (
          <div className="flex gap-2">
            <Button variant={value === true ? "default" : "outline"} onClick={() => onChange(true)}>
              {t('common:yes', 'Yes')}
            </Button>
            <Button variant={value === false ? "default" : "outline"} onClick={() => onChange(false)}>
              {t('common:no', 'No')}
            </Button>
          </div>
        );
      case "number":
        return (
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          />
        );
      case "text":
        return (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  const groupBySection = () => {
    const sections: Record<string, Question[]> = {};
    questions.forEach((q) => {
      const sectionLabel = q.section ?? t('privacy:dpiaDetail.sections.general', 'General');
      if (!sections[sectionLabel]) sections[sectionLabel] = [];
      sections[sectionLabel].push(q);
    });
    return sections;
  };

  if (loading) return <div className="container p-6">{t('privacy:dpiaDetail.loading', 'Loading...')}</div>;
  if (!record) return <div className="container p-6">{t('privacy:dpiaDetail.notFound', 'DPIA not found')}</div>;

  const sections = groupBySection();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {record.title}
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge>{record.status}</Badge>
              {record.risk_level && <Badge variant="destructive">{record.risk_level}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {t('privacy:dpiaDetail.actions.save', 'Save')}
            </Button>
            {record.status === "open" && (
              <Button onClick={handleSubmit}>
                <Send className="w-4 h-4 mr-2" />
                {t('privacy:dpiaDetail.actions.submit', 'Submit')}
              </Button>
            )}
            {(record.status === "submitted" || record.status === "in_review") && (
              <Button onClick={handleScore}>
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('privacy:dpiaDetail.actions.score', 'Score')}
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              {t('privacy:dpiaDetail.actions.export', 'Export')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">{t('privacy:dpiaDetail.tabs.questions', 'Questions')}</TabsTrigger>
          <TabsTrigger value="score">{t('privacy:dpiaDetail.tabs.score', 'Score')}</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">
          {Object.entries(sections).map(([section, qs]) => (
            <Card key={section}>
              <CardHeader>
                <CardTitle className="text-lg">{section}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {qs.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label>
                      {q.text}
                      {q.required && (
                        <span className="text-destructive ml-1" aria-hidden="true">
                          {t('common:requiredIndicator', '*')}
                        </span>
                      )}
                    </Label>
                    {renderQuestion(q)}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="score">
          <Card>
            <CardHeader>
              <CardTitle>{t('privacy:dpiaDetail.score.title', 'DPIA Score')}</CardTitle>
            </CardHeader>
            <CardContent>
              {record.score ? (
                <div className="space-y-4">
                  <div>
                    <Label>{t('privacy:dpiaDetail.score.overall', 'Overall Score')}</Label>
                    <div className="text-3xl font-bold">
                      {t('privacy:dpiaDetail.score.percent', '{{value}}%', {
                        value: (record.score.overall * 100).toFixed(1),
                      })}
                    </div>
                  </div>
                  <div>
                    <Label>{t('privacy:dpiaDetail.score.risk', 'Risk Level')}</Label>
                    <Badge variant="destructive" className="text-lg">
                      {record.risk_level}
                    </Badge>
                  </div>
                  {record.score.impact !== undefined && (
                    <div>
                      <Label>{t('privacy:dpiaDetail.score.impact', 'Impact')}</Label>
                      <div className="text-xl">
                        {t('privacy:dpiaDetail.score.percent', '{{value}}%', {
                          value: (record.score.impact * 100).toFixed(1),
                        })}
                      </div>
                    </div>
                  )}
                  {record.score.likelihood !== undefined && (
                    <div>
                      <Label>{t('privacy:dpiaDetail.score.likelihood', 'Likelihood')}</Label>
                      <div className="text-xl">
                        {t('privacy:dpiaDetail.score.percent', '{{value}}%', {
                          value: (record.score.likelihood * 100).toFixed(1),
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">{t('privacy:dpiaDetail.score.empty', 'No score available yet. Submit and score the DPIA first.')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
