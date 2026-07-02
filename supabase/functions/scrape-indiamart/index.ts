import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // replace with your domain in production
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// … all your helper functions (regex, safeFetch, scrapeListingPage, scrapeSupplierProfile, scrapeTrustSeal, scrapeExternalSite) remain unchanged …

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 10_000) {
      return new Response(JSON.stringify({ error: 'Request body too large' }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (await isRateLimited()) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait before starting another job.' }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            // swallow errors
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── action: scrape-single ──────────────────────────────────────────────────
  if (action === 'scrape-single') {
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const safeUrl = parseSafeUrl(rawUrl);

    if (!safeUrl) {
      return new Response(JSON.stringify({ error: 'Invalid or blocked URL' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
