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

export const useActiveJobs = (userId: string): UseActiveJobsResult => {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [hasCompletedJobs, setHasCompletedJobs] = useState(false);
  const lastCheckRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const resetCompletedJobsFlag = useCallback(() => {
    setHasCompletedJobs(false);
  }, []);

  const checkActiveJobs = useCallback(async () => {
    if (!userId || inFlightRef.current) return;

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
    }
  }, [userId]);

  // Check active jobs on mount
  useEffect(() => {
    checkActiveJobs();
  }, [checkActiveJobs]);

  // Check for completed jobs when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      checkActiveJobs();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkActiveJobs]);

  // Periodic check for active jobs
  useEffect(() => {
    if (activeJobs.some(job => job.status === 'processing' || job.status === 'pending')) {
      const interval = setInterval(checkActiveJobs, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeJobs, checkActiveJobs]);

  return {
    activeJobs,
    checkActiveJobs,
    hasCompletedJobs,
    resetCompletedJobsFlag,
  };
};
