import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const Onboarding = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [masterCode, setMasterCode] = useState("");
  const [deleteCode, setDeleteCode] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || "");

      // Check if user already has a company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.company_id) {
        navigate("/dashboard");
      }
    };

    checkAuth();
  }, [navigate]);

  const generateCode = (length: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCodes = () => {
    setMasterCode(generateCode(8));
    setDeleteCode(generateCode(8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);

    try {
      // In production, hash these codes server-side
      // For now, we're storing them as-is (will be hashed in the migration)
      const masterCodeHash = masterCode; // TODO: Implement proper hashing
      const deleteCodeHash = deleteCode;

      // Create company
      const { data: company, error: companyError } = await supabase
        .from("Unternehmen")
        .insert({
          name: companyName,
          address,
          sector,
          country,
          master_code_hash: masterCodeHash,
          delete_code_hash: deleteCodeHash,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create user profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          company_id: company.id,
          email: userEmail,
          full_name: companyName,
        });

      if (profileError) throw profileError;

      // Create master admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          company_id: company.id,
          role: "master_admin",
        });

      if (roleError) throw roleError;

      toast.success("Company created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-2xl shadow-glow">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t.onboarding.title}</CardTitle>
          <CardDescription>{t.onboarding.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">{t.onboarding.companyName} *</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t.onboarding.address}</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, Country"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">{t.onboarding.sector}</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger id="sector">
                      <SelectValue placeholder={t.onboarding.selectSector} />
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
                  <Label htmlFor="country">{t.onboarding.country}</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Germany"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <Label>{t.onboarding.securityCodes}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCodes}
                >
                  {t.onboarding.generateCodes}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="master-code">{t.onboarding.masterCode} *</Label>
                <Input
                  id="master-code"
                  value={masterCode}
                  onChange={(e) => setMasterCode(e.target.value)}
                  placeholder="XXXXXXXX"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t.onboarding.masterCodeDesc}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-code">{t.onboarding.deleteCode} *</Label>
                <Input
                  id="delete-code"
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value)}
                  placeholder="XXXXXXXX"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t.onboarding.deleteCodeDesc}
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.onboarding.submitting : t.onboarding.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
