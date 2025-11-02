import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  impact: string | null;
  status: string;
  created_at: string;
}

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { t, ready } = useTranslation("norrly", { useSuspense: false });
  const [data, setData] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("[incident-detail] fetch error:", error);
        } else {
          setData(data);
        }
        setLoading(false);
      });
  }, [id]);

  if (!ready || loading) return <div className="p-6">…</div>;
  if (!id || !data) return <div className="p-6">Incident nicht gefunden</div>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold mb-4">
        {t("incident.detail_title", { defaultValue: "Incident" })} #{id.slice(0, 8)}
      </h1>
      <div className="space-y-3 bg-card p-4 rounded-lg border">
        <div>
          <strong className="text-sm text-muted-foreground">
            {t("incident.title", { defaultValue: "Titel" })}:
          </strong>
          <div>{data.title}</div>
        </div>
        <div>
          <strong className="text-sm text-muted-foreground">
            {t("incident.description", { defaultValue: "Beschreibung" })}:
          </strong>
          <div>{data.description || "—"}</div>
        </div>
        <div>
          <strong className="text-sm text-muted-foreground">
            {t("incident.impact", { defaultValue: "Auswirkung" })}:
          </strong>
          <div>{data.impact || "—"}</div>
        </div>
        <div>
          <strong className="text-sm text-muted-foreground">Status:</strong>
          <div className="inline-block px-2 py-1 bg-primary/10 text-primary rounded text-sm ml-2">
            {data.status}
          </div>
        </div>
      </div>
    </div>
  );
}
