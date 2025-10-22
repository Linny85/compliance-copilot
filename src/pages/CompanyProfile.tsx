import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Lock, CheckCircle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const CompanyProfile = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Development diagnostics
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[company-profile] diagnostics:', {
        route: '/company-profile',
        formSecured: true,
        errorBoundary: true,
        autofillScoped: true
      });
    }
  }, []);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [vatId, setVatId] = useState("");
  const [companySize, setCompanySize] = useState("");

  // Step 2: Security Codes
  const [masterCode, setMasterCode] = useState("");
  const [masterCodeConfirm, setMasterCodeConfirm] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteCodeConfirm, setDeleteCodeConfirm] = useState("");

  const validateStep1 = () => {
    if (!companyName || !street || !zip || !city || !country || !sector || !companySize) {
      toast.error(t.validation.required);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!masterCode || !masterCodeConfirm || !deleteCode || !deleteCodeConfirm) {
      toast.error(t.validation.required);
      return false;
    }
    if (masterCode !== masterCodeConfirm) {
      toast.error(t.validation.masterCodeMismatch);
      return false;
    }
    if (deleteCode !== deleteCodeConfirm) {
      toast.error(t.validation.deleteCodeMismatch);
      return false;
    }
    if (masterCode.length < 8 || deleteCode.length < 8) {
      toast.error(t.validation.codeLength);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!validateStep2()) return;

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[company-profile] submit:start');
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-tenant', {
        body: {
          company: {
            name: companyName,
            legalName: legalName || undefined,
            street,
            zip,
            city,
            country,
            sector,
            website: website || undefined,
            vatId: vatId || undefined,
            companySize,
          },
          masterCode,
          deleteCode,
        },
      });

      if (error) throw error;

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[company-profile] submit:success');
      }

      toast.success("Company profile created successfully!");
      
      // Refresh user info and navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
        window.location.reload(); // Force refresh to update auth state
      }, 500);

    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to create company profile");
      
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[company-profile] submit:error', error);
      }
    } finally {
      setLoading(false);
      
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[company-profile] submit:end');
      }
    }
  };

  const handleSectorChange = (value: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[company-profile] sector.change', value);
    }
    setSector(value);
  };

  const handleCompanySizeChange = (value: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[company-profile] companySize.change', value);
    }
    setCompanySize(value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-3xl shadow-glow">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {step === 1 && <Building2 className="h-12 w-12 text-primary" />}
            {step === 2 && <Lock className="h-12 w-12 text-primary" />}
            {step === 3 && <CheckCircle className="h-12 w-12 text-primary" />}
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && t.onboarding.title}
            {step === 2 && t.onboarding.securityCodes}
            {step === 3 && t.onboarding.reviewTitle}
          </CardTitle>
          <CardDescription>
            {step === 1 && t.onboarding.subtitle}
            {step === 2 && t.onboarding.securitySubtitle}
            {step === 3 && t.onboarding.reviewSubtitle}
          </CardDescription>
          <div className="flex justify-center gap-2 mt-4">
            <div className={`h-2 w-16 rounded ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>

        <CardContent>
          <form
            action={undefined}
            method="post"
            noValidate
            autoComplete="off"
            onSubmit={handleFormSubmit}
          >
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">{t.onboarding.companyName} *</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Acme Corporation"
                    autoComplete="organization"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal-name">{t.onboarding.legalName}</Label>
                  <Input
                    id="legal-name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Acme Corporation GmbH"
                    autoComplete="organization"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">{t.onboarding.street} *</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="123 Main Street"
                    autoComplete="section-company address-line1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">{t.onboarding.zip} *</Label>
                    <Input
                      id="zip"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="10115"
                      autoComplete="section-company postal-code"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">{t.onboarding.city} *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="Berlin"
                      autoComplete="section-company address-level2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">{t.onboarding.country} *</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Germany"
                    autoComplete="section-company country-name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector">{t.onboarding.sector} *</Label>
                    <Select value={sector} onValueChange={handleSectorChange} required>
                      <SelectTrigger id="sector">
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">{t.sectors.technology}</SelectItem>
                        <SelectItem value="finance">{t.sectors.finance}</SelectItem>
                        <SelectItem value="healthcare">{t.sectors.healthcare}</SelectItem>
                        <SelectItem value="energy">{t.sectors.energy}</SelectItem>
                        <SelectItem value="transport">{t.sectors.transport}</SelectItem>
                        <SelectItem value="other">{t.sectors.other}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-size">{t.onboarding.companySize} *</Label>
                    <Select value={companySize} onValueChange={handleCompanySizeChange} required>
                      <SelectTrigger id="company-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">{t.companySize["1-10"]}</SelectItem>
                        <SelectItem value="11-50">{t.companySize["11-50"]}</SelectItem>
                        <SelectItem value="51-200">{t.companySize["51-200"]}</SelectItem>
                        <SelectItem value="201-500">{t.companySize["201-500"]}</SelectItem>
                        <SelectItem value="501+">{t.companySize["501+"]}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">{t.onboarding.website}</Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="https://acme.com"
                    autoComplete="section-company url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat-id">{t.onboarding.vatId}</Label>
                  <Input
                    id="vat-id"
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="DE123456789"
                    autoComplete="section-company tax-id"
                  />
                </div>

                <Button type="button" className="w-full" onClick={handleNext}>
                  {t.onboarding.next}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">{t.onboarding.securityNote}</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>{t.onboarding.masterCode}:</strong> {t.onboarding.masterCodeDesc}</li>
                    <li><strong>{t.onboarding.deleteCode}:</strong> {t.onboarding.deleteCodeDesc}</li>
                    <li>{t.onboarding.securityWarning}</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="master-code">{t.onboarding.masterCode} *</Label>
                  <Input
                    id="master-code"
                    type="password"
                    value={masterCode}
                    onChange={(e) => setMasterCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Enter master code (min 8 characters)"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="master-code-confirm">{t.onboarding.masterCodeConfirm} *</Label>
                  <Input
                    id="master-code-confirm"
                    type="password"
                    value={masterCodeConfirm}
                    onChange={(e) => setMasterCodeConfirm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Re-enter master code"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-code">{t.onboarding.deleteCode} *</Label>
                  <Input
                    id="delete-code"
                    type="password"
                    value={deleteCode}
                    onChange={(e) => setDeleteCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Enter delete code (min 8 characters)"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-code-confirm">{t.onboarding.deleteCodeConfirm} *</Label>
                  <Input
                    id="delete-code-confirm"
                    type="password"
                    value={deleteCodeConfirm}
                    onChange={(e) => setDeleteCodeConfirm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Re-enter delete code"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                    {t.onboarding.back}
                  </Button>
                  <Button type="button" onClick={() => validateStep2() && setStep(3)} className="flex-1">
                    {t.onboarding.review}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">{t.onboarding.title}</h3>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
                      <p><strong>{t.onboarding.companyName}:</strong> {companyName}</p>
                      {legalName && <p><strong>{t.onboarding.legalName}:</strong> {legalName}</p>}
                      <p><strong>{t.onboarding.street}:</strong> {street}, {zip} {city}, {country}</p>
                      <p><strong>{t.onboarding.sector}:</strong> {t.sectors[sector as keyof typeof t.sectors]}</p>
                      <p><strong>{t.onboarding.companySize}:</strong> {t.companySize[companySize as keyof typeof t.companySize]}</p>
                      {website && <p><strong>{t.onboarding.website}:</strong> {website}</p>}
                      {vatId && <p><strong>{t.onboarding.vatId}:</strong> {vatId}</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">{t.onboarding.securityCodes}</h3>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
                      <p>✓ {t.onboarding.masterCode} configured</p>
                      <p>✓ {t.onboarding.deleteCode} configured</p>
                      <p className="text-muted-foreground text-xs mt-2">
                        Codes are securely hashed and stored
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1" disabled={loading}>
                    {t.onboarding.back}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? t.onboarding.submitting : t.onboarding.submit}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyProfile;
