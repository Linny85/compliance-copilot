import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Brain, FileText } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export function NextStepsCard() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t.dashboard.nextSteps}</CardTitle>
        <CardDescription>{t.dashboard.nextStepsDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start h-auto py-4 px-4"
          onClick={() => navigate("/nis2")}
        >
          <Shield className="h-5 w-5 mr-3 text-primary" />
          <div className="text-left flex-1">
            <div className="font-semibold">{t.dashboard.addFirstRisk}</div>
            <div className="text-xs text-muted-foreground">{t.dashboard.addFirstRiskDesc}</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start h-auto py-4 px-4"
          onClick={() => navigate("/ai-act")}
        >
          <Brain className="h-5 w-5 mr-3 text-primary" />
          <div className="text-left flex-1">
            <div className="font-semibold">{t.dashboard.registerAI}</div>
            <div className="text-xs text-muted-foreground">{t.dashboard.registerAIDesc}</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start h-auto py-4 px-4"
          onClick={() => navigate("/documents")}
        >
          <FileText className="h-5 w-5 mr-3 text-primary" />
          <div className="text-left flex-1">
            <div className="font-semibold">{t.dashboard.generatePolicy}</div>
            <div className="text-xs text-muted-foreground">{t.dashboard.generatePolicyDesc}</div>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}
