import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, FileText, Send, Download, Save } from "lucide-react";
import { format } from "date-fns";

interface AuditTask {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  findings: string | null;
  corrective_actions: string | null;
  due_date: string | null;
  report_generated_at: string | null;
  last_report_path: string | null;
  created_at: string;
}

export default function AuditTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<AuditTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (id) loadTask();
  }, [id]);

  async function loadTask() {
    try {
      const { data, error } = await supabase
        .from("audit_tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (error) {
      console.error("Failed to load audit task:", error);
      toast.error("Failed to load audit task");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!task) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("audit_tasks")
        .update({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          findings: task.findings,
          corrective_actions: task.corrective_actions,
          due_date: task.due_date,
        })
        .eq("id", task.id);

      if (error) throw error;
      toast.success("Audit task saved");
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save audit task");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateReport(sendEmail = false) {
    if (!task) return;

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase.functions.invoke("generate-audit-report", {
        body: {
          audit_id: task.id,
          tenant_id: task.tenant_id,
          user_email: profile?.email || user.email,
          send_email: sendEmail,
        },
      });

      if (error) throw error;

      toast.success(sendEmail ? "Report generated and sent" : "Report generated successfully");
      await loadTask(); // Reload to get updated report path
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadReport() {
    if (!task?.last_report_path) return;

    try {
      const { data, error } = await supabase.storage
        .from("reports")
        .download(task.last_report_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_report_${task.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download report:", error);
      toast.error("Failed to download report");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Task Not Found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/audit")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{task.title}</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant={task.status === "completed" ? "default" : "outline"}>{task.status}</Badge>
            <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>{task.priority}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>Basic information about the audit task</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={task.description || ""}
                onChange={(e) => setTask({ ...task, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={task.status} onValueChange={(value) => setTask({ ...task, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={task.priority} onValueChange={(value) => setTask({ ...task, priority: value })}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : ""}
                onChange={(e) => setTask({ ...task, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Results</CardTitle>
            <CardDescription>Findings and corrective actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                id="findings"
                value={task.findings || ""}
                onChange={(e) => setTask({ ...task, findings: e.target.value })}
                rows={6}
                placeholder="Document audit findings here..."
              />
            </div>

            <div>
              <Label htmlFor="corrective_actions">Corrective Actions</Label>
              <Textarea
                id="corrective_actions"
                value={task.corrective_actions || ""}
                onChange={(e) => setTask({ ...task, corrective_actions: e.target.value })}
                rows={6}
                placeholder="List corrective actions taken..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
          <CardDescription>Generate and download audit reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.report_generated_at && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Last report generated</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(task.report_generated_at), "PPpp")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleGenerateReport(false)} disabled={generating}>
              <FileText className="w-4 h-4 mr-2" />
              {generating ? "Generating..." : "Generate Report"}
            </Button>
            <Button variant="secondary" onClick={() => handleGenerateReport(true)} disabled={generating}>
              <Send className="w-4 h-4 mr-2" />
              Generate & Send Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
