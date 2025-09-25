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

  const resetCompletedJobsFlag = useCallback(() => {
    setHasCompletedJobs(false);
  }, []);

  const checkActiveJobs = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-active-jobs', {
        body: { userId }
      });

      if (error) throw error;

      const jobs = data?.jobs || [];
      setActiveJobs(jobs);

      // Check if any jobs were completed since last check
      const completedJobIds = jobs
        .filter((job: ActiveJob) => job.status === 'completed')
        .map((job: ActiveJob) => job.id);

      const newlyCompleted = completedJobIds.filter(
        (id: string) => !lastCheckRef.current.has(id)
      );

      if (newlyCompleted.length > 0) {
        setHasCompletedJobs(true);
      }

      // Update last check to include all current job IDs
      lastCheckRef.current = new Set([
        ...jobs.map((job: ActiveJob) => job.id)
      ]);

    } catch (error: any) {
      console.error('Error checking active jobs:', error);
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