import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Supplier, ScrapingJob } from '../types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-indiamart`;

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (fetchError) throw fetchError;
      setSuppliers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();

    const channel = supabase
      .channel('suppliers-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'suppliers' },
        (payload) => {
          setSuppliers((prev) => [payload.new as Supplier, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'suppliers' },
        (payload) => {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === payload.new.id ? (payload.new as Supplier) : s))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSuppliers]);

  return { suppliers, isLoading, error, refetch: fetchSuppliers };
}

export function useScraping() {
  const [isScraping, setIsScraping] = useState(false);
  const [currentJob, setCurrentJob] = useState<ScrapingJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const startScraping = useCallback(async (city: string, category: string): Promise<boolean> => {
    try {
      setIsScraping(true);
      setIsPolling(true);

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'start',
          city,
          category,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start scraping');
      }

      const result = await response.json();

      if (result.jobId) {
        await pollJobStatus(result.jobId);
      }

      return true;
    } catch (error) {
      console.error('Scraping error:', error);
      setIsPolling(false);
      setIsScraping(false);
      throw error;
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: number) => {
    let attempts = 0;
    const maxAttempts = 600; // 10 minutes max

    const poll = async () => {
      try {
        const { data: job, error } = await supabase
          .from('scraping_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;
        setCurrentJob(job);

        if (job.status === 'completed' || job.status === 'failed') {
          setIsScraping(false);
          setIsPolling(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsScraping(false);
          setIsPolling(false);
        }
      } catch (err) {
        console.error('Poll error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsScraping(false);
          setIsPolling(false);
        }
      }
    };

    await poll();
  }, []);

  const scrapeSingleUrl = useCallback(async (url: string): Promise<Record<string, any>> => {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'scrape-single',
        url,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to scrape URL');
    }

    return response.json();
  }, []);

  return {
    isScraping,
    isPolling,
    currentJob,
    startScraping,
    scrapeSingleUrl,
  };
}

export function useJobs() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('scraping_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setJobs(data || []);
      setIsLoading(false);
    };

    fetchJobs();
  }, []);

  return { jobs, isLoading };
}
