import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FeatureSection from "@/components/FeatureSection";
import { useBillingStatus } from "@/hooks/useBilling";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useTranslation } from "react-i18next";

interface SubscriptionData {
  status: string;
  plan: string;
  current_period_end: string;
  stripe_customer_id: string | null;
}

export default function Billing() {
  const { t, ready } = useTranslation(["billing", "common"]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [startingTrial, setStartingTrial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userInfo } = useAuthGuard();
  const { data: billingStatus } = useBillingStatus(userInfo?.tenantId);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Get session (but don't redirect - AuthGuard handles that)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setFetchingData(false);
          return;
        }

        // Check URL params for status
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        
        if (status === 'success') {
          toast({
            title: t("billing:checkoutSuccess", "Abonnement aktiviert"),
            description: t("billing:checkoutSuccessDesc", "Ihr Abonnement wurde erfolgreich aktiviert."),
          });
          window.history.replaceState({}, '', window.location.pathname);
        } else if (status === 'cancel') {
          toast({
            title: t("billing:checkoutCancel", "Zahlung abgebrochen"),
            description: t("billing:checkoutCancelDesc", "Der Zahlungsvorgang wurde abgebrochen."),
            variant: "destructive",
          });
          window.history.replaceState({}, '', window.location.pathname);
        }

        // Fetch subscription data
        const { data, error: subError } = await supabase
          .from('v_me_subscription')
          .select('status, plan, current_period_end, stripe_customer_id')
          .maybeSingle();

        if (!cancelled) {
          if (subError) {
            console.error('Error fetching subscription:', subError);
            setError(t("billing:fetchError", "Fehler beim Laden der Abonnementdaten"));
          } else {
            setSubscription(data);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? t("common:errors.unknown", "Unbekannter Fehler"));
        }
      } finally {
        if (!cancelled) {
          setFetchingData(false);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [t, toast]);

  async function startTrial() {
    setStartingTrial(true);
    try {
      // @ts-ignore - RPC function not in generated types yet
      const { error } = await supabase.rpc('start_or_reset_trial', { days: 14 });
      if (error) throw error;
      toast({
        title: t("billing:trialStarted", "Testversion aktiviert"),
        description: t("billing:trialStartedDesc", "Ihre 14-Tage-Testversion wurde erfolgreich aktiviert."),
      });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error(error);
      toast({
        title: t("common:errors.error", "Fehler"),
        description: t("billing:trialStartFailed", "Fehler beim Starten der Testversion"),
        variant: "destructive",
      });
    } finally {
      setStartingTrial(false);
    }
  }

  async function startCheckout() {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error(t("common:errors.notAuthenticated", "Nicht angemeldet"));

      // Step 1: Prepare subscription
      const { data: prepData, error: prepError } = await supabase.functions.invoke('subscription-prep', {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (prepError) throw prepError;
      const { stripe_customer_id } = prepData;

      // Step 2: Create checkout session - open in new tab
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('billing-checkout', {
        body: {
          customerId: stripe_customer_id,
          success_url: `${window.location.origin}/billing?status=success`,
          cancel_url: `${window.location.origin}/billing?status=cancel`,
        },
      });

      if (checkoutError) throw checkoutError;
      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: t("common:errors.error", "Fehler"),
        description: error instanceof Error ? error.message : t("billing:checkoutFailed", "Checkout fehlgeschlagen"),
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  async function openPortal() {
    if (!subscription?.stripe_customer_id) {
      toast({
        title: t("common:errors.error", "Fehler"),
        description: t("billing:noActiveSubscription", "Kein aktives Abonnement gefunden"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error(t("common:errors.notAuthenticated", "Nicht angemeldet"));

      const { data, error: portalError } = await supabase.functions.invoke('billing-portal', {
        body: {
          customerId: subscription.stripe_customer_id,
          return_url: `${window.location.origin}/billing`,
        },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (portalError) throw portalError;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: t("common:errors.error", "Fehler"),
        description: error instanceof Error ? error.message : t("billing:portalFailed", "Portal-Zugriff fehlgeschlagen"),
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: t("billing:statusActive", "Aktiv") },
      trialing: { variant: "secondary", label: t("billing:statusTrialing", "Testzeitraum") },
      past_due: { variant: "destructive", label: t("billing:statusPastDue", "Überfällig") },
      canceled: { variant: "outline", label: t("billing:statusCanceled", "Gekündigt") },
      incomplete: { variant: "secondary", label: t("billing:statusIncomplete", "Unvollständig") },
    };
    
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Wait for i18n to be ready
  if (!ready) return null;

  if (fetchingData) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 animate-pulse">
        <div className="h-7 w-56 rounded bg-muted mb-2" />
        <div className="h-4 w-80 rounded bg-muted mb-6" />
        <div className="h-9 w-48 rounded bg-muted mb-8" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded bg-muted" />
          <div className="h-40 rounded bg-muted" />
        </div>
      </div>
    );
  }

  // If no session, AuthGuard will redirect
  if (!userInfo) return null;

  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">{t("billing:billingTitle", "Abonnement & Abrechnung")}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {t("billing:subtitle", "Verwalten Sie Ihr Abonnement und Ihre Zahlungsdaten.")}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-3 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {billingStatus?.trial_active && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-amber-900 dark:text-amber-200">
                {t("billing:trialActive", "Testversion aktiv")}
              </CardTitle>
              <Badge variant="default" className="bg-amber-600">
                {t("billing:daysLeft", "{{count}} Tag verbleibend", { 
                  count: billingStatus.trial_days_left 
                })}
              </Badge>
            </div>
            <CardDescription className="text-amber-900/70 dark:text-amber-200/70">
              {t("billing:trialEnds", "Ihre kostenlose Testphase läuft bis {{date}}", {
                date: billingStatus.trial_end ? new Date(billingStatus.trial_end).toLocaleDateString('de-DE') : '—'
              })}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {subscription ? (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("billing:currentPlan", "Aktuelles Abonnement")}</CardTitle>
                <CardDescription>
                  {t("billing:plan", "Plan")}: {subscription.plan}
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
                  {t("billing:renewsOn", "Verlängert sich am: {{date}}", {
                    date: new Date(subscription.current_period_end).toLocaleDateString('de-DE')
                  })}
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
              {t("billing:openPortal", "Abrechnungsportal öffnen")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {!billingStatus?.trial_active && (
            <Card className="mb-6 border-primary/20">
              <CardHeader>
                <CardTitle>{t("billing:freeTrial", "14 Tage kostenlos testen")}</CardTitle>
                <CardDescription>
                  {t("billing:freeTrialDesc", "Testen Sie alle Funktionen ohne Risiko. Keine Kreditkarte erforderlich.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={startTrial}
                  disabled={startingTrial}
                  size="lg"
                >
                  {startingTrial ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {t("billing:startTrial", "Testversion starten")}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("billing:premiumPlan", "Premium-Abonnement")}</CardTitle>
              <CardDescription>
                {t("billing:premiumPlanDesc", "Wählen Sie einen Plan, der zu Ihren Anforderungen passt")}
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
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                {t("billing:upgradeNow", "Jetzt upgraden")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <FeatureSection />
    </div>
  );
}
