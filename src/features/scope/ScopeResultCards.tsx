import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface ScopeResultCardsProps {
  analysis: any;
}

export function ScopeResultCards({ analysis }: ScopeResultCardsProps) {
  const { t } = useTranslation("scope");
  const res = analysis?.result ?? analysis ?? {};

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{t("cards.ti.title", "Telematikinfrastruktur")}</CardTitle>
        </CardHeader>
        <CardContent>
          {res.ti_status === "in_scope" ? (
            <ul className="list-disc pl-5 space-y-1">
              <li>ECC-Umstellung bis 2026</li>
              <li>TI-Betriebsrichtlinien & KIM</li>
              <li>gematik/BSI Sicherheitskontrollen</li>
            </ul>
          ) : (
            <p className="text-muted-foreground">Keine TI-Anbindung angegeben.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("cards.nis2.title", "NIS2 Einstufung")}</CardTitle>
        </CardHeader>
        <CardContent>
          {res.nis2_status === "in_scope" && (
            <p>In Scope (wichtige/wesentliche Einrichtung). ISMS, Incident-Reporting, Backups, Awareness.</p>
          )}
          {res.nis2_status === "watch_designation" && (
            <p>Unter Schwelle – Monitoring/Designierung prüfen. TI-Pflichten gelten separat.</p>
          )}
          {!res.nis2_status && (
            <p className="text-muted-foreground">Keine Relevanz festgestellt.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("cards.ai.title", "EU AI Act – Schulung")}</CardTitle>
        </CardHeader>
        <CardContent>
          {res.ai_act_training === "required" ? (
            <p>Art. 4: KI-Kompetenz/Training erforderlich. Rollentrainings nachweisen (Deployer/Provider).</p>
          ) : (
            <p className="text-muted-foreground">Kein arbeitsbezogener KI-Einsatz angegeben.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
