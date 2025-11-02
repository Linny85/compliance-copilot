import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(['audit', 'common']);
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
      toast.error(t('audit:toast.titleRequired'));
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

      toast.success(t('audit:toast.createSuccess'));
      navigate(`/audit/${data.id}`);
    } catch (error) {
      console.error("Failed to create audit task:", error);
      toast.error(t('audit:toast.createFailed'));
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
          <h1 className="text-3xl font-bold">{t('audit:new.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('audit:new.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('audit:new.taskInfo')}</CardTitle>
          <CardDescription>{t('audit:new.taskInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">{t('audit:fields.title')} *</Label>
            <Input
              id="title"
              placeholder={t('audit:fields.titlePlaceholder')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">{t('audit:fields.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('audit:fields.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">{t('audit:fields.priority')}</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('audit:priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('audit:priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('audit:priority.high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">{t('audit:fields.dueDate')}</Label>
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
              {creating ? t('audit:actions.creating') : t('audit:actions.create')}
            </Button>
            <Button variant="outline" onClick={() => navigate("/audit")}>
              {t('audit:actions.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
