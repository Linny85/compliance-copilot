import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type StaticSpec = { metric: string; value: number; op: "<" | "<=" | ">" | ">=" | "=="; threshold: number };
type QuerySpec = { table?: string; threshold: number };
type Kind = "static" | "query";

type Props = {
  kind: Kind;
  value: string;              // JSON string
  onChange: (val: string) => void;
};

const StaticSchema = z.object({
  metric: z.string().min(1),
  value: z.number(),
  op: z.enum(["<", "<=", ">", ">=", "=="]),
  threshold: z.number()
});

const QuerySchema = z.object({
  table: z.string().min(1).optional().default("evidences"),
  threshold: z.number().int().nonnegative()
});

export function SpecEditor({ kind, value, onChange }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation(["checks"]);
  const [tab, setTab] = React.useState<"form" | "json">("form");
  const [form, setForm] = React.useState<StaticSpec | QuerySpec>(() => {
    try {
      return JSON.parse(value);
    } catch {
      return kind === "static"
        ? { metric: "", value: 0, op: "<=", threshold: 0 }
        : { table: "evidences", threshold: 1 };
    }
  });

  // keep JSON ↔ form in sync
  React.useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      setForm(parsed);
    } catch {
      /* ignore invalid JSON */
    }
  }, [value, kind]);

  const updateField = (k: string, v: any) => {
    const next = { ...form, [k]: v };
    setForm(next);
    try {
      const schema = kind === "static" ? StaticSchema : QuerySchema;
      schema.parse(next); // validate
      onChange(JSON.stringify(next, null, 2));
    } catch (err) {
      toast({ 
        title: t("checks:form.errors.invalid_spec"), 
        variant: "destructive" 
      });
    }
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
      <TabsList>
        <TabsTrigger value="form">{t("checks:specEditor.form")}</TabsTrigger>
        <TabsTrigger value="json">{t("checks:specEditor.json")}</TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="pt-4 space-y-3">
        {kind === "static" ? (
          <>
            <div>
              <Label>{t("checks:specEditor.metric")}</Label>
              <Input
                value={(form as StaticSpec).metric}
                onChange={(e) => updateField("metric", e.target.value)}
                placeholder={t("checks:specEditor.metricPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("checks:specEditor.value")}</Label>
              <Input
                type="number"
                value={(form as StaticSpec).value}
                onChange={(e) => updateField("value", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>{t("checks:specEditor.operator")}</Label>
              <Select
                value={(form as StaticSpec).op}
                onValueChange={(v) => updateField("op", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["<", "<=", ">", ">=", "=="].map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("checks:specEditor.threshold")}</Label>
              <Input
                type="number"
                value={(form as StaticSpec).threshold}
                onChange={(e) => updateField("threshold", Number(e.target.value))}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>{t("checks:specEditor.table")}</Label>
              <Input
                value={(form as QuerySpec).table || ""}
                onChange={(e) => updateField("table", e.target.value)}
                placeholder="evidences"
              />
            </div>
            <div>
              <Label>{t("checks:specEditor.threshold")}</Label>
              <Input
                type="number"
                value={(form as QuerySpec).threshold}
                onChange={(e) => updateField("threshold", Number(e.target.value))}
              />
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="json" className="pt-4">
        <Textarea
          rows={10}
          className="font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </TabsContent>
    </Tabs>
  );
}
