import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_DATA_THRESHOLD = 200; // Minimum checks in 30d for reliable forecast

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get all tenants
    const { data: companies } = await sb
      .from("profiles")
      .select("company_id")
      .not("company_id", "is", null);

    const tenantIds = Array.from(
      new Set((companies ?? []).map((c: any) => c.company_id).filter(Boolean))
    );

    const forecasts: any[] = [];
    const insights: any[] = [];

    for (const tenantId of tenantIds) {
      // Get forecast features
      const { data: features } = await sb
        .from("v_forecast_features_30d" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!features || features.total_checks_30d < MIN_DATA_THRESHOLD) {
        console.log(`[generate-forecast] Skipping ${tenantId}: insufficient data (${features?.total_checks_30d ?? 0} checks)`);
        continue;
      }

      // Get current SLO target
      const { data: settings } = await sb
        .from("tenant_settings")
        .select("slo_target_sr")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const currentTarget = settings?.slo_target_sr ?? 80.0;

      // Simple predictive model (heuristic-based)
      const avgSr = features.avg_sr_30d ?? 80;
      const volatility = features.stddev_sr_30d ?? 0;
      const trend = (features.avg_sr_7d ?? avgSr) - (features.avg_sr_23d ?? avgSr);
      const alertDensity = features.alert_count_7d / 7; // alerts per day
      const burnRate = features.burn_24h_x ?? 0;

      // Volatility index (normalized 0-100)
      const volatilityIndex = Math.min(100, (volatility / 20) * 100);

      // Predicted SR in 7 days (simple linear extrapolation with dampening)
      const predictedSr7d = Math.max(0, Math.min(100, avgSr + (trend * 0.7)));

      // Breach probability calculation
      let breachProb = 0;
      
      // Factor 1: Distance from target
      const distanceFromTarget = currentTarget - predictedSr7d;
      if (distanceFromTarget > 0) {
        breachProb += Math.min(50, distanceFromTarget * 2.5);
      }

      // Factor 2: Volatility risk
      breachProb += Math.min(20, volatility * 1.5);

      // Factor 3: Alert density
      breachProb += Math.min(15, alertDensity * 5);

      // Factor 4: Burn rate
      if (burnRate >= 2.0) breachProb += 15;
      else if (burnRate >= 1.5) breachProb += 10;

      breachProb = Math.min(100, Math.max(0, breachProb));

      // Risk level classification
      let riskLevel: 'low' | 'medium' | 'high';
      if (breachProb >= 60) riskLevel = 'high';
      else if (breachProb >= 30) riskLevel = 'medium';
      else riskLevel = 'low';

      // Confidence score (inverse of volatility, adjusted for data quality)
      const dataQuality = Math.min(100, (features.days_with_data / 30) * 100);
      const confidenceScore = Math.max(0, Math.min(100, 
        (100 - volatilityIndex) * 0.7 + dataQuality * 0.3
      ));

      // Suggested SLO target adjustment (±5% bounded [70, 98])
      let suggestedTarget = currentTarget;
      
      if (riskLevel === 'high' && avgSr < currentTarget - 5) {
        // Lower target if consistently underperforming
        suggestedTarget = Math.max(70, currentTarget - 5);
      } else if (riskLevel === 'low' && avgSr > currentTarget + 5 && volatility < 5) {
        // Raise target if consistently overperforming with low volatility
        suggestedTarget = Math.min(98, currentTarget + 5);
      }

      // Generate advisories
      const advisories: string[] = [];
      
      if (trend < -5) {
        advisories.push("Downward trend detected. Review recent changes and increase monitoring frequency.");
      }
      
      if (volatility > 15) {
        advisories.push(`High volatility (σ=${volatility.toFixed(1)}%). Stabilize processes to improve predictability.`);
      }
      
      if (alertDensity > 2) {
        advisories.push(`Alert density ${alertDensity.toFixed(1)}/day. Prioritize resolution of critical incidents.`);
      }
      
      if (burnRate >= 1.5) {
        advisories.push(`Error budget burning at ${burnRate.toFixed(1)}×. Reduce failure rate to prevent SLO breach.`);
      }

      if (riskLevel === 'high') {
        advisories.push("High breach risk within 7 days. Consider triggering incident response procedures.");
      }

      if (advisories.length === 0) {
        advisories.push("Compliance metrics stable. Continue current practices.");
      }

      // Store forecast prediction
      const forecast = {
        tenant_id: tenantId,
        risk_level: riskLevel,
        breach_probability_7d: Math.round(breachProb * 100) / 100,
        confidence_score: Math.round(confidenceScore * 100) / 100,
        suggested_slo_target: Math.round(suggestedTarget * 100) / 100,
        current_slo_target: currentTarget,
        predicted_sr_7d: Math.round(predictedSr7d * 100) / 100,
        volatility_index: Math.round(volatilityIndex * 100) / 100,
        advisories: advisories,
        model_version: "v1.0",
      };

      const { error: forecastErr } = await sb
        .from("forecast_predictions")
        .insert(forecast);

      if (forecastErr) {
        console.error(`[generate-forecast] Failed to insert forecast for ${tenantId}:`, forecastErr);
        continue;
      }

      forecasts.push(forecast);

      // Store as insight
      insights.push({
        tenant_id: tenantId,
        insight_type: "forecast",
        title: `7-Day Compliance Forecast: ${riskLevel.toUpperCase()} Risk`,
        description: `Breach probability: ${breachProb.toFixed(0)}% | Predicted SR: ${predictedSr7d.toFixed(1)}% | Confidence: ${confidenceScore.toFixed(0)}%`,
        severity: riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'warning' : 'info',
        metadata: {
          breach_probability: breachProb,
          predicted_sr: predictedSr7d,
          confidence: confidenceScore,
          volatility: volatility,
          trend: trend,
          advisories: advisories,
        },
      });

      console.log("[generate-forecast]", {
        tenant_id: tenantId,
        risk_level: riskLevel,
        breach_prob: breachProb.toFixed(1),
        predicted_sr: predictedSr7d.toFixed(1),
        confidence: confidenceScore.toFixed(1),
        suggested_slo: suggestedTarget,
        delta_slo: (suggestedTarget - currentTarget).toFixed(1),
      });
    }

    // Batch insert insights
    if (insights.length > 0) {
      await sb.from("insight_history").insert(insights);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        forecasts_generated: forecasts.length,
        tenants_processed: tenantIds.length,
        insights_created: insights.length,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[generate-forecast] error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
