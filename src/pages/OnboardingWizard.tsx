import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isDemo } from "@/config/appMode";

type Step = 'company' | 'scope' | 'frameworks' | 'seed' | 'done';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('company');
  const [userId, setUserId] = useState<string>('');
  const [data, setData] = useState({
    company: { legal_name: '', country_code: 'SE', industry: '', headcount_band: '50-250', criticality_profile: 'high' as const },
    orgunits: [{ name: 'Head Office' }],
    assets: [{ name: 'Core Application', type: 'system', criticality: 'high' }],
    processes: [{ name: 'Incident Response' }],
    frameworks: [] as string[],
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No navigation - AuthGuard handles redirects
        return;
      }
      setUserId(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const handleSeed = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke('onboarding-seed', {
        body: { ...data, assets: data.assets.map(a => ({ ...a, owner_id: userId })), processes: data.processes.map(p => ({ ...p, owner_id: userId })), locale: 'en' }
      });
      await supabase.functions.invoke('onboarding-complete');
      toast.success('Setup complete!');
      setCurrentStep('done');
    } catch (error: any) {
      toast.error(error.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const progressValue = { company: 25, scope: 50, frameworks: 75, seed: 90, done: 100 }[currentStep];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Quick Setup</h1></div>
          <LanguageSwitcher />
        </div>
        <Progress value={progressValue} />
        {currentStep === 'company' && (
          <div className="space-y-4">
            <Input placeholder="Company Name" value={data.company.legal_name} onChange={e => setData({ ...data, company: { ...data.company, legal_name: e.target.value } })} />
            <Input placeholder="Industry" value={data.company.industry} onChange={e => setData({ ...data, company: { ...data.company, industry: e.target.value } })} />
            <Button onClick={() => setCurrentStep('frameworks')} disabled={!data.company.legal_name}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        )}
        {currentStep === 'frameworks' && (
          <div className="space-y-4">
            {['NIS2', 'GDPR', 'AI_ACT'].map(fw => (
              <label key={fw} className="flex items-center gap-2 p-3 border rounded cursor-pointer">
                <input type="checkbox" checked={data.frameworks.includes(fw)} onChange={e => setData({ ...data, frameworks: e.target.checked ? [...data.frameworks, fw] : data.frameworks.filter(f => f !== fw) })} />
                <span>{fw}</span>
              </label>
            ))}
            <Button onClick={() => setCurrentStep('seed')} disabled={!data.frameworks.length}>Next</Button>
          </div>
        )}
        {currentStep === 'seed' && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <Button onClick={handleSeed} disabled={loading} size="lg">{loading ? <Loader2 className="animate-spin mr-2" /> : null}Initialize</Button>
          </div>
        )}
        {currentStep === 'done' && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">All Set!</h2>
            <Button onClick={() => navigate('/dashboard')} size="lg">Go to Dashboard</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OnboardingWizard;
