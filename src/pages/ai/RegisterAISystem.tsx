import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/* ---------------------- Presets ---------------------- */
type PresetKey = 'chatbot' | 'recruiting' | 'fraud' | 'summarizer' | 'pred_maint' | 'face_access';

const PRESETS: Record<PresetKey, {
  label: string;
  name: string;
  description: string;
  purpose: string;
  risk: 'minimal'|'limited'|'high';
}> = {
  chatbot: {
    label: 'Customer Service Chatbot',
    name: 'Customer Service Chatbot',
    description: 'Conversational AI model handling customer support inquiries via text.',
    purpose: 'Automate customer support, FAQs, triage to human agents.',
    risk: 'minimal',
  },
  recruiting: {
    label: 'Recruiting Screening AI',
    name: 'Recruiting Screening AI',
    description: 'AI used to pre-select job candidates based on CV data.',
    purpose: 'Streamline HR recruitment workflows.',
    risk: 'high',
  },
  fraud: {
    label: 'Fraud Detection Model',
    name: 'Fraud Detection Model',
    description: 'ML model for identifying suspicious transactions or anomalies.',
    purpose: 'Reduce financial fraud and increase transaction security.',
    risk: 'high',
  },
  summarizer: {
    label: 'Document Summarizer',
    name: 'Document Summarizer',
    description: 'LLM summarizing legal or internal documents.',
    purpose: 'Speed up reading and knowledge extraction.',
    risk: 'limited',
  },
  pred_maint: {
    label: 'Predictive Maintenance AI',
    name: 'Predictive Maintenance AI',
    description: 'Model predicting machine failures based on sensor data.',
    purpose: 'Optimize maintenance schedules and reduce downtime.',
    risk: 'limited',
  },
  face_access: {
    label: 'Facial Recognition Access System',
    name: 'Facial Recognition Access System',
    description: 'Vision-based system for identity verification and access control.',
    purpose: 'Secure physical access based on biometric identification.',
    risk: 'high',
  },
};

/* ---------------------- Schema ---------------------- */
const schema = z.object({
  preset_key: z.union([z.literal('__custom__'), z.enum(['chatbot','recruiting','fraud','summarizer','pred_maint','face_access'])]).optional(),
  system_name: z.string().min(3, "Minimum 3 characters").max(120, "Maximum 120 characters"),
  custom_name: z.string().max(120).optional(),
  description: z.string().min(10, "Minimum 10 characters").max(2000, "Maximum 2000 characters"),
  purpose: z.string().min(5, "Minimum 5 characters").max(500, "Maximum 500 characters"),
  risk: z.enum(['minimal','limited','high']),
  deployment_status: z.enum(['planned','testing','live','retired']),
});

type FormValues = z.infer<typeof schema>;

