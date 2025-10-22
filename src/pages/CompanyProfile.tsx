import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Lock, CheckCircle } from "lucide-react";

const CompanyProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

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
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!masterCode || !masterCodeConfirm || !deleteCode || !deleteCodeConfirm) {
      toast.error("Please fill in all code fields");
      return false;
    }
    if (masterCode !== masterCodeConfirm) {
      toast.error("Master codes don't match");
      return false;
    }
    if (deleteCode !== deleteCodeConfirm) {
      toast.error("Delete codes don't match");
      return false;
    }
    if (masterCode.length < 8 || deleteCode.length < 8) {
      toast.error("Codes must be at least 8 characters long");
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

  const handleSubmit = async () => {
    if (!validateStep2()) return;

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

      toast.success("Company profile created successfully!");
      
      // Refresh user info and navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
        window.location.reload(); // Force refresh to update auth state
      }, 500);

    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to create company profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-3xl shadow-glow">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {step === 1 && <Building2 className="h-12 w-12 text-primary" />}
            {step === 2 && <Lock className="h-12 w-12 text-primary" />}
            {step === 3 && <CheckCircle className="h-12 w-12 text-primary" />}
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "Company Information"}
            {step === 2 && "Security Codes"}
            {step === 3 && "Review & Submit"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Tell us about your company"}
            {step === 2 && "Set up secure access codes for company management"}
            {step === 3 && "Review your information before submitting"}
          </CardDescription>
          <div className="flex justify-center gap-2 mt-4">
            <div className={`h-2 w-16 rounded ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-name">Legal Name (Optional)</Label>
                <Input
                  id="legal-name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Acme Corporation GmbH"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="10115"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Berlin"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Germany"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector *</Label>
                  <Select value={sector} onValueChange={setSector} required>
                    <SelectTrigger id="sector">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-size">Company Size *</Label>
                  <Select value={companySize} onValueChange={setCompanySize} required>
                    <SelectTrigger id="company-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501+">501+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://acme.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat-id">VAT ID (Optional)</Label>
                <Input
                  id="vat-id"
                  value={vatId}
                  onChange={(e) => setVatId(e.target.value)}
                  placeholder="DE123456789"
                />
              </div>

              <Button type="button" className="w-full" onClick={handleNext}>
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Why are security codes important?</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Master Code:</strong> Used to invite/remove users and manage company settings</li>
                  <li><strong>Delete Code:</strong> Emergency code for complete company data reset</li>
                  <li>Keep these codes secure - they grant full access to your company data</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="master-code">Master Code *</Label>
                <Input
                  id="master-code"
                  type="password"
                  value={masterCode}
                  onChange={(e) => setMasterCode(e.target.value)}
                  placeholder="Enter master code (min 8 characters)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="master-code-confirm">Confirm Master Code *</Label>
                <Input
                  id="master-code-confirm"
                  type="password"
                  value={masterCodeConfirm}
                  onChange={(e) => setMasterCodeConfirm(e.target.value)}
                  placeholder="Re-enter master code"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-code">Delete Code *</Label>
                <Input
                  id="delete-code"
                  type="password"
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value)}
                  placeholder="Enter delete code (min 8 characters)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-code-confirm">Confirm Delete Code *</Label>
                <Input
                  id="delete-code-confirm"
                  type="password"
                  value={deleteCodeConfirm}
                  onChange={(e) => setDeleteCodeConfirm(e.target.value)}
                  placeholder="Re-enter delete code"
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button type="button" onClick={() => validateStep2() && setStep(3)} className="flex-1">
                  Review
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Company Information</h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
                    <p><strong>Name:</strong> {companyName}</p>
                    {legalName && <p><strong>Legal Name:</strong> {legalName}</p>}
                    <p><strong>Address:</strong> {street}, {zip} {city}, {country}</p>
                    <p><strong>Sector:</strong> {sector}</p>
                    <p><strong>Company Size:</strong> {companySize}</p>
                    {website && <p><strong>Website:</strong> {website}</p>}
                    {vatId && <p><strong>VAT ID:</strong> {vatId}</p>}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Security</h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
                    <p>✓ Master Code configured</p>
                    <p>✓ Delete Code configured</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      Codes are securely hashed and stored
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1" disabled={loading}>
                  Back
                </Button>
                <Button type="button" onClick={handleSubmit} className="flex-1" disabled={loading}>
                  {loading ? "Creating..." : "Create Company"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyProfile;
