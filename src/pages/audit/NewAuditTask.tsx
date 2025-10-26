import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewAuditTask() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  async function handleCreate() {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      const { data, error } = await supabase
        .from("audit_tasks")
        .insert({
          tenant_id: profile.company_id,
          created_by: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Audit task created");
      navigate(`/audit/${data.id}`);
    } catch (error) {
      console.error("Failed to create audit task:", error);
      toast.error("Failed to create audit task");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/audit")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Audit Task</h1>
          <p className="text-muted-foreground mt-1">Create a new post-implementation audit task</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Information</CardTitle>
          <CardDescription>Enter the details for the new audit task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Q4 2024 Security Controls Review"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the scope and objectives of this audit..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Audit Task"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/audit")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