/* ---------------------- UI helper ---------------------- */
const Field = ({
  label, hint, error, children, className
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
    {children}
    {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    {error ? <div className="mt-1 text-xs text-red-600">{String(error)}</div> : null}
  </div>
);

/* ---------------------- Component ---------------------- */
export default function RegisterAISystem() {
  const { t } = useTranslation(['aiSystems', 'common']);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        preset_key: '__custom__',
        system_name: '',
        custom_name: '',
        description: '',
        purpose: '',
        risk: 'minimal',
        deployment_status: 'planned',
      },
      mode: 'onChange',
    });

  const preset = watch('preset_key');
  const isCustom = !preset || preset === '__custom__';

  function applyPreset(key: PresetKey | '__custom__') {
    if (key === '__custom__') {
      setValue('preset_key', '__custom__');
      setValue('system_name', '');
      setValue('custom_name', '');
      setValue('description', '');
      setValue('purpose', '');
      setValue('risk', 'minimal');
      return;
    }
    const p = PRESETS[key];
    setValue('preset_key', key);
    setValue('system_name', p.name);
    setValue('custom_name', '');
    setValue('description', p.description);
    setValue('purpose', p.purpose);
    setValue('risk', p.risk);
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        preset_key: isCustom ? null : (values.preset_key as PresetKey),
        system_name: isCustom ? (values.custom_name?.trim() || values.system_name) : values.system_name,
        description: values.description,
        purpose: values.purpose,
        risk: values.risk,
        deployment_status: values.deployment_status,
      };

      // TODO: Replace with actual API endpoint when backend is ready
      const { data, error } = await supabase.functions.invoke('register-ai-system', {
        body: payload
      });

      if (error) {
        throw new Error(error.message || 'Failed to register AI system');
      }

      toast({ title: t('aiSystems:register.success', 'AI System registered successfully') });
      navigate('/ai-systems');
    } catch (error) {
      console.error('[RegisterAISystem] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: t('common:error', 'Error'), 
        description: message,
        variant: 'destructive' 
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('aiSystems:register.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('aiSystems:register.description')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Preset chooser */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('aiSystems:register.presets.label')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(PRESETS).map(([key, p]) => (
                <Button 
                  key={key} 
                  type="button" 
                  variant={preset === key ? "default" : "outline"}
                  onClick={() => applyPreset(key as PresetKey)} 
                  className="justify-start h-auto py-3 text-left w-full" 
                  title={p.description}
                >
                  <div className="text-left w-full">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</div>
                  </div>
                </Button>
              ))}
              <Button 
                type="button" 
                variant={isCustom ? "default" : "outline"}
                onClick={() => applyPreset('__custom__')} 
                className="justify-start h-auto py-3 w-full"
              >
                {t('aiSystems:register.presets.custom')}
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              {t('aiSystems:register.presets.hintText')}
            </div>
          </CardContent>
        </Card>

        {/* Form fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('common:details', 'Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field 
              label={t('aiSystems:register.fields.system_name')} 
              error={errors.system_name?.message}
            >
              <Input 
                placeholder="e.g. Customer Service Chatbot" 
                {...register('system_name')} 
              />
            </Field>

            {isCustom && (
              <Field 
                label={t('aiSystems:register.fields.custom_name')}
                hint={t('aiSystems:register.fields.custom_name_ph')}
              >
                <Input 
                  placeholder={t('aiSystems:register.fields.custom_name_ph')} 
                  {...register('custom_name')} 
                />
              </Field>
            )}

            <Field 
              label={t('aiSystems:register.fields.description')} 
              error={errors.description?.message}
            >
              <Textarea 
                rows={4} 
                placeholder="Detailed description of the AI system..." 
                {...register('description')} 
              />
            </Field>

            <Field 
              label={t('aiSystems:register.fields.purpose')} 
              error={errors.purpose?.message}
            >
              <Textarea 
                rows={3} 
                placeholder="Business purpose and use case..." 
                {...register('purpose')} 
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field 
                label={t('aiSystems:register.fields.risk')} 
                error={errors.risk?.message}
              >
                <Controller
                  control={control}
                  name="risk"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('aiSystems:risk.minimal')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">{t('aiSystems:risk.minimal')}</SelectItem>
                        <SelectItem value="limited">{t('aiSystems:risk.limited')}</SelectItem>
                        <SelectItem value="high">{t('aiSystems:risk.high')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field 
                label={t('aiSystems:register.fields.deployment')} 
                error={errors.deployment_status?.message}
              >
                <Controller
                  control={control}
                  name="deployment_status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('aiSystems:deploy.planned')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">{t('aiSystems:deploy.planned')}</SelectItem>
                        <SelectItem value="testing">{t('aiSystems:deploy.testing')}</SelectItem>
                        <SelectItem value="live">{t('aiSystems:deploy.live')}</SelectItem>
                        <SelectItem value="retired">{t('aiSystems:deploy.retired')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            {t('aiSystems:register.actions.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t('common:saving', 'Saving...') : t('aiSystems:register.actions.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
