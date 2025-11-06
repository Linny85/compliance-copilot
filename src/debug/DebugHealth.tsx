import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useFeatures } from "@/contexts/FeatureFlagContext";

export default function DebugHealth() {
  const { i18n, language, ready } = useI18n();
  const isAdmin = useIsAdmin();
  const { hasFeature } = useFeatures();

  const payload = {
    ok: true,
    i18n: {
      language,
      i18nextLanguage: i18n.language,
      ready,
      namespaces: i18n.options?.ns || "n/a",
    },
    flags: {
      isAdmin,
      features: [
        "evidence",
        "checks",
        "reports",
        "trainingCertificates",
        "integrations",
      ].reduce((acc, k) => ({ ...acc, [k]: hasFeature(k as any) }), {}),
    },
    build: {
      ts: new Date().toISOString(),
      tracer: (window as any).__I18N_FETCH_TRACER__ === true,
    },
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Health Probe (DEV only)</h1>
      <pre data-testid="debug-health-json" className="bg-muted p-4 rounded-lg overflow-auto text-sm">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
