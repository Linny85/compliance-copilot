import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

export default function NewIncidentPage() {
  const { t } = useTranslation("norrly");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [impact, setImpact] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement create-incident (Supabase/EdgeFunction)
    alert("Incident placeholder submitted.");
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold mb-4">{t("incident.report")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">{t("incident.title")}</label>
          <Input value={title} onChange={e=>setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">{t("incident.description")}</label>
          <Textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={5} required />
        </div>
        <div>
          <label className="block text-sm mb-1">{t("incident.impact")}</label>
          <Input value={impact} onChange={e=>setImpact(e.target.value)} />
        </div>
        <div className="pt-2">
          <Button type="submit">{t("incident.submit")}</Button>
        </div>
      </form>
    </div>
  );
}
