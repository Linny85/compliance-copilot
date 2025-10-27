import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TrialCardProps {
  trialEnd: string | null;
  subscriptionStatus: string;
}

export function TrialCard({ trialEnd, subscriptionStatus }: TrialCardProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  // Calculate days left
  // Step 1: Get milliseconds difference
  // Step 2: Convert to days (divide by 86,400,000 ms per day)
  // Step 3: Round up using Math.ceil
  const getDaysLeft = () => {
    if (!trialEnd) return 0;
    
    const nowMs = Date.now();
    const trialEndMs = new Date(trialEnd).getTime();
    const diffMs = trialEndMs - nowMs;
    const daysLeft = Math.ceil(diffMs / 86400000);
    
    return Math.max(0, daysLeft);
  };

  const daysLeft = getDaysLeft();
  const isActive = subscriptionStatus === 'trial' || subscriptionStatus === 'active';

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('dashboard:trialStatus')}</CardTitle>
          <Badge variant={isActive ? "default" : "destructive"}>
            {isActive ? t('dashboard:active') : t('dashboard:expired')}
          </Badge>
        </div>
        <CardDescription>{t('dashboard:trialStatusDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          <Clock className="h-8 w-8 text-primary" />
          <div>
            <div className="text-2xl font-bold">{daysLeft}</div>
            <div className="text-sm text-muted-foreground">
              {t('dashboard:daysRemaining', { count: daysLeft })}
            </div>
          </div>
        </div>

        <Button className="w-full" variant="default">
          {t('dashboard:upgradePlan')}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {t('dashboard:trialNote')}
        </p>
      </CardContent>
    </Card>
  );
}
