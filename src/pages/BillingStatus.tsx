import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface BillingStatusProps {
  kind: "success" | "cancel";
}

export default function BillingStatus({ kind }: BillingStatusProps) {
  const { t, ready } = useTranslation(["billing", "common"]);
  
  if (!ready) return null;

  return (
    <div className="container mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold mb-2">
        {kind === "success" 
          ? t("billing:successTitle", "Abo aktiviert!") 
          : t("billing:cancelTitle", "Checkout abgebrochen")
        }
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {kind === "success" 
          ? t("billing:successText", "Danke! Dein Plan wurde aktualisiert.") 
          : t("billing:cancelText", "Du kannst den Kauf jederzeit erneut starten.")
        }
      </p>
      <Link 
        to="/billing" 
        className="inline-flex rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        {t("billing:backToBilling", "Zur Abrechnung")}
      </Link>
    </div>
  );
}
