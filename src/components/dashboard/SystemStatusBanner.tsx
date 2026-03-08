import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type SystemStatus = 'none' | 'green' | 'yellow' | 'red';

interface StatusData {
  status: SystemStatus;
  message: string;
  subtitle: string;
}

const statusConfig = {
  green: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    iconColor: 'text-emerald-500',
    defaultMessage: 'Все системы работают нормально',
  },
  yellow: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-500',
    defaultMessage: 'Сервера загружены, возможны задержки при генерации',
  },
  red: {
    icon: XCircle,
    bg: 'bg-destructive/10 border-destructive/20',
    text: 'text-destructive',
    iconColor: 'text-destructive',
    defaultMessage: 'Сервера перегружены, генерация может не работать',
  },
};

export const SystemStatusBanner = () => {
  const [statusData, setStatusData] = useState<StatusData | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await (supabase as any)
        .from('system_status')
        .select('status, message')
        .limit(1)
        .single();

      if (!error && data && data.status !== 'none') {
        setStatusData(data);
      }
    };

    fetchStatus();
  }, []);

  if (!statusData || statusData.status === 'none') return null;

  const config = statusConfig[statusData.status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;
  const displayMessage = statusData.message || config.defaultMessage;

  return (
    <div className={`w-full mb-4 md:mb-6 rounded-xl border px-4 py-3 flex items-center gap-3 ${config.bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} />
      <p className={`text-sm font-medium ${config.text}`}>{displayMessage}</p>
    </div>
  );
};
