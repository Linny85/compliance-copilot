import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Briefcase, FileText, Globe, Hash, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyData {
  id: string;
  name: string;
  legal_name?: string;
  street: string;
  postal_code?: string; // DB has postal_code
  zip?: string; // DB might have zip
  city: string;
  country?: string;
  sector?: string;
  website?: string;
  vat_id?: string;
  company_size?: string;
}

export default function OrganizationView() {
  const navigate = useNavigate();
  const { t } = useTranslation(['organization', 'common']);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      // Get current user's profile to find company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth', { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        // No company yet → redirect to create
        navigate('/company-profile?mode=create', { replace: true });
        return;
      }

      // Load company data
      const { data: companyData, error: companyError } = await supabase
        .from('Unternehmen')
        .select('*')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (companyError) throw companyError;
      
      if (!companyData) {
        navigate('/company-profile?mode=create', { replace: true });
        return;
      }

      setCompany(companyData);
    } catch (err: any) {
      console.error('Error loading company:', err);
      setError(err.message || 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const getSectorLabel = (sectorValue?: string) => {
    if (!sectorValue) return t('organization:notSpecified');
    const normalized = sectorValue.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    return t(`organization:sectors.${normalized}`, sectorValue);
  };

  const getCompanySizeLabel = (size?: string) => {
    if (!size) return t('organization:notSpecified');
    const normalized = size.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    return t(`organization:companySize.${normalized}`, size);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('organization:title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('organization:subtitle')}
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {company.name}
          </CardTitle>
          {company.legal_name && (
            <CardDescription className="text-base">
              {t('organization:fields.legalName')}: {company.legal_name}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Address */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('organization:fields.address')}
            </h3>
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div>{company.street}</div>
                <div>{company.postal_code || company.zip} {company.city}</div>
                {company.country && <div className="mt-1 text-muted-foreground">{company.country}</div>}
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t('organization:fields.sector')}
                </span>
              </div>
              <div className="font-medium">{getSectorLabel(company.sector)}</div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t('organization:fields.companySize')}
                </span>
              </div>
              <div className="font-medium">{getCompanySizeLabel(company.company_size)}</div>
            </div>

            {company.website && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('organization:fields.website')}
                  </span>
                </div>
                <a 
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}

            {company.vat_id && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('organization:fields.vatId')}
                  </span>
                </div>
                <div className="font-medium font-mono">{company.vat_id}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => navigate('/company-profile?mode=edit')}>
              {t('organization:actions.edit')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              {t('organization:actions.back')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
