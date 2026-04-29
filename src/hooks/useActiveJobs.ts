import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveJob {
  id: string;
  status: string;
  completed_cards: number;
  total_cards: number;
  created_at: string;
}

interface UseActiveJobsResult {
  activeJobs: ActiveJob[];
  checkActiveJobs: () => Promise<void>;
  hasCompletedJobs: boolean;
  resetCompletedJobsFlag: () => void;
}

// Fallback polling interval. Realtime is the primary signal — polling only
// catches missed events (WS drops, RU networks blocking upgrades, etc.).
const FALLBACK_POLL_MS = 30000;
// Coalesce bursts of task updates (a single job can fire many task events at once).
const REFRESH_DEBOUNCE_MS = 500;

export const useActiveJobs = (userId: string): UseActiveJobsResult => {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [hasCompletedJobs, setHasCompletedJobs] = useState(false);
  const lastCheckRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetCompletedJobsFlag = useCallback(() => {
    setHasCompletedJobs(false);
  }, []);

  const checkActiveJobs = useCallback(async () => {
    if (!userId) return;
    if (inFlightRef.current) {
      // Another fetch is in flight — remember that we got a fresh signal so we
      // re-fetch immediately after the current request finishes.
      pendingRefreshRef.current = true;
      return;
    }

    try {
      inFlightRef.current = true;
      const { data, error } = await supabase.functions.invoke('get-active-jobs', {
        body: { userId }
      });

      if (error) throw error;

      const jobs = data?.jobs || [];
      setActiveJobs(jobs);

      // This endpoint returns only pending/processing jobs.
      // If a previously active job disappears from the response, it likely moved
      // to completed/failed and the history tab should refresh.
      const currentIds = new Set<string>(jobs.map((job: ActiveJob) => job.id));
      const disappearedIds = [...lastCheckRef.current].filter(
        (id: string) => !currentIds.has(id)
      );

      if (disappearedIds.length > 0) {
        setHasCompletedJobs(true);
      }

      lastCheckRef.current = currentIds;
    } catch (error: any) {
      console.error('Error checking active jobs:', error);
    } finally {
      inFlightRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        // Schedule the follow-up via debounce so we keep coalescing bursts.
        scheduleRefresh();
      }
    }
  }, [userId]);

  // Debounced trigger used by realtime callbacks to avoid hammering the
  // edge function when many task rows update in quick succession.
  const scheduleRefresh = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      checkActiveJobs();
    }, REFRESH_DEBOUNCE_MS);
  }, [checkActiveJobs]);

  // Initial fetch on mount / when userId changes.
  useEffect(() => {
    checkActiveJobs();
  }, [checkActiveJobs]);

  // Refresh on window focus (cheap and catches any missed events).
  useEffect(() => {
    const handleFocus = () => checkActiveJobs();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkActiveJobs]);

  // Realtime subscription — primary mechanism.
  // WebSocket connects to wss://<supabase-url>/realtime/v1/websocket, which
  // resolves to wss://api.wbgen.ru/... thanks to the runtime URL guard +
  // Caddy reverse proxy (h1+h2 with implicit Upgrade support).
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`active-jobs:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_jobs',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefresh()
      )
      .on(
        'postgres_changes',
        {
          // generation_tasks has no user_id column — we can't filter server-side
          // by user. We accept all task changes and let the edge function
          // re-scope to this user. Volume is low because it only fires while
          // the user has active jobs.
          event: '*',
          schema: 'public',
          table: 'generation_tasks',
        },
        () => {
          // Only refresh if we currently believe there are active jobs for
          // this user — otherwise this event is for somebody else.
          if (lastCheckRef.current.size > 0) scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [userId, scheduleRefresh]);

  // Fallback polling — only while there are active jobs, and at a relaxed
  // 30s cadence since realtime should already be delivering updates.
  useEffect(() => {
    if (!activeJobs.some(job => job.status === 'processing' || job.status === 'pending')) {
      return;
    }
    const interval = setInterval(checkActiveJobs, FALLBACK_POLL_MS);
    return () => clearInterval(interval);
  }, [activeJobs, checkActiveJobs]);

  return {
    activeJobs,
    checkActiveJobs,
    hasCompletedJobs,
    resetCompletedJobsFlag,
  };
};
