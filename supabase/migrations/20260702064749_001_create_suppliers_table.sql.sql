-- Create suppliers table
CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  gst_number TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  products TEXT,
  product_photos JSONB DEFAULT '[]',
  product_attributes JSONB DEFAULT '{}',
  about_us TEXT,
  contact_us TEXT,
  testimonials TEXT,
  nature_of_business TEXT,
  total_employees TEXT,
  trust_seal_data JSONB DEFAULT '{}',
  iec TEXT,
  annual_turnover TEXT,
  cin_no TEXT,
  indiamart_url TEXT,
  external_url TEXT,
  trust_seal_url TEXT,
  source_type TEXT DEFAULT 'indiamart',
  scrape_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Policies for public access (no auth required for this app)
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE
  TO anon, authenticated USING (true);

-- Create index for faster searches
CREATE INDEX idx_suppliers_name ON suppliers (name);
CREATE INDEX idx_suppliers_location ON suppliers (location);
CREATE INDEX idx_suppliers_status ON suppliers (scrape_status);
CREATE INDEX idx_suppliers_created ON suppliers (created_at DESC);

-- Create scraping_jobs table for tracking progress
CREATE TABLE scraping_jobs (
  id BIGSERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  total_suppliers INTEGER DEFAULT 0,
  processed_suppliers INTEGER DEFAULT 0,
  current_url TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on scraping_jobs
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_jobs" ON scraping_jobs FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "insert_jobs" ON scraping_jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_jobs" ON scraping_jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_jobs" ON scraping_jobs FOR DELETE
  TO anon, authenticated USING (true);

-- Create index for jobs
CREATE INDEX idx_jobs_status ON scraping_jobs (status);
CREATE INDEX idx_jobs_created ON scraping_jobs (created_at DESC);