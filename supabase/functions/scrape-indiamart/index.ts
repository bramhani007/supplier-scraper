import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0';

const corsHeaders = {
  // Wildcard is required for Supabase edge function clients (anon key auth)
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── Regex patterns (bounded quantifiers to prevent ReDoS) ────────────────────
// GST: fixed-width pattern — no backtracking risk
const GST_PATTERN = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b/g;

// Phone: bounded, no nested quantifiers
const PHONE_PATTERN = /(?:\+91[\s\-]?)?[789]\d{9}/g;

// Email: bounded lengths on each segment prevent catastrophic backtracking
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9\-]{1,63}(?:\.[a-zA-Z0-9\-]{1,63})*\.[a-zA-Z]{2,}/g;

// Allowed link-local / loopback / private ranges for SSRF prevention
const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127(?:\.\d+){3}$/,
  /^0(?:\.\d+){3}$/,
  /^10(?:\.\d+){3}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2}$/,
  /^192\.168(?:\.\d+){2}$/,
  /^169\.254(?:\.\d+){2}$/,   // link-local / AWS metadata
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,          // ULA IPv6
  /^fe80:/i,                   // link-local IPv6
  /metadata\.google\.internal$/i,
];

// Safe URL validator — returns parsed URL or null
function parseSafeUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;

  const host = parsed.hostname.toLowerCase();
  for (const re of BLOCKED_HOST_PATTERNS) {
    if (re.test(host)) return null;
  }
  return parsed;
}

// Input slug: allow only alphanumeric and hyphens, max 100 chars
function sanitiseSlug(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 100);
}

// Strip HTML tags and collapse whitespace to prevent stored-XSS
function stripHtml(s: string): string {
  // Remove script/style blocks first
  let out = s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // Remove all remaining tags
  out = out.replace(/<[^>]{0,2000}>/g, ' ');
  // Decode common HTML entities
  out = out
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&nbsp;/gi, ' ');
  // Collapse whitespace
  return out.replace(/\s{2,}/g, ' ').trim();
}

// Truncate to protect against oversized DB rows
function trunc(s: string, max = 2000): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Generic error message — never expose internal error detail
function safeError(err: unknown): string {
  if (err instanceof Error && err.name === 'AbortError') return 'Request timed out';
  if (err instanceof Error && err.message.includes('network')) return 'Network error';
  return 'Scrape failed';
}

// ── Network helper ────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function safeFetch(rawUrl: string, retries = 2): Promise<Response | null> {
  const url = parseSafeUrl(rawUrl);
  if (!url) {
    console.warn('[SSRF block] rejected:', rawUrl.slice(0, 100));
    return null;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20_000);

      const res = await fetch(url.toString(), {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        // Do not follow redirects to non-http schemes
        redirect: 'follow',
      });

      clearTimeout(timer);

      // Validate redirect destination is still safe
      const finalUrl = parseSafeUrl(res.url);
      if (!finalUrl) {
        console.warn('[SSRF block] redirect to unsafe URL:', res.url.slice(0, 100));
        return null;
      }

      if (res.ok) return res;
    } catch (err) {
      console.error(`Attempt ${attempt + 1} failed:`, safeError(err));
      if (attempt < retries) await delay(1500 * (attempt + 1));
    }
  }
  return null;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Returns true if submissions are within allowed limits
async function isRateLimited(): Promise<boolean> {
  const windowMs = 60_000; // 1-minute window
  const maxJobs = 5;        // max 5 scraping jobs per minute

  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await supabase
    .from('scraping_jobs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since);

  return (count ?? 0) >= maxJobs;
}

// ── IndiaMART listing page ────────────────────────────────────────────────────
async function scrapeListingPage(city: string, category: string): Promise<string[]> {
  const links = new Set<string>();
  const baseHost = 'dir.indiamart.com';
  const profileHost = 'www.indiamart.com';

  let pageUrl: string | null = `https://${baseHost}/${city}/${category}.html`;
  const MAX_PAGES = 10;

  for (let page = 0; page < MAX_PAGES && pageUrl; page++) {
    const res = await safeFetch(pageUrl);
    if (!res) break;

    const html = await res.text();
    const $ = cheerio.load(html);

    $('a[href]').each((_, el) => {
      const raw = $(el).attr('href') || '';
      if (!raw) return;

      // Resolve relative URLs
      let abs = raw;
      if (raw.startsWith('//')) abs = 'https:' + raw;
      else if (raw.startsWith('/')) abs = `https://${baseHost}${raw}`;

      // Must be a valid, non-private URL
      const safe = parseSafeUrl(abs);
      if (!safe) return;

      // Skip non-http links, directory listing pages we already handle, and utility paths
      if (safe.pathname === '/' || safe.pathname === '') return;
      if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|pdf)$/i.test(safe.pathname)) return;
      if (safe.pathname.startsWith('/search') || safe.pathname.startsWith('/tag')) return;

      // Accept IndiaMART company profile pages or any external site link
      const isProfilePage = safe.hostname === profileHost && safe.pathname.length > 1;
      const isExternal = !safe.hostname.includes('indiamart.com');

      if (isProfilePage || isExternal) links.add(safe.toString());
    });

    // Pagination
    const nextRaw = $('a:contains("Next"), a[rel="next"], .pagination .next a').first().attr('href');
    if (nextRaw && nextRaw !== pageUrl) {
      let next = nextRaw;
      if (next.startsWith('//')) next = 'https:' + next;
      else if (next.startsWith('/')) next = `https://${baseHost}${next}`;
      pageUrl = parseSafeUrl(next)?.toString() ?? null;
    } else {
      pageUrl = null;
    }

    await delay(2000);
  }

  return [...links].slice(0, 200);
}

