-- Create view for forecast reliability trend
CREATE OR REPLACE VIEW v_forecast_reliability_trend AS
SELECT 
  tenant_id,
  DATE(adjusted_at) as day,
  AVG(reliability) as avg_reliability,
  AVG(mae) as avg_mae,
  COUNT(*) as sample_count,
  MIN(adjusted_at) as first_update,
  MAX(adjusted_at) as last_update
FROM ensemble_weight_history
GROUP BY tenant_id, DATE(adjusted_at)
ORDER BY tenant_id, day;