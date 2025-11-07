import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, MapPin, Globe, Users, AlertCircle, ArrowLeft, Edit, Save, X, Loader2 } from "lucide-react";
import { MasterPasswordDialog } from "@/components/security/MasterPasswordDialog";
import { RotateMasterPasswordDialog } from "@/components/security/RotateMasterPasswordDialog";
import { SetMasterPasswordDialog } from "@/components/security/SetMasterPasswordDialog";
import { toast } from "sonner";

interface CompanyData {
  id: string;
  name: string;
  legal_name?: string;
  street: string;
  postal_code?: string;
  zip?: string;
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
  const [editing, setEditing] = useState(false);
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<CompanyData | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
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
        navigate('/company-profile?mode=create', { replace: true });
        return;
      }

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

  const notSpecified = t('organization:notSpecified');

  const handleEditClick = () => {
    setMasterDialogOpen(true);
  };

  const handleMasterSuccess = (token: string) => {
    setMasterDialogOpen(false);
    
    // Check if setup is required
    if (token === '__SETUP_REQUIRED__') {
      setSetupDialogOpen(true);
      return;
    }
    
    setEditToken(token);
    setEditForm(company);
    setEditing(true);
  };

  const handleSetupSuccess = () => {
    setSetupDialogOpen(false);
    toast.success(t('organization:master.setupComplete', 'Master password set successfully. You can now edit organization details.'));
    // Reopen master dialog to verify new password
    setTimeout(() => setMasterDialogOpen(true), 500);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditForm(null);
    setEditToken(null);
  };

  const handleRotateSuccess = () => {
    if (editing) {
      toast.info("Bearbeitungssitzung wurde beendet");
      setEditing(false);
      setEditToken(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editToken) return;

    try {
      setSaving(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('update-organization', {
        body: editForm,
        headers: {
          'X-Org-Edit': editToken,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error === 'stale_token') {
          toast.error("Sitzung abgelaufen (Passwort wurde geändert). Bitte erneut verifizieren.");
          setEditing(false);
          setEditToken(null);
          return;
        }
        toast.error(`Fehler beim Speichern: ${data.error}`);
        return;
      }

      setCompany(editForm);
      setEditing(false);
      setEditForm(null);
      setEditToken(null);
      toast.success(t('organization:saveSuccess', 'Organization details updated successfully'));
      await loadCompanyData();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(t('organization:saveError', 'Failed to update organization details'));
    } finally {
      setSaving(false);
    }
  };

  const updateEditField = (field: keyof CompanyData, value: string) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const currentData = editing ? editForm : company;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!currentData) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('organization:title')}</h1>
            <p className="text-muted-foreground">{t('organization:subtitle')}</p>
          </div>
          {!editing && !loading && company && (
            <div className="flex gap-2">
              <Button onClick={handleEditClick} variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                {t('organization:actions.edit')}
              </Button>
              <Button onClick={() => setRotateDialogOpen(true)} variant="outline">
                Master-Passwort ändern
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Address Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('organization:fields.address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label htmlFor="street">{t('organization:fields.street')}</Label>
                    <Input
                      id="street"
                      value={currentData.street || ''}
                      onChange={(e) => updateEditField('street', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zip">{t('organization:fields.postalCode')}</Label>
                      <Input
                        id="zip"
                        value={currentData.zip || ''}
                        onChange={(e) => updateEditField('zip', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">{t('organization:fields.city')}</Label>
                      <Input
                        id="city"
                        value={currentData.city || ''}
                        onChange={(e) => updateEditField('city', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">{t('organization:fields.country')}</Label>
                    <Input
                      id="country"
                      value={currentData.country || ''}
                      onChange={(e) => updateEditField('country', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.street')}</p>
                    <p className="text-base">{currentData.street || notSpecified}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.postalCode')}</p>
                      <p className="text-base">{currentData.zip || currentData.postal_code || notSpecified}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.city')}</p>
                      <p className="text-base">{currentData.city || notSpecified}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.country')}</p>
                    <p className="text-base">{currentData.country || notSpecified}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Business Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label htmlFor="website">{t('organization:fields.website')}</Label>
                    <Input
                      id="website"
                      type="url"
                      value={currentData.website || ''}
                      onChange={(e) => updateEditField('website', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vatId">{t('organization:fields.vatId')}</Label>
                    <Input
                      id="vatId"
                      value={currentData.vat_id || ''}
                      onChange={(e) => updateEditField('vat_id', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.sector')}</p>
                    <p className="text-base">{getSectorLabel(currentData.sector)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.companySize')}</p>
                    <p className="text-base">{getCompanySizeLabel(currentData.company_size)}</p>
                  </div>
                  {currentData.website && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.website')}</p>
                      <a
                        href={currentData.website.startsWith('http') ? currentData.website : `https://${currentData.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-4 w-4" />
                        {currentData.website}
                      </a>
                    </div>
                  )}
                  {currentData.vat_id && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('organization:fields.vatId')}</p>
                      <p className="text-base">{currentData.vat_id}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            {editing ? (
              <>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common:saving', 'Saving...')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('organization:actions.save', 'Save Changes')}
                    </>
                  )}
                </Button>
                <Button onClick={handleCancelEdit} variant="outline" disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  {t('common:cancel', 'Cancel')}
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('organization:actions.back')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <MasterPasswordDialog 
        open={masterDialogOpen}
        onClose={() => setMasterDialogOpen(false)}
        onSuccess={handleMasterSuccess}
      />

      <SetMasterPasswordDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onSuccess={handleSetupSuccess}
      />

      <RotateMasterPasswordDialog
        open={rotateDialogOpen}
        onClose={() => setRotateDialogOpen(false)}
        onSuccess={handleRotateSuccess}
      />
    </div>
  );
}
