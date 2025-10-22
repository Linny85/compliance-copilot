import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Briefcase } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface OrganizationCardProps {
  companyName: string;
  country: string;
  sector: string;
}

const sectorLabels: Record<string, { en: string; de: string }> = {
  it: { en: "IT / Software", de: "IT / Software" },
  finance: { en: "Finance", de: "Finanzen" },
  health: { en: "Healthcare", de: "Gesundheit" },
  manufacturing: { en: "Manufacturing", de: "Industrie" },
  public: { en: "Public Sector", de: "Öffentlicher Sektor" },
  other: { en: "Other", de: "Sonstiges" },
};

export function OrganizationCard({ companyName, country, sector }: OrganizationCardProps) {
  const navigate = useNavigate();
  const { t, language } = useI18n();

  const getSectorLabel = (sectorValue: string) => {
    const normalized = sectorValue?.toLowerCase() || "other";
    return sectorLabels[normalized]?.[language] || sectorValue;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t.dashboard.organization}</CardTitle>
        <CardDescription>{t.dashboard.organizationDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">{t.dashboard.companyName}</div>
              <div className="font-medium">{companyName}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">{t.dashboard.country}</div>
              <div className="font-medium">{country}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">{t.dashboard.sector}</div>
              <div className="font-medium">{getSectorLabel(sector)}</div>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/company-profile")}
        >
          {t.dashboard.editOrganization}
        </Button>
      </CardContent>
    </Card>
  );
}
