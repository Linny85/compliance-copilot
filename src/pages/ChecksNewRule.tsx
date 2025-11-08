import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ControlSelect } from "@/components/controls/ControlSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { deriveMetricKey } from "@/lib/checks/helpers";

// ========== Validation Schemas ==========
const staticSpecSchema = z.object({
  criteria: z.object({
    path: z.string().min(1, "Path required"),
    operator: z.enum(['equals', 'contains', 'gt', 'gte', 'lt', 'lte', 'regex']),
    value: z.any(),
  }),
});

const querySpecSchema = z.object({
  source: z.enum(['supabase', 'http', 'function']),
  query: z.string().min(1, "Query required"),
  evaluator: z.enum(['any_pass', 'all_pass', 'threshold']),
  threshold: z.number().min(0).max(1).optional(),
  timeout_ms: z.number().int().positive().max(60000).optional(),
});

const baseSchema = z.object({
  name: z.string().min(4, "Min 4 characters").max(120, "Max 120 characters"),
  code: z.string().regex(/^[A-Z0-9_-]{3,40}$/, "Only A-Z, 0-9, -, _ (3-40 chars)"),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  kind: z.enum(['static', 'query']),
  enabled: z.boolean().default(true),
  description: z.string().max(500).optional(),
  control_id: z.string().uuid().optional().or(z.literal("")),
  
  // Metrics
  metric_key: z.string().optional(),
  aggregation: z.enum(['latest', 'avg', 'min', 'max', 'sum']).optional(),
  pass_when: z.enum(['lte', 'lt', 'gte', 'gt', 'eq', 'ne']).optional(),
  pass_value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  
  // Governance
  owner_user_id: z.string().uuid().optional().or(z.literal("")),
  tags: z.string().optional(), // comma-separated
  schedule_cron: z.string().optional(),
  remediation: z.string().max(500).optional(),
});

const formSchema = z.discriminatedUnion('kind', [
  baseSchema.extend({ kind: z.literal('static'), spec: staticSpecSchema }),
  baseSchema.extend({ kind: z.literal('query'), spec: querySpecSchema }),
]);

type FormValues = z.infer<typeof formSchema>;

// ========== Helper Functions ==========
function parseJSONSafe<T = unknown>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function toBool(v: string) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

