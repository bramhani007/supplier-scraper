-- Constrain text field lengths to prevent oversized rows
ALTER TABLE suppliers
  ALTER COLUMN name          TYPE VARCHAR(300),
  ALTER COLUMN location      TYPE VARCHAR(300),
  ALTER COLUMN gst_number    TYPE VARCHAR(20),
  ALTER COLUMN phone         TYPE VARCHAR(100),
  ALTER COLUMN email         TYPE VARCHAR(200),
  ALTER COLUMN website       TYPE VARCHAR(500),
  ALTER COLUMN indiamart_url TYPE VARCHAR(500),
  ALTER COLUMN external_url  TYPE VARCHAR(500),
  ALTER COLUMN trust_seal_url TYPE VARCHAR(500),
  ALTER COLUMN nature_of_business TYPE VARCHAR(200),
  ALTER COLUMN total_employees TYPE VARCHAR(100),
  ALTER COLUMN annual_turnover TYPE VARCHAR(100),
  ALTER COLUMN iec           TYPE VARCHAR(50),
  ALTER COLUMN cin_no        TYPE VARCHAR(50),
  ALTER COLUMN source_type   TYPE VARCHAR(20),
  ALTER COLUMN scrape_status TYPE VARCHAR(20);

-- GST number format: 15-char alphanumeric matching the Indian GST pattern
ALTER TABLE suppliers
  ADD CONSTRAINT chk_gst_format
  CHECK (
    gst_number IS NULL OR
    gst_number = '' OR
    gst_number ~ '^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$'
  );

-- Email: basic format sanity (not a full RFC check — just rejects clear garbage)
ALTER TABLE suppliers
  ADD CONSTRAINT chk_email_format
  CHECK (
    email IS NULL OR
    email = '' OR
    email ~ '^[^@\s]{1,64}@[^@\s]{1,63}(\.[^@\s]{1,63})*$'
  );

-- source_type must be one of the known values
ALTER TABLE suppliers
  ADD CONSTRAINT chk_source_type
  CHECK (source_type IN ('indiamart', 'external'));

-- scrape_status must be one of the known values
ALTER TABLE suppliers
  ADD CONSTRAINT chk_scrape_status
  CHECK (scrape_status IN ('pending', 'completed', 'failed'));

-- scraping_jobs: status enumeration
ALTER TABLE scraping_jobs
  ADD CONSTRAINT chk_job_status
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- scraping_jobs: processed cannot exceed total (when both are set)
ALTER TABLE scraping_jobs
  ADD CONSTRAINT chk_processed_lte_total
  CHECK (
    total_suppliers IS NULL OR
    processed_suppliers IS NULL OR
    processed_suppliers <= total_suppliers
  );

-- scraping_jobs: text field lengths
ALTER TABLE scraping_jobs
  ALTER COLUMN city        TYPE VARCHAR(100),
  ALTER COLUMN category    TYPE VARCHAR(100),
  ALTER COLUMN status      TYPE VARCHAR(20),
  ALTER COLUMN current_url TYPE VARCHAR(500);