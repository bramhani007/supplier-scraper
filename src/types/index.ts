export interface Supplier {
  id: number;
  name: string;
  location: string | null;
  gst_number: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  products: string | null;
  product_photos: string[];
  product_attributes: Record<string, any>;
  about_us: string | null;
  contact_us: string | null;
  testimonials: string | null;
  nature_of_business: string | null;
  total_employees: string | null;
  trust_seal_data: Record<string, any>;
  iec: string | null;
  annual_turnover: string | null;
  cin_no: string | null;
  indiamart_url: string | null;
  external_url: string | null;
  trust_seal_url: string | null;
  source_type: string;
  scrape_status: string;
  created_at: string;
}

export interface ScrapingJob {
  id: number;
  city: string;
  category: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_suppliers: number;
  processed_suppliers: number;
  current_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ScrapeResponse {
  success: boolean;
  jobId: number;
  total: number;
  processed: number;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  fields?: string[];
}
