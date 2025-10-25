import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppMode } from "@/state/AppModeProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Hash function for demo codes
async function hash(value: string): Promise<string> {
  const enc = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

type Step = 1 | 2 | 3;

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode } = useAppMode();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [userId, setUserId] = useState<string>('');
  
  const isDemo = mode === "demo" || searchParams.get("mode") === "demo";
  
  const [org, setOrg] = useState({ 
    name: '', 
    country: 'SE', 
    industry: '' 
  });
  const [adminCode, setAdminCode] = useState('');
  const [superCode, setSuperCode] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      if (isDemo) {
        // Demo mode: no auth needed
        setUserId('demo-user');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserId(session.user.id);
    };
    checkAuth();
  }, [navigate, isDemo]);

  const finish = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        // Demo mode: store locally
        localStorage.setItem("demo_org_profile_v1", JSON.stringify({
          ...org,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
        }));
        
        // Store hashed codes (never plain text)
        localStorage.setItem("demo_org_codes_v1", JSON.stringify({
          adminHash: await hash(adminCode),
          superHash: await hash(superCode),
          updatedAt: new Date().toISOString()
        }));
        
        toast.success('Demo-Organisation eingerichtet!');
        navigate('/dashboard', { replace: true });
      } else {
        // Prod mode: use edge function
        await supabase.functions.invoke('onboarding-seed', {
          body: {
            company: { ...org, legal_name: org.name },
            orgunits: [{ name: 'Head Office' }],
            assets: [{ name: 'Core Application', type: 'system', criticality: 'high', owner_id: userId }],
            processes: [{ name: 'Incident Response', owner_id: userId }],
            frameworks: [],
            locale: 'en'
          }
        });
        await supabase.functions.invoke('onboarding-complete');
        toast.success('Setup abgeschlossen!');
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || 'Setup fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const progressValue = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {isDemo ? '🔰 Demo-Onboarding' : 'Schnell-Setup'}
          </h1>
          <LanguageSwitcher />
        </div>
        <Progress value={progressValue} />

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">1) Unternehmen anlegen</h2>
            <Input 
              placeholder="Unternehmensname" 
              value={org.name} 
              onChange={e => setOrg({ ...org, name: e.target.value })}
            />
            <Input 
              placeholder="Branche (optional)" 
              value={org.industry} 
              onChange={e => setOrg({ ...org, industry: e.target.value })}
            />
            <Button 
              onClick={() => setCurrentStep(2)} 
              disabled={!org.name}
            >
              Weiter <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">2) Admin-Code festlegen</h2>
            <p className="text-sm text-muted-foreground">
              Dieser Code schützt administrative Funktionen.
            </p>
            <Input 
              type="password"
              placeholder="Admin-Code (mind. 6 Zeichen)" 
              value={adminCode} 
              onChange={e => setAdminCode(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Zurück
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)} 
                disabled={adminCode.length < 6}
              >
                Weiter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">3) Superadmin-Code (Löschrechte)</h2>
            <p className="text-sm text-muted-foreground">
              {isDemo 
                ? 'Im Demo-Modus wird nur ein Hash lokal gespeichert.' 
                : 'Dieser Code wird sicher verschlüsselt gespeichert.'}
            </p>
            <Input 
              type="password"
              placeholder="Superadmin-Code (mind. 8 Zeichen)" 
              value={superCode} 
              onChange={e => setSuperCode(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Zurück
              </Button>
              <Button 
                onClick={finish} 
                disabled={superCode.length < 8 || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Einrichten...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Abschließen & zur App
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OnboardingWizard;
