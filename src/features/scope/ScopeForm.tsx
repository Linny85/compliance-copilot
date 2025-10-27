import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scopeSchema, ScopeInput } from "./schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ScopeFormProps {
  tenantId: string;
  onAnalyzed: (analysis: any) => void;
}

export function ScopeForm({ tenantId, onAnalyzed }: ScopeFormProps) {
  const { t } = useTranslation("scope");
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<ScopeInput>({
    resolver: zodResolver(scopeSchema),
    defaultValues: {
      sector: "pharmacy",
      is_ti_connected: true,
      employees: 0,
      turnover: 0,
      balance: 0,
      uses_ai_for_work: true,
      ai_role: "deployer"
    }
  });

  const onSubmit = async (values: ScopeInput) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyzeTenant", {
        body: { tenant_id: tenantId, input: values }
      });

      if (error) throw error;

      toast.success(t("form.success", "Analyse erfolgreich durchgeführt"));
      onAnalyzed(data.analysis ?? data);
    } catch (error: any) {
      console.error("Scope analysis error:", error);
      toast.error(t("form.error", "Fehler bei der Analyse"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="sector">{t("form.sector", "Sektor")}</Label>
        <Select
          value={form.watch("sector")}
          onValueChange={(value) => form.setValue("sector", value as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="health">Gesundheit (allg.)</SelectItem>
            <SelectItem value="pharmacy">Apotheke</SelectItem>
            <SelectItem value="dentistry">Zahnarztpraxis</SelectItem>
            <SelectItem value="lab">Labor</SelectItem>
            <SelectItem value="hospital">Krankenhaus/Klinik</SelectItem>
            <SelectItem value="ehealth_it">E-Health IT/Software</SelectItem>
            <SelectItem value="other">Sonstiges</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_ti_connected"
          checked={form.watch("is_ti_connected")}
          onCheckedChange={(checked) => form.setValue("is_ti_connected", !!checked)}
        />
        <Label htmlFor="is_ti_connected" className="font-normal">
          {t("form.is_ti_connected", "An TI (Telematikinfrastruktur) angeschlossen")}
        </Label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="employees">{t("form.employees", "Mitarbeiterzahl")}</Label>
          <Input
            id="employees"
            type="number"
            min="0"
            {...form.register("employees", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="turnover">{t("form.turnover", "Umsatz (EUR)")}</Label>
          <Input
            id="turnover"
            type="number"
            min="0"
            {...form.register("turnover", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="balance">{t("form.balance", "Bilanzsumme (EUR)")}</Label>
          <Input
            id="balance"
            type="number"
            min="0"
            {...form.register("balance", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="uses_ai_for_work"
          checked={form.watch("uses_ai_for_work")}
          onCheckedChange={(checked) => form.setValue("uses_ai_for_work", !!checked)}
        />
        <Label htmlFor="uses_ai_for_work" className="font-normal">
          {t("form.uses_ai_for_work", "Mitarbeitende nutzen KI-Funktionen")}
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai_role">{t("form.ai_role", "KI-Rolle")}</Label>
        <Select
          value={form.watch("ai_role")}
          onValueChange={(value) => form.setValue("ai_role", value as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Keine KI-Entwicklung</SelectItem>
            <SelectItem value="deployer">Wir nutzen/konfigurieren KI (Verwender)</SelectItem>
            <SelectItem value="provider">Wir entwickeln/ändern KI (Anbieter)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Analysiere..." : t("form.submit", "Analyse durchführen")}
      </Button>
    </form>
  );
}
