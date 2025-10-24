import { useState, useEffect } from "react";
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
import { FileText, Save, Send, BarChart3, Download } from "lucide-react";

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
  value: any;
  evidence_id: string | null;
}

export default function DPIADetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [record, setRecord] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Load record
      const { data: recordData, error: recError } = await supabase
        .from("dpia_records")
        .select("*, dpia_questionnaires(id)")
        .eq("id", id)
        .single();

      if (recError) throw recError;
      setRecord(recordData);

      // Load questions
      const { data: qData, error: qError } = await supabase
        .from("dpia_questions")
        .select("*")
        .eq("questionnaire_id", recordData.questionnaire_id)
        .order("section", { ascending: true });

      if (qError) throw qError;
      setQuestions(qData || []);

      // Load answers
      const { data: aData } = await supabase
        .from("dpia_answers")
        .select("*")
        .eq("record_id", id);

      const ansMap: Record<string, any> = {};
      (aData || []).forEach((a: any) => {
        ansMap[a.question_id] = a.value;
      });
      setAnswers(ansMap);
    } catch (err: any) {
      toast({ title: "Error loading DPIA", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const answerArray = questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id] ?? null,
    }));

    try {
      const { error } = await supabase.functions.invoke("dpia-save", {
        body: { record_id: id, answers: answerArray },
      });

      if (error) throw error;
      toast({ title: "Progress saved" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    const answerArray = questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id] ?? null,
    }));

    try {
      const { error } = await supabase.functions.invoke("dpia-submit", {
        body: { record_id: id, answers: answerArray },
      });

      if (error) throw error;
      toast({ title: "DPIA submitted" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error submitting", description: err.message, variant: "destructive" });
    }
  };

  const handleScore = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("dpia-score", {
        body: { record_id: id },
      });

      if (error) throw error;
      toast({ title: "DPIA scored", description: `Risk: ${data.risk_level}, Score: ${(data.score.overall * 100).toFixed(1)}%` });
      loadData();
    } catch (err: any) {
      toast({ title: "Error scoring", description: err.message, variant: "destructive" });
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("dpia-export", {
        body: { record_id: id },
      });

      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dpia-bundle-${id}.json`;
      a.click();
      toast({ title: "DPIA exported" });
    } catch (err: any) {
      toast({ title: "Error exporting", description: err.message, variant: "destructive" });
    }
  };

  const renderQuestion = (q: Question) => {
    const value = answers[q.id];
    const onChange = (v: any) => setAnswers({ ...answers, [q.id]: v });

    switch (q.type) {
      case "bool":
        return (
          <div className="flex gap-2">
            <Button variant={value === true ? "default" : "outline"} onClick={() => onChange(true)}>
              Yes
            </Button>
            <Button variant={value === false ? "default" : "outline"} onClick={() => onChange(false)}>
              No
            </Button>
          </div>
        );
      case "number":
        return <Input type="number" value={value || ""} onChange={(e) => onChange(Number(e.target.value))} />;
      case "text":
        return <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} />;
      default:
        return <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  const groupBySection = () => {
    const sections: Record<string, Question[]> = {};
    questions.forEach((q) => {
      const sec = q.section || "General";
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(q);
    });
    return sections;
  };

  if (loading) return <div className="container p-6">Loading...</div>;
  if (!record) return <div className="container p-6">DPIA not found</div>;

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
              Save
            </Button>
            {record.status === "open" && (
              <Button onClick={handleSubmit}>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            )}
            {(record.status === "submitted" || record.status === "in_review") && (
              <Button onClick={handleScore}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Score
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
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
                      {q.required && <span className="text-destructive ml-1">*</span>}
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
              <CardTitle>DPIA Score</CardTitle>
            </CardHeader>
            <CardContent>
              {record.score ? (
                <div className="space-y-4">
                  <div>
                    <Label>Overall Score</Label>
                    <div className="text-3xl font-bold">{(record.score.overall * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <Label>Risk Level</Label>
                    <Badge variant="destructive" className="text-lg">
                      {record.risk_level}
                    </Badge>
                  </div>
                  {record.score.impact !== undefined && (
                    <div>
                      <Label>Impact</Label>
                      <div className="text-xl">{(record.score.impact * 100).toFixed(1)}%</div>
                    </div>
                  )}
                  {record.score.likelihood !== undefined && (
                    <div>
                      <Label>Likelihood</Label>
                      <div className="text-xl">{(record.score.likelihood * 100).toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No score available yet. Submit and score the DPIA first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
