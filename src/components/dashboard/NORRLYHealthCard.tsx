import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface HealthReport {
  timestamp: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  details: Array<{
    name: string;
    passed: boolean;
    duration: number;
    answerLength?: number;
    error?: string;
  }>;
}

export function NORRLYHealthCard() {
  const { toast } = useToast();

  const { data: healthData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["norrly-health-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("helpbot-healthcheck");
      if (error) throw error;
      return data?.report as HealthReport;
    },
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const runHealthCheck = async () => {
    try {
      await refetch();
      toast({
        title: "Health-Check gestartet",
        description: "NORRLY wird jetzt überprüft...",
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (!healthData) return null;
    
    const successRate = (healthData.passed / healthData.total) * 100;
    
    if (successRate === 100) {
      return (
        <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Alle Tests bestanden
        </Badge>
      );
    } else if (successRate >= 80) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
          <AlertCircle className="w-3 h-3 mr-1" />
          Teilweise erfolgreich
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          Fehler erkannt
        </Badge>
      );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">NORRLY Health Status</h3>
          <p className="text-sm text-text-secondary mt-1">
            Automatische Systemprüfung
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runHealthCheck}
          disabled={isLoading || isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Test starten
        </Button>
      </div>

      {isLoading && !healthData ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
        </div>
      ) : healthData ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            <span className="text-sm text-text-secondary">
              {format(new Date(healthData.timestamp), "dd.MM.yyyy HH:mm", { locale: de })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-surface-2 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{healthData.passed}</div>
              <div className="text-xs text-text-secondary mt-1">Erfolgreich</div>
            </div>
            <div className="text-center p-3 bg-surface-2 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{healthData.failed}</div>
              <div className="text-xs text-text-secondary mt-1">Fehlgeschlagen</div>
            </div>
            <div className="text-center p-3 bg-surface-2 rounded-lg">
              <div className="text-2xl font-bold text-text-primary">{healthData.duration}ms</div>
              <div className="text-xs text-text-secondary mt-1">Dauer</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-primary">Test Details</h4>
            <div className="space-y-1">
              {healthData.details.map((test, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2 bg-surface-2 rounded text-sm"
                >
                  <div className="flex items-start gap-2">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">{test.name}</div>
                      {test.error && (
                        <div className="text-xs text-red-600 mt-1">{test.error}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary">{test.duration}ms</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          Keine Daten verfügbar
        </div>
      )}
    </Card>
  );
}
