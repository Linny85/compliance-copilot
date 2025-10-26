import { isDemo, isTrial } from "@/config/appMode";
import { useI18n } from "@/contexts/I18nContext";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function AppModeBanner() {
  const { t } = useI18n();
  
  if (isDemo()) {
    return (
      <div className="w-full border-b border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-900/50 dark:bg-blue-950/30">
        <div className="container mx-auto flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Demo-Modus:</strong> Nur Ansicht, keine Speicherung.
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  if (isTrial()) {
    return (
      <div className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="container mx-auto flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Testversion aktiv:</strong> Alle Funktionen freigeschaltet.
            </span>
          </div>
          <Link
            to="/billing"
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
          >
            Upgrade
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
