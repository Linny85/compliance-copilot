import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

type Severity = 'low' | 'medium' | 'high' | 'critical';
type Kind = 'static' | 'query';

const FormSchema = z.object({
  title: z.string().min(3),
  code: z.string().regex(/^[a-z0-9-_:.]+$/i).min(2),
  description: z.string().max(1000).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  kind: z.enum(['static', 'query']),
  enabled: z.boolean().default(true),
  control_id: z.string().uuid().optional().or(z.literal("")),
  specText: z.string().min(2),
});

type FormValues = z.infer<typeof FormSchema>;

export default function ChecksNewRule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      enabled: true,
      severity: 'medium',
      kind: 'static',
      specText: JSON.stringify({ metric: "password_rotation_days", value: 92, op: "<=", threshold: 90 }, null, 2),
    },
  });

  const kind = watch("kind");

  const templates = useMemo(() => ({
    static: JSON.stringify({ metric: "password_rotation_days", value: 92, op: "<=", threshold: 90 }, null, 2),
    query: JSON.stringify({ table: "evidences", threshold: 1 }, null, 2),
  }), []);

  const onKindChange = (val: Kind) => {
    setValue("kind", val, { shouldValidate: true });
    setValue("specText", templates[val], { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      let spec: any;
      try {
        spec = JSON.parse(values.specText);
      } catch {
        toast({ title: t("checks:form.errors.invalid_json"), variant: "destructive" });
        setSubmitting(false);
        return;
      }

      if (values.kind === "static") {
        const StaticSpec = z.object({
          metric: z.string().min(1),
          value: z.number(),
          op: z.enum(['<', '<=', '>', '>=', '==']).default('<='),
          threshold: z.number(),
        });
        try {
          StaticSpec.parse(spec);
        } catch {
          toast({ title: t("checks:form.errors.invalid_spec"), variant: "destructive" });
          setSubmitting(false);
          return;
        }
      } else {
        const QuerySpec = z.object({
          table: z.string().min(1).optional(),
          threshold: z.number().int().nonnegative(),
        });
        try {
          QuerySpec.parse(spec);
        } catch {
          toast({ title: t("checks:form.errors.invalid_spec"), variant: "destructive" });
          setSubmitting(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("create-rule", {
        body: {
          title: values.title,
          code: values.code,
          description: values.description,
          severity: values.severity,
          kind: values.kind,
          enabled: values.enabled,
          control_id: values.control_id || undefined,
          spec,
        },
      });

      if (error) {
        const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
        toast({ title: t("checks:form.errors.save_failed"), description: msg, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      if (data?.error) {
        const key = data.error === 'DUPLICATE_CODE' ? "checks:form.errors.duplicate_code" : "checks:form.errors.save_failed";
        toast({ title: t(key), variant: "destructive" });
        setSubmitting(false);
        return;
      }

      toast({ title: t("checks:form.success.saved") });
      navigate("/checks?tab=rules");
    } catch (err) {
      console.error('[ChecksNewRule] Error:', err);
      toast({ title: t("checks:form.errors.save_failed"), variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("checks:form.new_rule_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("checks:form.fields.title")}</Label>
                <Input {...register("title")} />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>
              <div>
                <Label>{t("checks:form.fields.code")}</Label>
                <Input {...register("code")} />
                <p className="text-xs text-muted-foreground">{t("checks:form.help.code")}</p>
                {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
              </div>
              <div>
                <Label>{t("checks:form.fields.severity")}</Label>
                <Select defaultValue="medium" onValueChange={(v) => setValue("severity", v as Severity, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder={t("checks:form.placeholders.severity")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("common:severity.low")}</SelectItem>
                    <SelectItem value="medium">{t("common:severity.medium")}</SelectItem>
                    <SelectItem value="high">{t("common:severity.high")}</SelectItem>
                    <SelectItem value="critical">{t("common:severity.critical")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>{t("checks:form.fields.kind")}</Label>
                  <Select defaultValue="static" onValueChange={(v) => onKindChange(v as Kind)}>
                    <SelectTrigger><SelectValue placeholder={t("checks:form.placeholders.kind")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">{t("checks:kind.static")}</SelectItem>
                      <SelectItem value="query">{t("checks:kind.query")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch defaultChecked {...register("enabled")} />
                  <Label>{t("checks:form.fields.enabled")}</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>{t("checks:form.fields.description")}</Label>
              <Textarea rows={3} {...register("description")} />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>

            <div>
              <Label>{t("checks:form.fields.control_id")}</Label>
              <Input placeholder={t("checks:form.placeholders.control_id") || ""} {...register("control_id")} />
              <p className="text-xs text-muted-foreground">{t("checks:form.help.control_id")}</p>
            </div>

            <div>
              <Label>
                {t("checks:form.fields.spec")}
                <span className="ml-2 text-xs text-muted-foreground">({t(`checks:kind.${kind}`)})</span>
              </Label>
              <Textarea rows={10} className="font-mono text-sm" {...register("specText")} />
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setValue("specText", templates.static)}>
                  {t("checks:form.actions.load_static_template")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setValue("specText", templates.query)}>
                  {t("checks:form.actions.load_query_template")}
                </Button>
              </div>
              {errors.specText && <p className="text-sm text-red-500">{errors.specText.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => navigate("/checks?tab=rules")}>
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("common:saving") : t("common:save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
