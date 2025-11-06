import React from "react";
import { useI18n } from "@/contexts/I18nContext";

const langs: { code: "de" | "en" | "sv"; label: string }[] = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
  { code: "sv", label: "SV" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language Switcher">
      {langs.map((l) => {
        const active = language === l.code;
        return (
          <button
            key={l.code}
            data-testid={`lang-btn-${l.code}`}
            onClick={() => setLanguage(l.code)}
            className={[
              "px-2 py-1 rounded-md text-sm",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-muted"
            ].join(" ")}
            aria-pressed={active}
            title={l.label}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
