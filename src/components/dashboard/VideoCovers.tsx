import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getProxiedPublicUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { Upload, Video, Download, Loader2, AlertTriangle, X, Play, Clock, Sparkles, TrendingUp, Zap, Eye, Info, RefreshCw, ExternalLink, Coins, HelpCircle, ShieldCheck, ArrowRight, MousePointerClick } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useActiveAiModel, getVideoEdgeFunctionName } from "@/hooks/useActiveAiModel";
import { CollapsibleInfoBlock } from "@/components/dashboard/CollapsibleInfoBlock";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface VideoJob {
  id: string;
  status: string;
  product_image_url: string;
  video_url: string | null;
  error_message: string | null;
  tokens_cost: number;
  created_at: string;
  user_prompt?: string | null;
}

interface VideoCoversProps {
  profile: Profile;
  onTokensUpdate: () => void;
  onNavigate?: (tab: string) => void;
  preAttachedImageUrl?: string | null;
  onPreAttachedImageConsumed?: () => void;
}

const ESTIMATED_TIME_SECONDS = 60; // 1 minute
const MAX_WAIT_SECONDS = 8 * 60; // 8 minutes absolute max

const WAITING_MESSAGES = [
  "Ещё чуть-чуть, ИИ дорабатывает детали…",
  "Почти готово! Финальные штрихи…",
  "Нейросеть старается сделать идеально…",
  "Скоро будет готово, подождите немного…",
  "Обработка занимает чуть больше времени…",
  "ИИ создаёт плавную анимацию — это требует времени…",
];

const UPLOAD_MESSAGES = [
  "Загружаем изображение на сервер…",
  "Подготавливаем файл для обработки…",
];

