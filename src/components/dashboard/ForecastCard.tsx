import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Forecast = {
  id: string;
  tenant_id: string;
  risk_level: 'low' | 'medium' | 'high';
  breach_probability_7d: number;
  confidence_score: number;
  suggested_slo_target: number;
  current_slo_target: number;
  predicted_sr_7d: number;
  volatility_index: number;
  advisories: string[];
  model_version: string;
  generated_at: string;
  applied_at: string | null;
};

export function ForecastCard({ companyId }: { companyId: string }) {
const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [ensemble, setEnsemble] = useState<any>(null);
  const [weights, setWeights] = useState<any>(null);
  const [experiment, setExperiment] = useState<any>(null);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_forecast_predictions' as any)
        .select('*')
        .eq('tenant_id', companyId)
        .maybeSingle();

      if (error) throw error;
      setForecast(data as unknown as Forecast);
    } catch (e: any) {
      console.error('[ForecastCard] load error:', e);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-forecast-metrics', {
        body: { tenant_id: companyId }
      });
      if (!error && data?.metrics) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('[ForecastCard] metrics error:', error);
    }
  };

  const loadTrend = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-reliability-trend', {
        body: { tenant_id: companyId }
      });
      if (!error && data?.trend) {
        setTrend(data.trend);
      }
    } catch (error) {
      console.error('[ForecastCard] trend error:', error);
    }
  };

  const loadEnsemble = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-ensemble-forecast', {
        body: { tenant_id: companyId }
      });
      if (!error && data?.ensemble) {
        setEnsemble(data.ensemble);
      }
    } catch (error) {
      console.error('[ForecastCard] ensemble error:', error);
    }
  };

  const loadWeights = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-ensemble-weights', {
        body: { tenant_id: companyId }
      });
      if (!error && data?.weights) {
        setWeights(data.weights);
      }
    } catch (error) {
      console.error('[ForecastCard] weights error:', error);
    }
  };

  const loadExperiment = async () => {
    try {
      // First get the assignment
      const { data: assignment, error: assignError } = await supabase
        .from('model_experiment_assignments' as any)
        .select('experiment_id')
        .eq('tenant_id', companyId)
        .maybeSingle();

      if (assignError || !assignment) {
        setExperiment(null);
        return;
      }

      const experimentId = (assignment as any).experiment_id;
      if (!experimentId) {
        setExperiment(null);
        return;
      }

      // Then get the experiment details
      const { data: exp, error: expError } = await supabase
        .from('model_experiments' as any)
        .select('id, name, status, allocation, started_at, notes')
        .eq('id', experimentId)
        .maybeSingle();

      if (!expError && exp) {
        setExperiment(exp);
      }
    } catch (error) {
      console.error('[ForecastCard] experiment error:', error);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadForecast();
      loadMetrics();
      loadTrend();
      loadEnsemble();
      loadWeights();
      loadExperiment();
    }
  }, [companyId]);

  const applySuggestedSLO = async () => {
    if (!forecast) return;
    setApplying(true);
    try {
      const { error } = await supabase.functions.invoke('adaptive-slo-tuner', {
        body: { tenant_id: companyId, auto_apply: true },
      });
      if (error) throw error;
      toast({
        title: 'SLO target updated',
        description: `Target adjusted to ${forecast.suggested_slo_target}%`,
      });
      await loadForecast();
    } catch (e: any) {
      toast({
        title: 'Failed to apply SLO adjustment',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  const riskColor = {
    low: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-red-600 dark:text-red-400',
  };

  const riskBg = {
    low: 'bg-green-100 dark:bg-green-900',
    medium: 'bg-yellow-100 dark:bg-yellow-900',
    high: 'bg-red-100 dark:bg-red-900',
  };

  const riskEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold">7-Day Forecast</h3>
        <div className="mt-4 animate-pulse h-32 bg-muted rounded" />
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold">7-Day Forecast</h3>
        <div className="mt-6 text-sm text-muted-foreground">
          No forecast available yet. Forecasts are generated daily based on 30 days of historical data.
        </div>
      </Card>
    );
  }

  const sloDelta = forecast.suggested_slo_target - forecast.current_slo_target;
  const showSloAdjustment = Math.abs(sloDelta) >= 0.5 && !forecast.applied_at;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">7-Day Compliance Forecast</h3>
          <p className="text-sm text-muted-foreground">
            Predictive risk analysis powered by AI
          </p>
          {metrics && (
            <div className="mt-2 text-sm">
              <span className={
                metrics.reliability >= 90 ? 'text-green-600 dark:text-green-400' :
                metrics.reliability >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 
                'text-red-600 dark:text-red-400'
              }>
                Model Reliability: {Number(metrics.reliability).toFixed(0)}%
              </span>
              <span className="ml-2 text-muted-foreground">
                (P {Number(metrics.precision_predicted).toFixed(0)}% ·
                 R {Number(metrics.recall_breached).toFixed(0)}% ·
                 MAE {Number(metrics.mae_sr).toFixed(1)}%)
              </span>
              {trend.length > 0 && (
                <div className="mt-2">
                  <svg viewBox="0 0 200 40" className="w-full h-10">
                    {trend.map((t, i) => {
                      if (i === 0) return null;
                      const prev = trend[i - 1];
                      const x1 = (i - 1) * (200 / trend.length);
                      const x2 = i * (200 / trend.length);
                      const y1 = 40 - (prev.avg_reliability || 0) * 0.4;
                      const y2 = 40 - (t.avg_reliability || 0) * 0.4;
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-blue-500 dark:text-blue-400"
                        />
                      );
                    })}
                  </svg>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    30-Day Reliability Trend
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-3xl">{riskEmoji[forecast.risk_level]}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className={`p-4 border rounded ${riskBg[forecast.risk_level]}`}>
          <div className="text-sm text-muted-foreground">Risk Level</div>
          <div className={`mt-1 text-2xl font-bold ${riskColor[forecast.risk_level]}`}>
            {forecast.risk_level.toUpperCase()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {forecast.breach_probability_7d.toFixed(0)}% breach probability
          </div>
        </div>

        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Predicted Success Rate</div>
          <div className="mt-1 text-2xl font-bold flex items-center gap-2">
            {forecast.predicted_sr_7d.toFixed(1)}%
            {forecast.predicted_sr_7d > forecast.current_slo_target ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Confidence: {forecast.confidence_score.toFixed(0)}%
          </div>
        </div>

        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">SLO Target</div>
          <div className="mt-1 text-2xl font-bold">
            {forecast.current_slo_target.toFixed(1)}%
          </div>
          {showSloAdjustment && (
            <div className="text-xs mt-1">
              <Badge variant={sloDelta > 0 ? 'default' : 'secondary'}>
                Suggested: {forecast.suggested_slo_target.toFixed(1)}%{' '}
                ({sloDelta > 0 ? '+' : ''}
                {sloDelta.toFixed(1)}%)
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Recommended Actions
        </h4>
        <ul className="space-y-2">
          {forecast.advisories.map((advisory, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>{advisory}</span>
            </li>
          ))}
        </ul>
      </div>

      {showSloAdjustment && (
        <div className="flex items-center justify-between p-4 border rounded bg-muted/50">
          <div className="text-sm">
            <div className="font-semibold">Apply AI-Recommended SLO Adjustment?</div>
            <div className="text-muted-foreground">
              Adjust target from {forecast.current_slo_target.toFixed(1)}% to{' '}
              {forecast.suggested_slo_target.toFixed(1)}% based on forecast analysis
            </div>
          </div>
          <Button onClick={applySuggestedSLO} disabled={applying} variant="default">
            {applying ? 'Applying...' : 'Apply Adjustment'}
          </Button>
        </div>
      )}

      {ensemble && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            90-Day Ensemble Forecast
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 border rounded bg-muted/30">
              <div className="text-xs text-muted-foreground">Predicted Success Rate</div>
              <div className="text-xl font-bold mt-1">{Number(ensemble.forecast_sr_90d).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                CI: {Number(ensemble.lower_ci).toFixed(1)}% – {Number(ensemble.upper_ci).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 border rounded bg-muted/30">
              <div className="text-xs text-muted-foreground">Model Weights</div>
              <div className="text-xs mt-1 space-y-0.5">
                <div>ARIMA: {Number(ensemble.weight_arima * 100).toFixed(0)}%</div>
                <div>Gradient: {Number(ensemble.weight_gradient * 100).toFixed(0)}%</div>
                <div>Bayesian: {Number(ensemble.weight_bayes * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {weights && (
        <div className="mt-4 border-t pt-3">
          <h4 className="text-sm font-semibold mb-2">🧠 Adaptive Model Weights</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ARIMA (Trend-based):</span>
              <span className="font-medium">{Number(weights.weight_arima * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gradient (Conservative):</span>
              <span className="font-medium">{Number(weights.weight_gradient * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bayesian (Optimistic):</span>
              <span className="font-medium">{Number(weights.weight_bayes * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            Last tuned: {new Date(weights.adjusted_at).toLocaleString()} · 
            Reliability: {Number(weights.reliability).toFixed(0)}% · 
            MAE: {Number(weights.mae).toFixed(1)}
          </div>
        </div>
      )}

      {experiment && (
        <div className="mt-4 border-t pt-3">
          <h4 className="text-sm font-semibold mb-2">🔬 Active Experiment</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={
                experiment.status === 'succeeded' ? 'default' :
                experiment.status === 'running' ? 'secondary' :
                experiment.status === 'rolled_back' ? 'destructive' : 'outline'
              }>
                {experiment.status.toUpperCase()}
              </Badge>
            </div>
            {experiment.allocation && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Canary allocation:</span>
                <span className="text-sm font-medium">{(experiment.allocation * 100).toFixed(0)}%</span>
              </div>
            )}
            {experiment.started_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Started:</span>
                <span className="text-sm font-medium">
                  {new Date(experiment.started_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {experiment.notes && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                {experiment.notes}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground flex items-center justify-between">
        <span>Last updated: {new Date(forecast.generated_at).toLocaleString()}</span>
        <span>Model: {forecast.model_version}</span>
      </div>
    </Card>
  );
}
