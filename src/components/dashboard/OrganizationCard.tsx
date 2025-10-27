import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OrganizationCardProps {
  companyName: string;
  country: string;
  sector: string;
}

export function OrganizationCard({ companyName, country, sector }: OrganizationCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'dashboard']);

  const getSectorLabel = (sectorValue: string) => {
    // Normalize: lowercase, replace spaces with underscores, remove special chars
    const normalized = (sectorValue ?? 'other')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    
    // Use t() with fallback to original value if translation key doesn't exist
    return t(`sectors.${normalized}`, { defaultValue: sectorValue });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('dashboard:organization')}</CardTitle>
        <CardDescription>{t('dashboard:organizationDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">{t('dashboard:companyName')}</div>
              <div className="font-medium">{companyName}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">{t('dashboard:country')}</div>
              <div className="font-medium">{country}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">{t('dashboard:sector')}</div>
              <div className="font-medium">{getSectorLabel(sector)}</div>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/company-profile")}
        >
          {t('dashboard:editOrganization')}
        </Button>
      </CardContent>
    </Card>
  );
}