// ── IndiaMART supplier profile ────────────────────────────────────────────────
async function scrapeSupplierProfile(url: string): Promise<Record<string, unknown>> {
  const res = await safeFetch(url);
  if (!res) return { scrape_status: 'failed', error_message: 'fetch_failed', indiamart_url: url };

  const html = await res.text();
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s{2,}/g, ' ');

  const phones = [...new Set(bodyText.match(PHONE_PATTERN) ?? [])].slice(0, 3);
  const emails = [...new Set(bodyText.match(EMAIL_PATTERN) ?? [])]
    .filter(e => !e.includes('example') && !e.includes('domain') && !e.includes('test@'))
    .slice(0, 3);
  const gsts = [...new Set(bodyText.match(GST_PATTERN) ?? [])];

  const products: string[] = [];
  $('.product-name, .prd-name, .product-title, h3 a, h4 a').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 2 && t.length < 200) products.push(stripHtml(t));
  });

  // Only allow images from IndiaMART's own CDN
  const images: string[] = [];
  $('img[src], img[data-src]').each((_, el) => {
    const raw = $(el).attr('src') || $(el).attr('data-src') || '';
    const abs = raw.startsWith('//') ? 'https:' + raw : raw;
    const safe = parseSafeUrl(abs);
    if (safe && (safe.hostname.endsWith('imimg.com') || safe.hostname.endsWith('indiamart.com'))) {
      images.push(safe.toString());
    }
  });

  let trustSealUrl = '';
  $('a[href*="trustseal"]').each((_, el) => {
    if (trustSealUrl) return;
    const raw = $(el).attr('href') || '';
    const abs = raw.startsWith('//') ? 'https:' + raw : raw;
    const safe = parseSafeUrl(abs);
    if (safe && safe.hostname.includes('trustseal.indiamart.com')) trustSealUrl = safe.toString();
  });

  const getTableVal = (label: string): string => {
    let val = '';
    $('th, td').each((_, el) => {
      if ($(el).text().toLowerCase().includes(label.toLowerCase())) {
        val = $(el).next().text().trim();
        return false;
      }
    });
    return trunc(stripHtml(val), 200);
  };

  return {
    indiamart_url:      url,
    name:               trunc(stripHtml($('h1').first().text().trim() || $('title').text().split(/[-|]/)[0].trim()), 300),
    location:           trunc(stripHtml($('.location, .address, [itemprop="address"]').first().text().trim()), 300),
    phone:              phones.join(', '),
    email:              emails.join(', '),
    gst_number:         gsts[0] ?? '',
    products:           trunc(products.slice(0, 30).join('\n')),
    product_photos:     images.slice(0, 10),
    product_attributes: {},
    about_us:           trunc(stripHtml($('[id*="about"], [class*="about-us"], [class*="aboutUs"]').text().trim())),
    contact_us:         trunc(stripHtml($('[id*="contact"], [class*="contact-us"]').text().trim())),
    nature_of_business: getTableVal('Nature'),
    total_employees:    getTableVal('Employee') || getTableVal('Staff'),
    annual_turnover:    getTableVal('Turnover') || getTableVal('Revenue'),
    iec:                getTableVal('IEC') || (bodyText.match(/\bIEC\s*[:\s]+(\d{10})\b/i)?.[1] ?? ''),
    cin_no:             bodyText.match(/\bCIN\s*[:\s#]+([A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b/i)?.[1] ?? '',
    trust_seal_url:     trustSealUrl,
    source_type:        'indiamart',
    scrape_status:      'completed',
  };
}

// ── Trust Seal ────────────────────────────────────────────────────────────────
async function scrapeTrustSeal(rawUrl: string): Promise<Record<string, unknown>> {
  const safe = parseSafeUrl(rawUrl);
  if (!safe || !safe.hostname.includes('trustseal.indiamart.com')) return {};

  const res = await safeFetch(safe.toString());
  if (!res) return {};

  const html = await res.text();
  const $ = cheerio.load(html);
  const bodyText = $('body').text();
  const gsts = bodyText.match(GST_PATTERN) ?? [];

  return {
    director:         trunc(stripHtml($('td:contains("Director"), td:contains("Proprietor")').next().text().trim()), 200),
    gstin:            gsts[0] ?? '',
    business_address: trunc(stripHtml($('[class*="address"], td:contains("Address")').next().text().trim()), 300),
    verified:         gsts.length > 0,
  };
}

// ── External site scraper ─────────────────────────────────────────────────────
async function scrapeExternalSite(rawUrl: string): Promise<Record<string, unknown>> {
  const safeUrl = parseSafeUrl(rawUrl);
  if (!safeUrl) return { external_url: rawUrl, scrape_status: 'failed', error_message: 'invalid_url' };

  const res = await safeFetch(safeUrl.toString());
  if (!res) return { external_url: rawUrl, scrape_status: 'failed', error_message: 'fetch_failed' };

  const html = await res.text();
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s{2,}/g, ' ');

  const phones = [...new Set(bodyText.match(PHONE_PATTERN) ?? [])].slice(0, 5);
  const emails = [...new Set(bodyText.match(EMAIL_PATTERN) ?? [])]
    .filter(e => !e.includes('example') && !e.includes('domain') && !e.includes('test@'))
    .slice(0, 5);
  const gsts = [...new Set(bodyText.match(GST_PATTERN) ?? [])];

  // Brand
  const brand = trunc(stripHtml(
    $('meta[property="og:site_name"]').attr('content') ||
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text() ||
    $('title').text().split(/[-|–]/)[0]
  ), 300);

  // Tagline
  const tagline = trunc(stripHtml(
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('h2').first().text()
  ), 500);

  // Section extractor: match by id/class keyword, then heading → container
  const findSection = (keywords: string[]): string => {
    for (const kw of keywords) {
      const byAttr = $(`[id*="${kw}"], [class*="${kw}"]`).first().text().trim();
      if (byAttr.length > 30) return trunc(stripHtml(byAttr));

      let found = '';
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        if (found) return false;
        if ($(el).text().toLowerCase().includes(kw)) {
          const container = $(el).closest('section, article, [class], [id]').first();
          found = container.length ? container.text().trim() : $(el).parent().text().trim();
        }
      });
      if (found.length > 30) return trunc(stripHtml(found));
    }
    return '';
  };

  // Products
  const productItems: string[] = [];
  $('[class*="product"] h2, [class*="product"] h3, [class*="product"] h4,' +
    '[class*="service"] h3, [class*="item"] h3, [class*="card"] h3').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 2 && t.length < 200) productItems.push(stripHtml(t));
  });

  // Product images — only from same origin or validated absolute URLs
  const productImages: string[] = [];
  $('[class*="product"] img, [class*="gallery"] img, [class*="item"] img').each((_, el) => {
    const raw = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    let abs = raw;
    if (raw.startsWith('//')) abs = 'https:' + raw;
    else if (raw.startsWith('/')) {
      try { abs = new URL(raw, safeUrl.origin).toString(); } catch { return; }
    }
    const safe = parseSafeUrl(abs);
    if (safe) productImages.push(safe.toString());
  });

  // JSON-LD schema: strictly validated before storing
  const productAttributes: Record<string, string> = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() || '';
      // Guard: JSON-LD should not exceed 50 KB
      if (raw.length > 50_000) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;

      const allowedTypes = ['Product', 'Organization', 'LocalBusiness', 'WebPage'];
      if (!allowedTypes.includes(data['@type'])) return;

      // Only store string scalars — never arrays or nested objects as-is
      if (typeof data.name === 'string')        productAttributes['schema_name']        = trunc(stripHtml(data.name), 200);
      if (typeof data.description === 'string') productAttributes['schema_description'] = trunc(stripHtml(data.description), 500);
      if (typeof data.telephone === 'string')   productAttributes['schema_telephone']   = data.telephone.replace(/[^\d\s+\-()]/g, '').slice(0, 20);
    } catch {
      // malformed JSON-LD — silently skip
    }
  });

  // Social links — only standard platforms
  const socialLinks: Record<string, string> = {};
  const SOCIAL_PLATFORMS: [string, string][] = [
    ['linkedin', 'linkedin.com'],
    ['facebook', 'facebook.com'],
    ['twitter', 'twitter.com'],
    ['instagram', 'instagram.com'],
  ];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const [key, domain] of SOCIAL_PLATFORMS) {
      if (!socialLinks[key] && href.includes(domain)) {
        const safe = parseSafeUrl(href);
        if (safe) socialLinks[key] = safe.toString();
      }
    }
  });

  // Address block
  const address = trunc(stripHtml(
    $('[itemtype*="PostalAddress"], address, [class*="address"]').first().text().trim()
  ), 300);

  const aboutText       = findSection(['about', 'who-we-are', 'our-story']);
  const testimonialText = findSection(['testimonial', 'review', 'feedback']);
  const contactText     = findSection(['contact', 'reach-us', 'get-in-touch']);
  const productText     = productItems.length > 0
    ? productItems.slice(0, 30).join('\n')
    : findSection(['products', 'services', 'our-products']);

  return {
    external_url:        safeUrl.toString(),
    website:             safeUrl.toString(),
    name:                brand,
    location:            address,
    phone:               phones.join(', '),
    email:               emails.join(', '),
    gst_number:          gsts[0] ?? '',
    products:            trunc(productText),
    product_photos:      productImages.slice(0, 10),
    product_attributes:  { ...productAttributes, social: socialLinks },
    about_us:            trunc(aboutText),
    contact_us:          trunc(contactText),
    testimonials:        trunc(testimonialText),
    source_type:         'external',
    tagline:             tagline,
    scrape_status:       'completed',
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 10_000) {
      return new Response(JSON.stringify({ error: 'Request body too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action } = body;

  // ── action: start ──────────────────────────────────────────────────────────
  if (action === 'start') {
    const city     = sanitiseSlug(typeof body.city     === 'string' ? body.city     : '');
    const category = sanitiseSlug(typeof body.category === 'string' ? body.category : '');

    if (!city || !category) {
      return new Response(JSON.stringify({ error: 'city and category are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit check
    if (await isRateLimited()) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait before starting another job.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .insert({ city, category, status: 'processing', started_at: new Date().toISOString() })
      .select()
      .single();

    if (jobError) {
      return new Response(JSON.stringify({ error: 'Failed to create job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Run scraping asynchronously
    (async () => {
      try {
        const links = await scrapeListingPage(city, category);

        await supabase.from('scraping_jobs')
          .update({ total_suppliers: links.length })
          .eq('id', job.id);

        let processed = 0;
        for (const link of links) {
          await delay(2000);

          await supabase.from('scraping_jobs').update({
            current_url: link.slice(0, 500),
            processed_suppliers: processed,
          }).eq('id', job.id);

          try {
            let data: Record<string, unknown>;
            const isIndiaMART = link.includes('indiamart.com');

            if (isIndiaMART) {
              data = await scrapeSupplierProfile(link);
              if (typeof data.trust_seal_url === 'string' && data.trust_seal_url) {
                const tsData = await scrapeTrustSeal(data.trust_seal_url);
                data.trust_seal_data = tsData;
                if (tsData.gstin && !data.gst_number) data.gst_number = tsData.gstin;
              }
            } else {
              data = await scrapeExternalSite(link);
            }

            if (data.scrape_status === 'completed') {
              await supabase.from('suppliers').insert({ ...data });
            }
          } catch {
            // Never surface internal errors to the job record
          }

          processed++;
        }

        await supabase.from('scraping_jobs').update({
          status: 'completed',
          processed_suppliers: processed,
          completed_at: new Date().toISOString(),
          current_url: null,
        }).eq('id', job.id);
      } catch {
        await supabase.from('scraping_jobs').update({
          status: 'failed',
          error_message: 'Job encountered an error. Check server logs.',
        }).eq('id', job.id);
      }
    })();

    return new Response(JSON.stringify({ success: true, jobId: job.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── action: scrape-single ──────────────────────────────────────────────────
  if (action === 'scrape-single') {
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const safeUrl = parseSafeUrl(rawUrl);

    if (!safeUrl) {
      return new Response(JSON.stringify({ error: 'Invalid or blocked URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isTrustSeal  = safeUrl.hostname.includes('trustseal.indiamart.com');
    const isIndiaMART  = safeUrl.hostname.includes('indiamart.com');

    let data: Record<string, unknown>;
    if (isTrustSeal) {
      data = await scrapeTrustSeal(safeUrl.toString());
    } else if (isIndiaMART) {
      data = await scrapeSupplierProfile(safeUrl.toString());
    } else {
      data = await scrapeExternalSite(safeUrl.toString());
    }

    if (data.scrape_status === 'completed') {
      await supabase.from('suppliers').insert({ ...data });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
