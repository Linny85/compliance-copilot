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
import { useLocation } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// 🔍 DIAGNOSE: Global action tracker
if (typeof window !== 'undefined') {
  (window as any).__lastAction = '(init)';
}

// 🔍 DIAGNOSE: Handler wrapper for tracking
function wrap<T extends (...args: any[]) => any>(name: string, fn: T): T {
  return ((...args: any[]) => {
    if (typeof window !== 'undefined') {
      (window as any).__lastAction = name;
    }
    return fn(...args);
  }) as any as T;
}

export const sectorOptions = [
  { value: 'it', label: { de: 'IT / Software', en: 'IT / Software', sv: 'IT / mjukvara' } },
  { value: 'finance', label: { de: 'Finanzen', en: 'Finance', sv: 'Finans' } },
  { value: 'health', label: { de: 'Gesundheit', en: 'Healthcare', sv: 'Hälso- och sjukvård' } },
  { value: 'manufacturing', label: { de: 'Industrie', en: 'Manufacturing', sv: 'Tillverkning' } },
  { value: 'public', label: { de: 'Öffentlicher Sektor', en: 'Public Sector', sv: 'Offentlig sektor' } },
  { value: 'other', label: { de: 'Sonstiges', en: 'Other', sv: 'Annat' } },
] as const;

export const companySizeOptions = [
  { value: '1-10', label: { de: '1–10 Mitarbeiter', en: '1–10 employees', sv: '1–10 anställda' } },
  { value: '11-50', label: { de: '11–50 Mitarbeiter', en: '11–50 employees', sv: '11–50 anställda' } },
  { value: '51-200', label: { de: '51–200 Mitarbeiter', en: '51–200 employees', sv: '51–200 anställda' } },
  { value: '201-500', label: { de: '201–500 Mitarbeiter', en: '201–500 employees', sv: '201–500 anställda' } },
  { value: '501-1000', label: { de: '501–1000 Mitarbeiter', en: '501–1000 employees', sv: '501–1000 anställda' } },
  { value: '1000+', label: { de: 'über 1000', en: 'over 1000', sv: 'över 1000' } },
] as const;

const CompanyProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // 🔍 DIAGNOSE: Visible error banner state
  const [diag, setDiag] = useState<{msg: string; stack?: string; lastAction?: string} | null>(null);

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
    
    // Busy-guard to prevent double-submit
    if (loading) return;
    
    if (!validateStep2()) return;

    setLoading(true);
    setError(null);
    setDiag(null); // Clear previous diagnostics

    try {
      // 🔍 DIAGNOSE: Pre-fetch probe
      if (process.env.NODE_ENV !== 'production') {
        const probe = {
          companyName: typeof companyName,
          legalName: typeof legalName,
          street: typeof street,
          zip: typeof zip,
          city: typeof city,
          country: typeof country,
          sector: typeof sector,
          website: typeof website,
          vatId: typeof vatId,
          companySize: typeof companySize,
          masterCode: typeof masterCode,
          deleteCode: typeof deleteCode,
        };
        console.debug('[preFetchProbe]', probe);
      }

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

      // Handle error or existing company (idempotent success)
      if (error) {
        const status = (error as any)?.context?.response?.status ?? (error as any)?.status;
        
        // 409 or existed=true means company already exists → idempotent success
        if (status === 409 || (data as any)?.existed) {
          toast.success(t.onboarding?.companyExistsInfo || "Company already exists, proceeding to dashboard");
          await new Promise(resolve => setTimeout(resolve, 800));
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // Other errors: throw to be caught below
        throw error;
      }

      // Check if company already existed (idempotent success without error)
      if ((data as any)?.existed) {
        toast.success(t.onboarding?.companyExistsInfo || "Company already exists, proceeding to dashboard");
        await new Promise(resolve => setTimeout(resolve, 800));
        navigate('/dashboard', { replace: true });
        return;
      }

      // New company created successfully
      toast.success(t.onboarding?.companyCreated || t.common.success);
      
      // ⏳ 800ms delay to ensure claims, RLS policies, and subscription triggers are fully active
      await new Promise(resolve => setTimeout(resolve, 800));
      
      navigate('/dashboard', { replace: true });

    } catch (error: any) {
      console.error("[CompanyProfile] Exception:", error);
      const errorMsg = error?.message || error?.toString() || t.errors?.generic || "Failed to create company profile";
      
      setError(errorMsg);
      toast.error(errorMsg);
      
      // 🔍 DIAGNOSE: Capture error for banner
      const lastAction = (window as any).__lastAction;
      setDiag({
        msg: errorMsg,
        stack: error?.stack,
        lastAction
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = (e.currentTarget.value || '').trim();
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[company-profile] sector.change', v);
    }
    if (v) setSector(v);
  };

  const handleCompanySizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = (e.currentTarget.value || '').trim();
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[company-profile] companySize.change', v);
    }
    if (v) setCompanySize(v);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(e);
  };

  // 🔍 DIAGNOSE: Wrapped handlers for tracking
  const handleNextWrapped = wrap('handleNext', handleNext);
  const handleBackWrapped = wrap('handleBack', handleBack);
  const handleSubmitWrapped = wrap('handleSubmit', handleSubmit);
  const handleSectorChangeWrapped = wrap('handleSectorChange', handleSectorChange);
  const handleCompanySizeChangeWrapped = wrap('handleCompanySizeChange', handleCompanySizeChange);
  const handleFormSubmitWrapped = wrap('handleFormSubmit', handleFormSubmit);

  // 🔍 DIAGNOSE: Safe submit wrapper with error capture
  const safeHandleFormSubmit = async (e: React.FormEvent) => {
    try {
      await handleFormSubmitWrapped(e);
    } catch (err: any) {
      const msg = String(err?.message || err);
      const stack = String(err?.stack || '');
      const lastAction = (window as any).__lastAction;
      console.error('[CompanyProfile.submit.error]', { msg, stack, lastAction });
      setDiag({ msg, stack, lastAction });
      // Don't re-throw - keep diagnosis visible instead of showing error boundary
    }
  };

  // 🔍 DIAGNOSE: Global error listeners (dev only, once)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if (!(window as any).__cp_err_hooks) {
        (window as any).__cp_err_hooks = true;
        
        const errorHandler = (ev: ErrorEvent) => {
          console.error('[window.error]', ev.error || ev.message, {
            filename: ev.filename,
            lineno: ev.lineno,
            colno: ev.colno
          });
        };
        
        const rejectionHandler = (ev: PromiseRejectionEvent) => {
          console.error('[window.unhandledrejection]', ev.reason);
        };
        
        window.addEventListener('error', errorHandler);
        window.addEventListener('unhandledrejection', rejectionHandler);
        
        return () => {
          window.removeEventListener('error', errorHandler);
          window.removeEventListener('unhandledrejection', rejectionHandler);
        };
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      {/* 🔍 DIAGNOSE: Visible error banner */}
      {diag && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            margin: 12,
            padding: 12,
            borderRadius: 8,
            background: '#FEF3C7',
            color: '#92400E',
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          <strong>🔍 Diagnose:</strong> {diag.msg}
          {diag.lastAction && (
            <div style={{ marginTop: 6, fontWeight: 'bold' }}>
              Last action: {diag.lastAction}
            </div>
          )}
          {diag.stack && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: 'pointer' }}>Stack Trace</summary>
              <pre style={{ marginTop: 6, fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                {diag.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => setDiag(null)}
            style={{
              marginTop: 8,
              padding: '4px 8px',
              background: '#92400E',
              color: '#FEF3C7',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      
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
            onSubmit={safeHandleFormSubmit}
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
                    <select
                      id="sector"
                      name="sector"
                      autoComplete="off"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={sector ?? ''}
                      onChange={handleSectorChangeWrapped}
                      required
                    >
                      <option value="" disabled>— {t.onboarding.sector} —</option>
                      {sectorOptions.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label[language]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-size">{t.onboarding.companySize} *</Label>
                    <select
                      id="company-size"
                      name="company-size"
                      autoComplete="off"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={companySize ?? ''}
                      onChange={handleCompanySizeChangeWrapped}
                      required
                    >
                      <option value="" disabled>— {t.onboarding.companySize} —</option>
                      {companySizeOptions.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label[language]}
                        </option>
                      ))}
                    </select>
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

                <Button type="button" className="w-full" onClick={handleNextWrapped}>
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
                  <Button type="button" variant="outline" onClick={handleBackWrapped} className="flex-1">
                    {t.onboarding.back}
                  </Button>
                  <Button type="button" onClick={wrap('validateAndReview', () => validateStep2() && setStep(3))} className="flex-1">
                    {t.onboarding.review}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {error && (
                  <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
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
                  <Button type="button" variant="outline" onClick={handleBackWrapped} className="flex-1" disabled={loading}>
                    {t.onboarding.back}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>}
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
