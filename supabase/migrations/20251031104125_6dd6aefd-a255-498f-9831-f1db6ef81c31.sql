-- Create storage bucket for NORRLY health check logs
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('norrly-logs', 'norrly-logs', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for norrly-logs bucket (service role only)
CREATE POLICY "Service role can manage norrly-logs"
ON storage.objects
FOR ALL
USING (bucket_id = 'norrly-logs')
WITH CHECK (bucket_id = 'norrly-logs');