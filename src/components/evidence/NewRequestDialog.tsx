import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { ControlSelect } from '@/components/controls/ControlSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const requestSchema = z.object({
  control_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  due_at: z.string().datetime().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

type RequestForm = z.infer<typeof requestSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSuccess?: () => void;
};

export function NewRequestDialog({ open, onOpenChange, tenantId, onSuccess }: Props) {
  const { t } = useTranslation(['evidence']);
  const [controlId, setControlId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset form on close
      setControlId(null);
      setTitle('');
      setDescription('');
      setDueAt('');
      setSeverity('medium');
    }
  }, [open]);

  const handleSave = async () => {
    // Client-side validation
    const formData: Partial<RequestForm> = {
      control_id: controlId ?? undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
      severity,
    };

    const parsed = requestSchema.safeParse(formData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      if (firstError.path[0] === 'control_id') {
        toast.error(t('evidence:validation.controlRequired'));
      } else if (firstError.path[0] === 'title') {
        toast.error(t('evidence:validation.titleRequired'));
      } else {
        toast.error(firstError.message);
      }
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('create-evidence-request', {
        body: {
          control_id: parsed.data.control_id,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          due_at: parsed.data.due_at ?? null,
          severity: parsed.data.severity,
        },
      });

      if (error) throw error;

      toast.success(t('evidence:success.request_created'));
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to create request:', error);
      toast.error(t('evidence:errors.create_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('evidence:actions.newRequest')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t('evidence:fields.control')}</Label>
            <ControlSelect
              value={controlId}
              onChange={(id) => setControlId(id)}
              placeholder={t('evidence:fields.controlPlaceholder')}
            />
          </div>

          <div>
            <Label>{t('evidence:fields.title')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('evidence:fields.title')}
            />
          </div>

          <div>
            <Label>{t('evidence:fields.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('evidence:fields.description')}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('evidence:fields.dueAt')}</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div>
              <Label>{t('evidence:fields.severity')}</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('evidence:severity.low')}</SelectItem>
                  <SelectItem value="medium">{t('evidence:severity.medium')}</SelectItem>
                  <SelectItem value="high">{t('evidence:severity.high')}</SelectItem>
                  <SelectItem value="critical">{t('evidence:severity.critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('evidence:actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common:loading') : t('evidence:actions.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
