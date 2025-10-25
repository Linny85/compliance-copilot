import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FeatureSection from "@/components/FeatureSection";
import { UpgradeCard } from "@/components/UpgradeCard";

interface SubscriptionData {
  status: string;
  plan: string;
  current_period_end: string;
  stripe_customer_id: string | null;
}

export default function Billing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    fetchSubscription();
    
    // Check URL params for status
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    
    if (status === 'success') {
      toast({
        title: "Abonnement aktiviert",
        description: "Ihr Abonnement wurde erfolgreich aktiviert.",
      });
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'cancel') {
      toast({
        title: "Zahlung abgebrochen",
        description: "Der Zahlungsvorgang wurde abgebrochen.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function fetchSubscription() {
    try {
      // Use view instead of direct table access (no custom claims needed)
      const { data, error } = await supabase
        .from('v_me_subscription')
        .select('status, plan, current_period_end, stripe_customer_id')
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setFetchingData(false);
    }
  }

  async function startCheckout() {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error("Nicht angemeldet");

      // Step 1: Prepare subscription (create customer if needed, pre-insert record)
      const prepRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-prep`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.data.session.access_token}`,
          },
        }
      );

      if (!prepRes.ok) {
        const error = await prepRes.json();
        throw new Error(error.error || 'Vorbereitung fehlgeschlagen');
      }

      const { stripe_customer_id } = await prepRes.json();

      // Step 2: Create checkout session
      const checkoutRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-checkout`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId: stripe_customer_id,
            success_url: `${window.location.origin}/billing?status=success`,
            cancel_url: `${window.location.origin}/billing?status=cancel`,
          }),
        }
      );

      if (!checkoutRes.ok) {
        const error = await checkoutRes.json();
        throw new Error(error.error || 'Checkout fehlgeschlagen');
      }

      const { url } = await checkoutRes.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Checkout fehlgeschlagen",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  async function openPortal() {
    if (!subscription?.stripe_customer_id) {
      toast({
        title: "Fehler",
        description: "Kein aktives Abonnement gefunden",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-portal`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId: subscription.stripe_customer_id,
            return_url: `${window.location.origin}/billing`,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Portal-Zugriff fehlgeschlagen');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Portal-Zugriff fehlgeschlagen",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Aktiv" },
      trialing: { variant: "secondary", label: "Testzeitraum" },
      past_due: { variant: "destructive", label: "Überfällig" },
      canceled: { variant: "outline", label: "Gekündigt" },
      incomplete: { variant: "secondary", label: "Unvollständig" },
    };
    
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (fetchingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Abonnement & Abrechnung</h1>

      {!subscription && (
        <div className="mb-6">
          <UpgradeCard 
            sessionToken={""} 
            userId={""} 
          />
        </div>
      )}

      {subscription ? (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Aktuelles Abonnement</CardTitle>
                <CardDescription>
                  Plan: {subscription.plan}
                </CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.current_period_end && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Verlängert sich am: {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
                </span>
              </div>
            )}
            
            <Button 
              onClick={openPortal}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Abrechnungsportal öffnen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Kein aktives Abonnement</CardTitle>
            <CardDescription>
              Starten Sie Ihr Abonnement, um Zugriff auf alle Funktionen zu erhalten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={startCheckout}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Abonnement starten
            </Button>
          </CardContent>
        </Card>
      )}

      <FeatureSection />
    </div>
  );
}
