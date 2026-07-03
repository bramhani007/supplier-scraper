-- Allow 'cancelled' as a valid job status
ALTER TABLE scraping_jobs DROP CONSTRAINT IF EXISTS chk_job_status;
ALTER TABLE scraping_jobs
  ADD CONSTRAINT chk_job_status
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Enable realtime for row-by-row live updates
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE scraping_jobs;