import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calcOverallWithTraining } from "@/lib/compliance/overallWithTraining";
import { Settings2, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function TrainingInfluenceSettings({ companyId }: { companyId: string }) {
  const { t } = useTranslation(["admin"]);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [mode, setMode] = useState<"weighted" | "strict">("weighted");
  const [weight, setWeight] = useState(20); // 0-100 for UI

  // Load current settings
  const { data: settings } = useQuery({
    queryKey: ["tenant-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_settings")
        .select("overall_training_mode, overall_training_weight")
        .eq("tenant_id", companyId)
        .maybeSingle();
      return data;
    }
  });

  // Load framework scores for preview
  const { data: frameworkData } = useQuery({
    queryKey: ["framework-progress", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("v_framework_progress")
        .select("framework, percentage")
        .eq("tenant_id", companyId);
      return data;
    }
  });

  useEffect(() => {
    if (settings) {
      setMode((settings.overall_training_mode as any) ?? "weighted");
      setWeight(Math.round(((settings.overall_training_weight as any) ?? 0.2) * 100));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tenant_settings")
      .upsert({
        tenant_id: companyId,
        overall_training_mode: mode,
        overall_training_weight: weight / 100
      });

    if (error) {
      toast.error(t("admin:settings.saveError"));
    } else {
      toast.success(t("admin:settings.saveSuccess"));
    }
    setSaving(false);
  };

  // Extract framework scores - mock for now
  const frameworkScores = {
    nis2: 82,
    aiAct: 67,
    gdpr: 58
  };

  // For simplicity, assume training = 100 (best case) to show impact of settings
  // In production, fetch actual training percentages
  const trainingScores = { nis2: 100, aiAct: 100, gdpr: 100 };

  // Calculate preview scores
  const currentOverall = calcOverallWithTraining({
    nis2: frameworkScores.nis2,
    aiAct: frameworkScores.aiAct,
    gdpr: frameworkScores.gdpr,
    trNis2: trainingScores.nis2,
    trAiAct: trainingScores.aiAct,
    trGdpr: trainingScores.gdpr,
    mode,
    weight: weight / 100
  });

  const withoutTraining = calcOverallWithTraining({
    nis2: frameworkScores.nis2,
    aiAct: frameworkScores.aiAct,
    gdpr: frameworkScores.gdpr,
    trNis2: null,
    trAiAct: null,
    trGdpr: null,
    mode: "weighted",
    weight: 0
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("admin:settings.trainingInfluence.title")}
          </CardTitle>
          <CardDescription>
            {t("admin:settings.trainingInfluence.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="mode-switch">
                {t("admin:settings.trainingInfluence.mode.label")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {mode === "weighted" 
                  ? t("admin:settings.trainingInfluence.mode.weightedDesc")
                  : t("admin:settings.trainingInfluence.mode.strictDesc")}
              </p>
            </div>
            <Switch
              id="mode-switch"
              checked={mode === "strict"}
              onCheckedChange={(checked) => setMode(checked ? "strict" : "weighted")}
            />
          </div>

          {/* Weight Slider (only for weighted mode) */}
          {mode === "weighted" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="weight-slider">
                  {t("admin:settings.trainingInfluence.weight.label")}
                </Label>
                <span className="text-sm font-medium">{weight}%</span>
              </div>
              <Slider
                id="weight-slider"
                value={[weight]}
                onValueChange={([v]) => setWeight(v)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t("admin:settings.trainingInfluence.weight.hint", { 
                  framework: 100 - weight,
                  training: weight
                })}
              </p>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? t("admin:settings.saving") : t("admin:settings.save")}
          </Button>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("admin:settings.trainingInfluence.preview.title")}
          </CardTitle>
          <CardDescription>
            {t("admin:settings.trainingInfluence.preview.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Without Training */}
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {t("admin:settings.trainingInfluence.preview.withoutTraining")}
              </p>
              <p className="text-3xl font-bold">
                {withoutTraining !== null ? `${withoutTraining}%` : "—"}
              </p>
            </div>

            {/* With Training */}
            <div className="p-4 border rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground mb-2">
                {t("admin:settings.trainingInfluence.preview.withTraining")}
              </p>
              <p className="text-3xl font-bold text-primary">
                {currentOverall !== null ? `${currentOverall}%` : "—"}
              </p>
              {currentOverall !== null && withoutTraining !== null && (
                <p className={`text-sm mt-1 ${currentOverall > withoutTraining ? "text-green-600" : currentOverall < withoutTraining ? "text-red-600" : "text-muted-foreground"}`}>
                  {currentOverall > withoutTraining && `+${currentOverall - withoutTraining}%`}
                  {currentOverall < withoutTraining && `${currentOverall - withoutTraining}%`}
                  {currentOverall === withoutTraining && t("admin:settings.trainingInfluence.preview.noChange")}
                </p>
              )}
            </div>
          </div>

          {/* Framework Details */}
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm font-medium">{t("admin:settings.trainingInfluence.preview.frameworkDetails")}</p>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIS2:</span>
                <span>{frameworkScores.nis2 ?? "—"}% → 100%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Act:</span>
                <span>{frameworkScores.aiAct ?? "—"}% → 100%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GDPR:</span>
                <span>{frameworkScores.gdpr ?? "—"}% → 100%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic mt-2">
              Training coverage assumed at 100% for preview purposes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
