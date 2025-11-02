import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

export default function NewIncidentPage() {
  const { t, ready } = useTranslation("norrly", { useSuspense: false });
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [impact, setImpact] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        alert(t("errors.unauthorized", { defaultValue: "Nicht angemeldet." }));
        return;
      }

      const res = await supabase.functions.invoke("create-incident", {
        body: { title, description: desc, impact }
      });

      if (res.error) {
        throw new Error(res.error.message || "unknown");
      }

      // Success → redirect to detail page
      window.location.assign(`/incident/${res.data.id}`);
    } catch (err) {
      console.error("[incident] create failed", err);
      alert(t("errors.nav_failed", { defaultValue: "Aktion fehlgeschlagen." }));
    }
  };

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold mb-4">
        {t("incident.report", { defaultValue: "Sicherheitsvorfall melden" })}
      </h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">
            {t("incident.title", { defaultValue: "Titel" })}
          </label>
          <Input value={title} onChange={e=>setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">
            {t("incident.description", { defaultValue: "Beschreibung" })}
          </label>
          <Textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={5} required />
        </div>
        <div>
          <label className="block text-sm mb-1">
            {t("incident.impact", { defaultValue: "Auswirkung" })}
          </label>
          <Input value={impact} onChange={e=>setImpact(e.target.value)} />
        </div>
        <div className="pt-2">
          <Button type="submit">
            {t("incident.submit", { defaultValue: "Absenden" })}
          </Button>
        </div>
      </form>
    </div>
  );
}