// ========== Main Component ==========
export default function ChecksNewRule() {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; rows?: any[]; error?: string }>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [rawSpec, setRawSpec] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [metricKeyManuallySet, setMetricKeyManuallySet] = useState(false);
  
  // Separate state for static and query specs to preserve values when switching
  const [staticSpec, setStaticSpec] = useState<any>({ criteria: { path: '', operator: 'equals', value: '' } });
  const [querySpec, setQuerySpec] = useState<any>({ source: 'supabase', query: '', evaluator: 'any_pass', timeout_ms: 15000 });

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      severity: 'medium',
      kind: 'static',
      enabled: true,
      description: '',
      control_id: '',
      spec: {
        criteria: { path: '', operator: 'equals', value: '' },
      } as any,
      metric_key: '',
      aggregation: 'latest',
      pass_when: 'lte',
      pass_value: '',
      owner_user_id: '',
      tags: '',
      schedule_cron: '',
      remediation: '',
    },
    mode: 'onChange',
  });

  const { register, handleSubmit, control, watch, formState: { errors, isValid }, setValue, getValues } = methods;
  
  // Watch metric_key changes to detect manual edits
  React.useEffect(() => {
    const subscription = watch((value, { name: fieldName }) => {
      if (fieldName === 'metric_key' && value.metric_key !== deriveMetricKey(value.code || '')) {
        setMetricKeyManuallySet(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  
  const kind = watch('kind');
  const specValue = watch('spec');
  const code = watch('code');
  const name = watch('name');
  const currentSpec = watch('spec');

  // ========== Handlers ==========
  const onCodeChange = (newCode: string) => {
    setValue('code', newCode);
    if (!metricKeyManuallySet && newCode) {
      setValue('metric_key', deriveMetricKey(newCode));
    }
  };

  const onKindChange = (newKind: 'static' | 'query') => {
    // Save current spec before switching
    if (kind === 'static' && 'criteria' in currentSpec) {
      setStaticSpec(currentSpec);
    } else if (kind === 'query' && 'query' in currentSpec) {
      setQuerySpec(currentSpec);
    }
    
    setValue('kind', newKind);
    
    // Restore appropriate spec
    if (newKind === 'static') {
      setValue('spec', staticSpec as any);
      setRawSpec(JSON.stringify(staticSpec, null, 2));
    } else {
      // Set default timeout_ms if not already set
      const spec = { ...querySpec };
      if (!spec.timeout_ms) spec.timeout_ms = 15000;
      setValue('spec', spec as any);
      setRawSpec(JSON.stringify(spec, null, 2));
    }
  };

  const applyJSON = () => {
    const parsed = parseJSONSafe(rawSpec);
    if (!parsed) {
      toast({ title: tx("checks.form.errors.invalid_json"), variant: "destructive" });
      return;
    }
    setValue('spec', parsed as any, { shouldValidate: true });
    setJsonMode(false);
  };

  const loadExample = () => {
    const example = kind === 'static'
      ? { criteria: { path: 'system.dataRetention.days', operator: 'lte', value: 30 } }
      : { source: 'supabase', query: 'SELECT * FROM v_backup_ages LIMIT 10;', evaluator: 'any_pass', timeout_ms: 15000 };
    setRawSpec(JSON.stringify(example, null, 2));
  };

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    try {
      const payload = {
        title: data.name,
        code: data.code,
        description: data.description,
        severity: data.severity,
        kind: data.kind,
        enabled: data.enabled,
        control_id: data.control_id || undefined,
        spec: data.spec,
        // Additional fields (backend needs to support these)
        metric_key: data.metric_key,
        aggregation: data.aggregation,
        pass_when: data.pass_when,
        pass_value: data.pass_value,
        owner_user_id: data.owner_user_id || undefined,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : undefined,
        schedule_cron: data.schedule_cron,
        remediation: data.remediation,
      };

      const { data: result, error } = await supabase.functions.invoke("create-rule", { body: payload });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      if (result?.error) {
        const key = result.error === 'DUPLICATE_CODE' ? "checks.form.errors.duplicate_code" : "checks.form.errors.save_failed";
        toast({ title: tx(key), variant: "destructive" });
        return;
      }

      toast({ title: tx("checks.form.success.saved") });
      navigate("/checks?tab=rules");
    } catch (err: any) {
      console.error('[ChecksNewRule] Error:', err);
      toast({ title: tx("checks.form.errors.save_failed"), description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = getValues();
      // Note: You'll need to create a test-rule edge function
      const res = await supabase.functions.invoke("test-rule", { body: payload });
      setTestResult(res.data || { ok: false, error: "No response" });
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message ?? "Network error" });
    } finally {
      setTesting(false);
    }
  }

  // Validation status for live preview
  const getValidationStatus = () => {
    const hasName = name && name.length >= 4;
    const hasCode = code && /^[A-Z0-9_-]{3,40}$/.test(code);
    
    let hasValidSpec = false;
    if (kind === 'static' && 'criteria' in currentSpec) {
      // CRITICAL: 0 and false are valid values, check for undefined/null only
      hasValidSpec = !!(
        currentSpec.criteria?.path && 
        currentSpec.criteria?.operator && 
        currentSpec.criteria?.value !== undefined &&
        currentSpec.criteria?.value !== null &&
        currentSpec.criteria?.value !== ''
      );
    } else if (kind === 'query' && 'query' in currentSpec) {
      hasValidSpec = !!(currentSpec.query && currentSpec.source && currentSpec.evaluator);
    }
    
    if (hasName && hasCode && hasValidSpec) {
      return { status: 'valid', icon: CheckCircle2, text: tx("checks.form.validation.valid") || '✓ Gültig', color: 'text-green-600' };
    }
    if (!hasName || !hasCode || !hasValidSpec) {
      return { status: 'incomplete', icon: AlertCircle, text: tx("checks.form.validation.incomplete") || '⚠ Unvollständig', color: 'text-amber-600' };
    }
    return { status: 'invalid', icon: XCircle, text: tx("checks.form.validation.invalid") || '✖ Fehler', color: 'text-red-600' };
  };

  const validationStatus = getValidationStatus();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{tx("checks.form.new_rule_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tx("checks.form.hint.sandbox")}</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column - Basic Fields */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{tx("checks.labels.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={tx("checks.form.fields.title")} error={errors.name?.message}>
                <Input {...register("name")} placeholder={tx("checks.form.fields.title")} />
              </Field>

              <Field label={tx("checks.form.fields.code")} hint={tx("checks.form.fields.help_code")} error={errors.code?.message}>
                <Input 
                  {...register("code")} 
                  onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                  placeholder="NIS2-BACKUP-AGE" 
                  className="uppercase tracking-wide" 
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={tx("checks.form.fields.severity")} error={errors.severity?.message}>
                  <Controller
                    control={control}
                    name="severity"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={tx("checks.form.placeholders.severity")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{tx("checks.form.severities.low")}</SelectItem>
                          <SelectItem value="medium">{tx("checks.form.severities.medium")}</SelectItem>
                          <SelectItem value="high">{tx("checks.form.severities.high")}</SelectItem>
                          <SelectItem value="critical">{tx("checks.form.severities.critical")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field label={tx("checks.form.fields.kind")} error={errors.kind?.message}>
                  <Controller
                    control={control}
                    name="kind"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => onKindChange(v as 'static' | 'query')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="static">{tx("checks.form.kinds.static")}</SelectItem>
                          <SelectItem value="query">{tx("checks.form.kinds.query")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="enabled"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <Label>{tx("checks.form.fields.enabled")}</Label>
              </div>

              <Field label={tx("checks.form.fields.description")} error={errors.description?.message}>
                <Textarea {...register("description")} rows={3} />
              </Field>

              <Field label={tx("checks.form.fields.control_id")} error={errors.control_id?.message}>
                <Controller
                  control={control}
                  name="control_id"
                  render={({ field }) => (
                    <ControlSelect
                      value={field.value || null}
                      onChange={(id) => field.onChange(id || "")}
                      placeholder={tx("checks.form.placeholders.control_id") || ""}
                    />
                  )}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Spec & Advanced */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tx("checks.form.fields.spec")}</CardTitle>
                <div className={`flex items-center gap-1.5 text-sm ${validationStatus.color}`}>
                  <validationStatus.icon className="h-4 w-4" />
                  <span>{validationStatus.text}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={jsonMode ? "json" : "form"} onValueChange={(v) => setJsonMode(v === "json")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="form">{tx("checks.specEditor.form")}</TabsTrigger>
                  <TabsTrigger value="json">{tx("checks.specEditor.json")}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="form" className="space-y-3 mt-4">
                  {kind === 'static' ? <StaticSpecForm control={control} register={register} watch={watch} setValue={setValue} tx={tx} /> : <QuerySpecForm control={control} register={register} tx={tx} />}
                </TabsContent>
                
                <TabsContent value="json" className="space-y-3 mt-4">
                  <Textarea
                    value={rawSpec || JSON.stringify(specValue, null, 2)}
                    onChange={(e) => setRawSpec(e.target.value)}
                    className="font-mono min-h-[200px] sm:min-h-[280px]"
                    placeholder="{}"
                  />
                  <div className="flex gap-2">
                    <Button type="button" onClick={applyJSON} variant="secondary" size="sm">
                      {tx("checks.form.actions.save")}
                    </Button>
                    <Button type="button" onClick={loadExample} variant="outline" size="sm">
                      Load Example
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Metrics & Advanced Settings */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex w-full items-center justify-between text-left hover:opacity-70 transition-opacity">
                    <CardTitle className="text-lg">{tx("checks.form.advanced") || "Erweiterte Einstellungen"}</CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* Metrics */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">{tx("checks.form.sections.metrics") || "Metriken"}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field 
                        label={tx("checks.form.fields.metric_key")}
                        hint={tx("checks.form.hints.metric_key") || "Technischer Name für Berichte; wird aus Code abgeleitet"}
                      >
                        <Input 
                          {...register("metric_key")} 
                          onChange={(e) => {
                            setValue("metric_key", e.target.value);
                            setMetricKeyManuallySet(e.target.value !== deriveMetricKey(code));
                          }}
                          placeholder="nis2.backup.age" 
                        />
                      </Field>
                      <Field label={tx("checks.form.fields.aggregation")}>
                        <Controller
                          control={control}
                          name="aggregation"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="latest">{tx("checks.form.aggregations.latest")}</SelectItem>
                                <SelectItem value="avg">{tx("checks.form.aggregations.avg")}</SelectItem>
                                <SelectItem value="min">{tx("checks.form.aggregations.min")}</SelectItem>
                                <SelectItem value="max">{tx("checks.form.aggregations.max")}</SelectItem>
                                <SelectItem value="sum">{tx("checks.form.aggregations.sum")}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </Field>
                      <Field label={tx("checks.form.fields.pass_when")}>
                        <Controller
                          control={control}
                          name="pass_when"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lte">{tx("checks.form.pass_ops.lte")}</SelectItem>
                                <SelectItem value="lt">{tx("checks.form.pass_ops.lt")}</SelectItem>
                                <SelectItem value="gte">{tx("checks.form.pass_ops.gte")}</SelectItem>
                                <SelectItem value="gt">{tx("checks.form.pass_ops.gt")}</SelectItem>
                                <SelectItem value="eq">{tx("checks.form.pass_ops.eq")}</SelectItem>
                                <SelectItem value="ne">{tx("checks.form.pass_ops.ne")}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </Field>
                      <Field label={tx("checks.form.fields.pass_value")}>
                        <Input {...register("pass_value")} placeholder="30" />
                      </Field>
                    </div>
                  </div>

                  {/* Governance */}
                  <div className="space-y-3 pt-3 border-t">
                    <h3 className="text-sm font-medium">{tx("checks.form.sections.governance") || "Governance"}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label={tx("checks.form.fields.owner_user_id")}>
                        <Input {...register("owner_user_id")} placeholder="UUID" />
                      </Field>
                      <Field label={tx("checks.form.fields.schedule_cron")}>
                        <Input {...register("schedule_cron")} placeholder="0 3 * * *" />
                      </Field>
                      <Field label={tx("checks.form.fields.tags")} className="sm:col-span-2">
                        <Input {...register("tags")} placeholder="backup, reporting" />
                      </Field>
                      <Field label={tx("checks.form.fields.remediation")} className="sm:col-span-2">
                        <Input {...register("remediation")} placeholder="Enable daily offsite backup" />
                      </Field>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <Card className={testResult.ok ? "border-green-500" : "border-red-500"}>
          <CardHeader>
            <CardTitle>{testResult.ok ? 'Test OK' : 'Test Error'}</CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.error ? (
              <pre className="text-sm whitespace-pre-wrap">{testResult.error}</pre>
            ) : (
              <pre className="text-sm overflow-auto max-h-72">{JSON.stringify(testResult.rows ?? [], null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t">
        <Button type="button" onClick={() => navigate("/checks?tab=rules")} variant="ghost" className="w-full sm:w-auto">
          {tx("checks.form.actions.cancel")}
        </Button>
        <Button type="button" onClick={runTest} disabled={testing || !isValid} variant="outline" className="w-full sm:w-auto">
          {testing ? "..." : tx("checks.form.actions.test")}
        </Button>
        <div className="w-full sm:w-auto relative group">
          <Button 
            type="submit" 
            disabled={submitting || validationStatus.status !== 'valid'} 
            className="w-full"
            title={validationStatus.status !== 'valid' ? (tx("checks.form.validation.complete_required") || "Bitte Titel, Code und Spezifikation vervollständigen") : undefined}
          >
            {submitting ? tx("common.saving") : tx("checks.form.actions.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ========== Sub-components ==========
function Field({ label, hint, error, children, className }: { label: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{String(error)}</p>}
    </div>
  );
}

function StaticSpecForm({ control, register, watch, setValue, tx }: any) {
  const criteriaValue = watch('spec.criteria.value');

  return (
    <div className="space-y-3">
      <Field 
        label={tx("checks.form.fields.query")}
        hint={tx("checks.form.hints.json_path") || "JSON-Pfad in Ihren Systemdaten, z. B. system.dataRetention.days"}
      >
        <Input {...register('spec.criteria.path')} placeholder="system.dataRetention.days" />
      </Field>
      <Field 
        label="Operator"
        hint={tx("checks.form.hints.operator") || "equals = ist gleich, gt = größer als, lt = kleiner als"}
      >
        <Controller
          control={control}
          name="spec.criteria.operator"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">equals (=)</SelectItem>
                <SelectItem value="contains">contains (∋)</SelectItem>
                <SelectItem value="gt">gt (&gt;)</SelectItem>
                <SelectItem value="gte">gte (≥)</SelectItem>
                <SelectItem value="lt">lt (&lt;)</SelectItem>
                <SelectItem value="lte">lte (≤)</SelectItem>
                <SelectItem value="regex">regex (pattern)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field 
        label="Value"
        hint={tx("checks.form.hints.value") || "Schwellwert, z. B. 30 (Tage) oder true/false"}
      >
        <Input
          value={criteriaValue ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            const asNum = Number(raw);
            if (!Number.isNaN(asNum) && raw.trim() !== '') setValue('spec.criteria.value', asNum);
            else if (raw === 'true' || raw === 'false') setValue('spec.criteria.value', toBool(raw));
            else setValue('spec.criteria.value', raw);
          }}
          placeholder="30"
        />
      </Field>
    </div>
  );
}

function QuerySpecForm({ control, register, tx }: any) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field label={tx("checks.form.fields.source")}>
          <Controller
            control={control}
            name="spec.source"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supabase">supabase</SelectItem>
                  <SelectItem value="http">http</SelectItem>
                  <SelectItem value="function">function</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label={tx("checks.form.fields.evaluator")}>
          <Controller
            control={control}
            name="spec.evaluator"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_pass">{tx("checks.form.evaluators.any_pass")}</SelectItem>
                  <SelectItem value="all_pass">{tx("checks.form.evaluators.all_pass")}</SelectItem>
                  <SelectItem value="threshold">{tx("checks.form.evaluators.threshold")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label={tx("checks.form.fields.threshold")}>
          <Input type="number" step="0.01" {...register('spec.threshold', { valueAsNumber: true })} placeholder="0.8" />
        </Field>
      </div>
      <Field label={tx("checks.form.fields.query")}>
        <Textarea {...register('spec.query')} className="font-mono" rows={6} placeholder="SELECT * FROM v_backup_ages WHERE days > 30 LIMIT 50;" />
      </Field>
      <Field label={tx("checks.form.fields.timeout_ms")}>
        <Input type="number" {...register('spec.timeout_ms', { valueAsNumber: true })} placeholder="15000" />
      </Field>
    </div>
  );
}
