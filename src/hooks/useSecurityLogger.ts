import { supabase } from "@/integrations/supabase/client";

interface SecurityEventParams {
  eventType: string;
  eventDescription: string;
  userId?: string;
  metadata?: any;
}

export const useSecurityLogger = () => {
  const logSecurityEvent = async ({
    eventType,
    eventDescription,
    userId,
    metadata = {}
  }: SecurityEventParams) => {
    try {
      // Call the security logger edge function
      const { error } = await supabase.functions.invoke('security-logger', {
        body: {
          eventType,
          eventDescription,
          userId,
          metadata
        }
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  const logLoginAttempt = async (email: string, success: boolean, error?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    await logSecurityEvent({
      eventType: success ? 'login_success' : 'login_failed',
      eventDescription: success 
        ? `Successful login for ${email}`
        : `Failed login attempt for ${email}: ${error || 'Unknown error'}`,
      userId: success ? user?.id : undefined,
      metadata: { email, error }
    });
  };

  const logTokenUsage = async (userId: string, tokensUsed: number, generationType: string) => {
    await logSecurityEvent({
      eventType: 'token_spent',
      eventDescription: `User spent ${tokensUsed} tokens for ${generationType}`,
      userId,
      metadata: { tokensUsed, generationType }
    });
  };

  const logSuspiciousActivity = async (
    userId: string | undefined,
    activityType: string,
    description: string,
    metadata?: any
  ) => {
    await logSecurityEvent({
      eventType: activityType,
      eventDescription: description,
      userId,
      metadata
    });
  };

  return {
    logSecurityEvent,
    logLoginAttempt,
    logTokenUsage,
    logSuspiciousActivity
  };
};