export function VideoCovers({ profile, onTokensUpdate, onNavigate, preAttachedImageUrl, onPreAttachedImageConsumed }: VideoCoversProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null);
  const [history, setHistory] = useState<VideoJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { price: videoCost, isLoading: priceLoading } = useGenerationPrice("video_generation");
  const { price: regenCost } = useGenerationPrice("video_regeneration");
  const [regenPrompt, setRegenPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenAutoOptimize, setRegenAutoOptimize] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const AUTO_PROMPT_TEXT = "Самостоятельно придумай и определи наилучшие параметры анимации для достижения максимально качественного результата.";
  
  const { data: aiModelData } = useActiveAiModel();
  const provider = aiModelData?.videoProvider;

  // localStorage keys for collapsible info blocks (persisted hide/show)
  const VIDEO_HERO_KEY = `video_hero_block_hidden_${profile.id}`;
  const VIDEO_PROMO_KEY = `video_promo_banner_dismissed_${profile.id}`;

  // Load history and resume active jobs on mount
  useEffect(() => {
    loadHistoryAndResume();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle pre-attached image from card generation
  useEffect(() => {
    if (preAttachedImageUrl) {
      // Set image preview from URL (no File object needed for display)
      setImagePreview(preAttachedImageUrl);
      // We don't have a File object, but we can fetch and create one
      fetch(preAttachedImageUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'cover-image.jpg', { type: blob.type || 'image/jpeg' });
          setSelectedImage(file);
        })
        .catch(err => console.error('Error fetching pre-attached image:', err));
      onPreAttachedImageConsumed?.();
    }
  }, [preAttachedImageUrl]);

  // Elapsed timer
  useEffect(() => {
    const isActive = isUploading || isGenerating || (currentJob && (currentJob.status === "processing" || currentJob.status === "pending"));
    if (isActive) {
      const startTime = generationStartTime || Date.now();
      if (!generationStartTime) setGenerationStartTime(startTime);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);

        // Rotate waiting messages every 20 seconds after 4 min
        if (elapsed > ESTIMATED_TIME_SECONDS) {
          const msgIdx = Math.floor((elapsed - ESTIMATED_TIME_SECONDS) / 20) % WAITING_MESSAGES.length;
          setWaitingMessageIndex(msgIdx);
        }

        // Timeout at 8 minutes — reset
        if (elapsed >= MAX_WAIT_SECONDS) {
          handleTimeout();
        }
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setElapsedSeconds(0);
      setGenerationStartTime(null);
      setWaitingMessageIndex(0);
    }
  }, [isUploading, isGenerating, currentJob?.status]);

  const handleTimeout = () => {
    // Don't timeout if job already completed
    if (currentJob?.status === "completed" || currentJob?.status === "failed") return;
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsGenerating(false);
    setIsUploading(false);
    setCurrentJob(null);
    setElapsedSeconds(0);
    setGenerationStartTime(null);
    onTokensUpdate();
    toast({
      title: "Превышено время ожидания",
      description: "Генерация заняла слишком много времени. Токены будут возвращены, если результат не будет получен.",
      variant: "destructive",
    });
  };

  const remainingSeconds = Math.max(0, ESTIMATED_TIME_SECONDS - elapsedSeconds);
  const isInExtendedWait = elapsedSeconds > ESTIMATED_TIME_SECONDS;
  const progressPercent = Math.min(100, (elapsedSeconds / ESTIMATED_TIME_SECONDS) * 100);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Only refreshes history list, does NOT resume polling or set active job
  const refreshHistory = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("video_generation_jobs")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading video history:", error);
    }
  };

  // Full load: refresh history + resume active jobs (only on mount)
  const loadHistoryAndResume = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("video_generation_jobs")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);

      const activeJob = data?.find((j: VideoJob) => j.status === "processing" || j.status === "pending");
      if (activeJob) {
        const elapsed = Math.floor((Date.now() - new Date(activeJob.created_at).getTime()) / 1000);
        if (elapsed >= MAX_WAIT_SECONDS) return;

        // Immediately check actual status before showing loading UI
        try {
          const checkFn = getVideoEdgeFunctionName("check-video-status", provider);
          const { data: statusData } = await supabase.functions.invoke(checkFn, {
            body: { job_id: activeJob.id },
          });
          if (statusData?.status === "completed") {
            setCurrentJob({ ...activeJob, status: "completed", video_url: statusData.video_url });
            refreshHistory();
            return;
          } else if (statusData?.status === "failed") {
            setCurrentJob({ ...activeJob, status: "failed", error_message: statusData.error_message });
            return;
          }
        } catch (e) {
          // Status check failed, proceed with polling
        }

        setCurrentJob(activeJob);
        setIsGenerating(true);
        setElapsedSeconds(elapsed);
        setGenerationStartTime(Date.now() - elapsed * 1000);
        startPolling(activeJob.id);
      }
    } catch (error) {
      console.error("Error loading video history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Ошибка", description: "Выберите изображение", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ошибка", description: "Максимальный размер файла — 5 МБ", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startPolling = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const checkFn = getVideoEdgeFunctionName("check-video-status", provider);
        const { data, error } = await supabase.functions.invoke(checkFn, {
          body: { job_id: jobId },
        });

        if (error) {
          console.error("Polling error:", error);
          return;
        }

        if (data.status === "completed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCurrentJob((prev) => prev ? { ...prev, status: "completed", video_url: data.video_url } : null);
          setIsGenerating(false);
          onTokensUpdate();
          refreshHistory();
          toast({ title: "Видео готово! 🎬", description: "Видеообложка успешно сгенерирована" });
        } else if (data.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCurrentJob((prev) => prev ? { ...prev, status: "failed", error_message: data.error_message } : null);
          setIsGenerating(false);
          onTokensUpdate();
          refreshHistory();
          toast({
            title: "Ошибка генерации",
            description: "Генерация видео не удалась. Токены возвращены на баланс.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Polling exception:", err);
      }
    }, 10000);
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;

    if (profile.tokens_balance < videoCost) {
      toast({
        title: "Недостаточно токенов",
        description: `Для генерации видео нужно ${videoCost} токенов. Пополните баланс.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);

    try {
      const fileExt = selectedImage.name.split(".").pop();
      const fileName = `${profile.id}/video-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("generation-images")
        .upload(fileName, selectedImage, { contentType: selectedImage.type });

      if (uploadError) throw uploadError;

      const imageUrl = getProxiedPublicUrl("generation-images", fileName);

      setIsUploading(false);
      setIsGenerating(true);
      setGenerationStartTime(Date.now());
      setElapsedSeconds(0);

      const createFn = getVideoEdgeFunctionName("create-video-job", provider);
      const { data, error } = await supabase.functions.invoke(createFn, {
        body: { image_url: imageUrl, user_prompt: userPrompt.trim() || undefined },
      });

      if (error) throw error;

      if (data.error) {
        if (data.refunded) {
          toast({
            title: "Ошибка",
            description: "Не удалось создать видео. Токены возвращены.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Ошибка", description: "Не удалось создать видео. Попробуйте позже", variant: "destructive" });
        }
        setIsGenerating(false);
        onTokensUpdate();
        return;
      }

      const newJob: VideoJob = {
        id: data.job_id,
        status: "processing",
        product_image_url: imageUrl,
        video_url: null,
        error_message: null,
        tokens_cost: videoCost,
        created_at: new Date().toISOString(),
      };

      setCurrentJob(newJob);
      onTokensUpdate();
      startPolling(data.job_id);
      removeImage();
      setUserPrompt("");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать задачу. Попробуйте позже",
        variant: "destructive",
      });
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  const downloadVideo = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `video-cover-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleRegenerate = async () => {
    if (!currentJob) return;
    if (profile.tokens_balance < regenCost) {
      toast({
        title: "Недостаточно токенов",
        description: `Для перегенерации нужно ${regenCost} токенов. Пополните баланс.`,
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);

    try {
      const regenFn = getVideoEdgeFunctionName("regenerate-video-job", provider);
      const { data, error } = await supabase.functions.invoke(regenFn, {
        body: { original_job_id: currentJob.id, user_prompt: regenPrompt.trim() || undefined },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Ошибка",
          description: data.refunded ? "Не удалось перегенерировать видео. Токены возвращены." : "Не удалось перегенерировать видео",
          variant: "destructive",
        });
        setIsRegenerating(false);
        onTokensUpdate();
        return;
      }

      const newJob: VideoJob = {
        id: data.job_id,
        status: "processing",
        product_image_url: currentJob.product_image_url,
        video_url: null,
        error_message: null,
        tokens_cost: regenCost,
        created_at: new Date().toISOString(),
      };

      setCurrentJob(newJob);
      setIsRegenerating(false);
      setIsGenerating(true);
      setRegenPrompt("");
      setRegenAutoOptimize(false);
      onTokensUpdate();
      startPolling(data.job_id);
    } catch (error: any) {
      console.error("Regeneration error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось перегенерировать видео. Попробуйте позже",
        variant: "destructive",
      });
      setIsRegenerating(false);
    }
  };

  const isProcessing = isUploading || isGenerating || isRegenerating;
  const hasActiveJob = currentJob && (currentJob.status === "processing" || currentJob.status === "pending");

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden px-2 sm:px-0">

      {/* Hero — conversion-focused */}
      <CollapsibleInfoBlock storageKey={VIDEO_HERO_KEY} collapsedLabel="Подробнее о видеообложках">
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-card">
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-violet-500/15 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="relative p-5 sm:p-6 pr-12 sm:pr-14">
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-violet-700 dark:text-violet-300">Видео, которое продаёт</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                  Живые обложки с <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">+35% к CTR</span> за 2 минуты
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Загрузите фото товара — ИИ создаст плавную 5-секундную анимацию премиального уровня, которая выделит карточку в выдаче маркетплейса.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">+35% к CTR</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">за счёт анимации</p>
                    </div>
                  </div>
                </div>

                <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">~2 минуты</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">вместо часов работы</p>
                    </div>
                  </div>
                </div>

                <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">Выделение</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">в выдаче среди других</p>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleInfoBlock>


      <CollapsibleInfoBlock storageKey={VIDEO_PROMO_KEY} mode="dismiss" collapsedLabel="Посмотреть примеры генераций">
        <div
          className="group relative isolate overflow-hidden rounded-2xl border border-violet-500/20 bg-card hover:border-violet-500/35 transition-colors"
        >
          {/* Ambient drifting accents (stay inside bounds via overflow-hidden) */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-violet-500/[0.10] blur-3xl"
            animate={{ x: [0, 18, 0], y: [0, 10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-fuchsia-500/[0.08] blur-3xl"
            animate={{ x: [0, -14, 0], y: [0, -8, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Soft shimmer sweep, clipped by parent */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-shimmer"
          />

          <div className="relative z-10 p-4 sm:p-5 pr-12 sm:pr-14">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5">
              {/* Left: copy (icon hidden on mobile) */}
              <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0 lg:pr-4">
                <div className="shrink-0 hidden sm:flex w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20 items-center justify-center">
                  <Eye className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <h3 className="text-[15px] sm:text-base font-semibold leading-tight">
                      Посмотреть примеры генераций
                    </h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      <Sparkles className="w-2.5 h-2.5" />
                      Полезно
                    </span>
                  </div>
                  <p className="text-[12.5px] sm:text-sm text-muted-foreground leading-relaxed">
                    Перед пополнением баланса и генерацией — посмотрите реальные работы пользователей и результаты, которых они достигают.
                  </p>

                  {/* Benefit chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="w-3 h-3" />
                      Реальные кейсы
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                      <Clock className="w-3 h-3" />
                      30 секунд на просмотр
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[11px] font-medium text-foreground/80">
                      <ShieldCheck className="w-3 h-3" />
                      Без обязательств
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: CTAs */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto lg:min-w-[200px] lg:shrink-0">
                <Button
                  asChild
                  size="sm"
                  className="group/btn h-9 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm shadow-violet-500/20 font-medium text-xs"
                >
                  <a href="/video-generaciya" target="_blank" rel="noopener noreferrer">
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Посмотреть примеры
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
                  </a>
                </Button>
                {onNavigate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate("pricing")}
                    className="h-9 rounded-lg border-violet-500/25 bg-transparent hover:bg-violet-500/[0.06] hover:border-violet-500/45 hover:text-foreground text-xs font-medium"
                  >
                    <Coins className="w-3.5 h-3.5 mr-1.5" />
                    Пополнить баланс
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleInfoBlock>



      {/* Processing / Result */}
      <AnimatePresence mode="wait">
      {(isProcessing || currentJob) && (
        <motion.div
          key="processing"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
        <Card className={`relative overflow-hidden rounded-2xl ${
          (isProcessing || hasActiveJob) && !(currentJob?.status === "completed" || currentJob?.status === "failed")
            ? "border-violet-500/30 bg-card"
            : "border-border/60 bg-card"
        }`}>
          {(isProcessing || hasActiveJob) && !(currentJob?.status === "completed" || currentJob?.status === "failed") && (
            <>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 80% 50% at var(--glow-x, 30%) 100%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
                animation: 'glow-drift 6s ease-in-out infinite alternate',
              }} />
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 70% 45% at var(--glow-x2, 70%) 0%, hsl(280 80% 70% / 0.10) 0%, transparent 65%)',
                animation: 'glow-drift-top 8s ease-in-out infinite alternate',
              }} />
            </>
          )}
          <CardContent className="relative z-10 p-4 sm:p-6 space-y-5">
            {/* Active processing (upload OR generation) */}
            {(isProcessing || hasActiveJob) && !(currentJob?.status === "completed" || currentJob?.status === "failed") && (
              <>
                {/* Header: spinner + title + timer */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-md animate-pulse" />
                    <div className="relative w-11 h-11 rounded-full border-[3px] border-violet-500/20 border-t-violet-500 animate-spin" />
                    {(isUploading || (isGenerating && !hasActiveJob))
                      ? <Upload className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-violet-600 dark:text-violet-300" />
                      : <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-violet-600 dark:text-violet-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {(isUploading || (isGenerating && !hasActiveJob)) ? (
                      <>
                        <p className="font-semibold text-sm sm:text-base">Подготовка к генерации…</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">Загружаем изображение и рассчитываем параметры</p>
                      </>
                    ) : !isInExtendedWait ? (
                      <>
                        <p className="font-semibold text-sm sm:text-base">Генерация видеообложки</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Можно переключиться на другие вкладки — мы продолжим в фоне</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-sm sm:text-base">Генерация видеообложки</p>
                        <p className="text-xs sm:text-sm text-violet-600 dark:text-violet-300">{WAITING_MESSAGES[waitingMessageIndex]}</p>
                      </>
                    )}
                  </div>
                  {hasActiveJob && !isUploading && !isInExtendedWait && (
                    <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/5 border border-violet-500/30 text-violet-700 dark:text-violet-300">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs sm:text-sm font-bold tabular-nums">{formatTime(remainingSeconds)}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full space-y-1.5">
                  <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden shadow-inner">
                    {(isUploading || (isGenerating && !hasActiveJob)) ? (
                      <div
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full shadow-sm shadow-violet-500/40"
                        style={{ animation: 'indeterminate-slide 1.6s ease-in-out infinite' }}
                      />
                    ) : (
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-1000 ease-linear shadow-sm shadow-violet-500/40"
                        style={{ width: `${Math.min(progressPercent, 95)}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>{(isUploading || (isGenerating && !hasActiveJob)) ? 'Подготовка…' : 'Создаём анимацию'}</span>
                    <span className="tabular-nums">{(isUploading || (isGenerating && !hasActiveJob)) ? '' : isInExtendedWait ? 'Финализация…' : `${Math.round(progressPercent)}%`}</span>
                  </div>
                </div>

                {/* Info hint */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <AlertTriangle className="h-4 w-4 text-violet-500/70 shrink-0 mt-0.5" />
                  <span className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Генерация проходит в фоновом режиме. Если результат не понравится — вы сможете перегенерировать видео за {regenCost} токенов.
                  </span>
                </div>
              </>
            )}

            {/* Completed video */}
            {currentJob?.status === "completed" && currentJob.video_url && (
              <div className="space-y-3 sm:space-y-4 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 right-0 h-8 w-8 rounded-full hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 z-10"
                  onClick={() => setCurrentJob(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold text-sm sm:text-base">Видео готово</span>
                </div>
                <video
                  src={currentJob.video_url}
                  controls
                  autoPlay
                  muted
                  loop
                  className="w-full max-w-md mx-auto rounded-xl border border-border"
                  style={{ aspectRatio: "3/4" }}
                />
                <div className="flex flex-col xs:flex-row justify-center gap-2 sm:gap-3">
                  <Button
                    onClick={() => downloadVideo(currentJob.video_url!)}
                    size="lg"
                    className="gap-2 w-full xs:w-auto rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Скачать видео
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentJob(null)}
                    className="gap-2 w-full xs:w-auto rounded-lg border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 hover:text-violet-700 hover:border-violet-500/50"
                  >
                    <Video className="h-4 w-4" />
                    Сгенерировать новое
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  Результат сохранён на странице «История генераций»
                </p>

                {/* Regeneration block */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                      Не нравится результат?
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Вы можете перегенерировать видео за {regenCost} токенов. Фото останется прежним, но вы можете изменить описание пожеланий.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      value={regenPrompt}
                      onChange={(e) => { if (e.target.value.length <= 150) setRegenPrompt(e.target.value); }}
                      placeholder="Опишите пожелания к анимации"
                      className="min-h-[60px] text-sm rounded-lg"
                      maxLength={150}
                      disabled={isRegenerating || regenAutoOptimize}
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !regenAutoOptimize;
                          setRegenAutoOptimize(next);
                          setRegenPrompt(next ? AUTO_PROMPT_TEXT : "");
                        }}
                        disabled={isRegenerating}
                        className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
                          regenAutoOptimize
                            ? "bg-violet-500/10 border border-violet-500/30 text-violet-700 dark:text-violet-300"
                            : "bg-muted/40 border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Придумай сам
                      </button>
                      <span className={`text-xs ${regenPrompt.length >= 150 ? 'text-destructive' : 'text-muted-foreground'}`}>{regenPrompt.length}/150</span>
                    </div>
                    <Button
                      onClick={handleRegenerate}
                      disabled={isRegenerating || (!regenPrompt.trim() && !regenAutoOptimize)}
                      size="lg"
                      className="gap-2 w-full sm:w-auto rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Перегенерировать
                      <Badge className="ml-1 bg-white/20 text-white border-white/30 hover:bg-white/20">
                        {regenCost} ток.
                      </Badge>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Failed job */}
            {currentJob?.status === "failed" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                  <p className="text-sm text-destructive font-medium">
                    Ошибка: {currentJob.error_message || "Неизвестная ошибка"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Токены возвращены на баланс</p>
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentJob(null)}
                    className="rounded-lg border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 hover:text-violet-700 hover:border-violet-500/50"
                  >
                    Попробовать снова
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Upload zone and form - only when no active job */}
      {!currentJob && !isProcessing && (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Block 1: Upload */}
          <Card className="relative overflow-hidden border-border/60 bg-card rounded-2xl">
            <CardHeader className="relative">
              <div className="flex items-start gap-3">
                <div className="hidden lg:flex shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 items-center justify-center">
                  <Upload className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <span>Карточка товара</span>
                    <span className="absolute top-2.5 right-3 z-10 text-[8px] sm:text-[9px] uppercase tracking-wider text-violet-600/50 dark:text-violet-300/50 font-medium pointer-events-none">Обязательно</span>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs font-normal text-foreground/70">
                          <p>Сервис не генерирует контент с нарушением авторских прав или откровенного характера. Загружайте карточку без водяных знаков.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Загрузите готовую карточку товара для создания видеообложки (до 5 МБ, формат 3:4)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedImage ? (
                <label
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="group flex flex-col items-center justify-center w-full border-2 border-dashed rounded-md p-6 sm:p-8 transition-all border-violet-500/25 bg-white/40 dark:bg-white/[0.02] hover:border-violet-500/60 hover:bg-violet-500/[0.06] cursor-pointer"
                >
                  <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-all">
                    <Upload className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/80">
                    Загрузите карточку товара
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground text-center">
                    Перетащите или нажмите для выбора. PNG, JPG. До 5 МБ, формат 3:4.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={imagePreview!}
                    alt="Preview"
                    className="max-h-64 rounded-xl border border-border"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg hover:scale-105 transition-transform"
                    aria-label="Удалить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Block 2: User wishes */}
          <Card className="relative overflow-hidden border-border/60 bg-card rounded-2xl">
            <CardHeader className="relative">
              <div className="flex items-start gap-3">
                <div className="hidden lg:flex shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <span>Пожелания к видео</span>
                    <span className="absolute top-2.5 right-3 z-10 text-[8px] sm:text-[9px] uppercase tracking-wider text-muted-foreground/50 font-medium pointer-events-none">Необязательно</span>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs font-normal text-foreground/70">
                          <p>Не знаете, как описать задачу? Включите «Придумай сам» — нейросеть подберёт оптимальные параметры для лучшего результата.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Опишите, какую анимацию вы хотите получить, или доверьте параметры нейросети.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                id="userPrompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value.slice(0, 150))}
                placeholder="Например: плавное вращение, приближение камеры, эффект дыма…"
                className="min-h-[88px] rounded-md border-border/60 focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20"
                maxLength={600}
                disabled={isProcessing || autoOptimize}
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label
                  htmlFor="autoOptimize"
                  className={`group inline-flex items-center gap-2 sm:gap-2.5 rounded-md px-2.5 sm:px-3 h-10 cursor-pointer select-none transition-colors max-w-full ${
                    autoOptimize
                      ? 'bg-gradient-to-r from-violet-500/15 to-purple-500/10 text-violet-700 dark:text-violet-300'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 transition-colors ${autoOptimize ? 'text-violet-500' : ''}`} />
                  <span className="text-[11px] sm:text-xs font-medium leading-none whitespace-nowrap">
                    Придумай сам
                  </span>
                  <Switch
                    id="autoOptimize"
                    checked={autoOptimize}
                    onCheckedChange={(checked) => {
                      const next = !!checked;
                      setAutoOptimize(next);
                      setUserPrompt(next ? AUTO_PROMPT_TEXT : "");
                    }}
                    disabled={isProcessing}
                    className="data-[state=checked]:bg-violet-500 scale-75 sm:scale-90 -my-1 shrink-0"
                  />
                </label>
                <span className={`text-xs tabular-nums shrink-0 ${userPrompt.length >= 150 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {userPrompt.length}/150
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Block 3: Generate button + hint */}
          <Card className="border-border/60 bg-card rounded-2xl">
            <CardContent className="pt-6 space-y-3">
              <Button
                onClick={handleGenerate}
                disabled={!selectedImage || priceLoading || (!userPrompt.trim() && !autoOptimize)}
                size="lg"
                className="gap-2 w-full sm:w-auto rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none disabled:cursor-not-allowed"
              >
                <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Сгенерировать видеообложку</span>
                <span className="sm:hidden">Сгенерировать</span>
                <Badge className="ml-1 bg-white/20 text-white border-white/30 hover:bg-white/20">
                  {priceLoading ? '...' : videoCost} ток.
                </Badge>
              </Button>

              <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed mt-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>
                  Стоимость: <strong>{priceLoading ? '...' : videoCost} токенов</strong> за 1 видео. Не понравилось либо есть ошибки? Перегенерация в 5 раз дешевле!
                </p>
              </div>

              {(!selectedImage || (!userPrompt.trim() && !autoOptimize)) && (
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-3 py-2 animate-fade-in">
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/15">
                    <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-amber-800 dark:text-amber-200 font-medium text-xs sm:text-[13px] leading-snug">
                    {!selectedImage
                      ? "Загрузите карточку товара"
                      : "Напишите пожелания или включите «Придумай сам»"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
