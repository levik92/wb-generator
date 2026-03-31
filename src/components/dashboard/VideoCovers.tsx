import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { Upload, Video, Download, Loader2, AlertTriangle, X, Play, Clock, Sparkles, TrendingUp, Zap, Eye, Info, RefreshCw, ExternalLink, CreditCard, Coins, HelpCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveAiModel, getVideoEdgeFunctionName } from "@/hooks/useActiveAiModel";

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
  const provider = aiModelData?.provider;

  // Video promo banner dismissal
  const VIDEO_PROMO_KEY = `video_promo_banner_dismissed_${profile.id}`;
  const [isPromoBannerVisible, setIsPromoBannerVisible] = useState(() => {
    return localStorage.getItem(VIDEO_PROMO_KEY) !== "true";
  });
  const handleDismissPromo = () => {
    localStorage.setItem(VIDEO_PROMO_KEY, "true");
    setIsPromoBannerVisible(false);
  };

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

      const { data: urlData } = supabase.storage
        .from("generation-images")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

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
    <div className="space-y-6">
      {/* Header - matching other pages */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
          <Video className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Видеообложки
          </h2>
          <p className="text-muted-foreground text-sm">Загрузите фото товара и получите 5-секундную видеообложку</p>
        </div>
      </div>

      {/* Benefits block */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-4 sm:pt-5 pb-4 sm:pb-5">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold">
                Живые обложки, которые привлекают внимание
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Анимированные обложки увеличивают CTR карточек на маркетплейсах. Просто загрузите фото товара — ИИ создаст плавную 5-секундную анимацию премиального уровня.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-primary/20">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">Рост CTR до +35%</p>
                  <p className="text-[10px] text-muted-foreground">за счёт анимации</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-primary/20">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">Готово за ~2 минуты</p>
                  <p className="text-[10px] text-muted-foreground">вместо часов работы</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-primary/20">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">Выделение в выдаче</p>
                  <p className="text-[10px] text-muted-foreground">среди статичных карточек</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Promo Banner */}
      <AnimatePresence>
        {isPromoBannerVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl"
          >
            {/* Animated gradient background — video-themed blue-purple */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-primary to-fuchsia-500 animate-gradient-x" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />

            {/* Floating video icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <Video className="absolute top-3 left-[8%] w-4 h-4 text-white/25 animate-float-slow" />
              <Play className="absolute top-6 left-[28%] w-5 h-5 text-white/20 animate-float-medium rotate-12" />
              <Zap className="absolute top-4 right-[22%] w-4 h-4 text-white/30 animate-float-fast -rotate-12" />
              <Sparkles className="absolute bottom-3 left-[18%] w-3 h-3 text-white/20 animate-float-medium rotate-6" />
              <Video className="absolute bottom-5 right-[12%] w-5 h-5 text-white/15 animate-float-slow -rotate-6" />
              <Play className="absolute top-1/2 left-[50%] w-3 h-3 text-white/15 animate-float-fast rotate-45" />
            </div>

            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

            <div className="relative p-4 sm:p-6">
              <button
                onClick={handleDismissPromo}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white z-10"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 pr-8">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Video className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                    Посмотрите, какие видеообложки можно создавать
                  </h3>
                  <p className="text-sm text-white/80 line-clamp-2">
                    Примеры работ и возможности нейросети — живые обложки для ваших товаров
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-shrink-0">
                  <Button
                    className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
                    asChild
                  >
                    <a href="/video-generaciya" target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4 mr-2" />
                      Посмотреть
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </a>
                  </Button>
                  {onNavigate && (
                    <Button
                      variant="outline"
                      onClick={() => onNavigate("pricing")}
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Пополнить баланс
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing states */}
      <AnimatePresence mode="wait">
      {(isProcessing || currentJob) && (
        <motion.div
          key="processing"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
        <Card className="relative overflow-hidden">
          {/* Animated radial gradient backgrounds */}
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
          <CardContent className="relative z-10 p-4 sm:p-6 space-y-4">
            {/* Unified processing area - visible during all processing phases */}
            {(isProcessing || hasActiveJob) && !(currentJob?.status === "completed" || currentJob?.status === "failed") && (
              <div className="min-h-[280px] flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  {/* Upload/preparation phase — covers upload AND the gap before job is created */}
                  {(isUploading || (isGenerating && !hasActiveJob)) && (
                    <motion.div
                      key="uploading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center gap-4 py-8 w-full"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <Upload className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-medium">Подготовка к генерации…</p>
                        <p className="text-sm text-muted-foreground">Загружаем изображение и рассчитываем параметры обработки</p>
                      </div>
                      <div className="w-full max-w-xs">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "30%" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Active job progress */}
                  {hasActiveJob && !isUploading && (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center gap-4 py-8 w-full"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center space-y-2">
                        {!isInExtendedWait ? (
                          <>
                            <p className="font-medium">Генерация видеообложки…</p>
                            <div className="flex items-center justify-center gap-2 text-primary">
                              <Clock className="h-4 w-4" />
                              <span className="text-lg font-bold tabular-nums">{formatTime(remainingSeconds)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Расчётное время 1-2 минуты. Можете переключиться на другие вкладки.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-primary">{WAITING_MESSAGES[waitingMessageIndex]}</p>
                            <p className="text-xs text-muted-foreground">
                              Генерация занимает немного больше времени, чем обычно
                            </p>
                          </>
                        )}
                      </div>
                      <div className="w-full max-w-xs">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
                            style={{ width: `${Math.min(progressPercent, 95)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-1">
                          {isInExtendedWait ? "Финализация…" : `${Math.round(progressPercent)}%`}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Warning during processing */}
            {isProcessing && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 backdrop-blur-sm border border-border/50">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Результат создаёт нейросеть. В случае неудовлетворительного результата токены не возвращаются. Пожалуйста, внимательно составляйте описание и пожелания к генерации.
                </span>
              </div>
            )}

            {/* Completed video */}
            {currentJob?.status === "completed" && currentJob.video_url && (
              <div className="space-y-3 sm:space-y-4 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 right-0 h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary z-10"
                  onClick={() => setCurrentJob(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 text-primary">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base">Видео готово! 🎬</span>
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
                  <Button onClick={() => downloadVideo(currentJob.video_url!)} className="gap-2 w-full xs:w-auto">
                    <Download className="h-4 w-4" />
                    Скачать видео
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentJob(null)} className="gap-2 w-full xs:w-auto">
                    <Video className="h-4 w-4" />
                    Сгенерировать новое
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  Результат сохранён на странице «История генераций»
                </p>

                {/* Regeneration block */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-primary" />
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
                      className="min-h-[60px] text-sm"
                      maxLength={150}
                      disabled={isRegenerating || regenAutoOptimize}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 bg-muted/50 border border-border/50 rounded-lg px-3 py-2">
                        <Checkbox
                          id="regenAutoOptimize"
                          checked={regenAutoOptimize}
                          onCheckedChange={(checked) => {
                            const isChecked = checked === true;
                            setRegenAutoOptimize(isChecked);
                            if (isChecked) {
                              setRegenPrompt(AUTO_PROMPT_TEXT);
                            } else {
                              setRegenPrompt("");
                            }
                          }}
                          disabled={isRegenerating}
                        />
                        <Label htmlFor="regenAutoOptimize" className="text-sm font-normal cursor-pointer">
                          Придумай сам
                        </Label>
                      </div>
                      <span className={`text-xs ${regenPrompt.length >= 150 ? 'text-destructive' : 'text-muted-foreground'}`}>{regenPrompt.length}/150</span>
                    </div>
                    <Button
                      onClick={handleRegenerate}
                      disabled={isRegenerating || (!regenPrompt.trim() && !regenAutoOptimize)}
                      variant="outline"
                      className="gap-2 w-full sm:w-auto"
                    >
                      {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Перегенерировать
                      <Badge variant="secondary" className="ml-1">
                        {regenCost} токенов
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
                  <Button variant="outline" onClick={() => setCurrentJob(null)}>
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
          className="space-y-4"
        >
          {/* Block 1: Upload + wishes */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Image upload header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-base sm:text-lg">Карточка товара</span>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="ml-1 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
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
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Загрузите карточку товара для создания видеообложки (до 5 МБ)
                </p>
              </div>

              {/* Image upload zone */}
              {!selectedImage ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-border/50 rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-muted/30"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">Загрузите карточку товара</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Перетащите или нажмите для выбора. До 5 МБ, формат 3:4.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={imagePreview!}
                    alt="Preview"
                    className="max-h-64 rounded-xl border border-border"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* User wishes field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold text-base sm:text-lg">Пожелания к видео</span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs">
                        Не знаете, как описать задачу? Включите «Придумай сам» — нейросеть подберёт оптимальные параметры для лучшего результата.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id="userPrompt"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value.slice(0, 150))}
                  placeholder="Опишите ваши пожелания по анимации, например: плавное вращение, приближение камеры, эффект дыма…"
                  className="min-h-[80px]"
                  maxLength={600}
                  disabled={isProcessing || autoOptimize}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 bg-muted/50 border border-border/50 rounded-lg px-3 py-2">
                    <Checkbox
                      id="autoOptimizeVideo"
                      checked={autoOptimize}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setAutoOptimize(isChecked);
                        if (isChecked) {
                          setUserPrompt(AUTO_PROMPT_TEXT);
                        } else {
                          setUserPrompt("");
                        }
                      }}
                      disabled={isProcessing}
                    />
                    <Label htmlFor="autoOptimizeVideo" className="text-sm font-normal cursor-pointer">
                      Придумай сам
                    </Label>
                  </div>
                  <span className={`text-xs ${userPrompt.length >= 150 ? 'text-red-500' : 'text-muted-foreground'}`}>{userPrompt.length}/150 символов</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Block 2: Generate button + hint */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <Button
                onClick={handleGenerate}
                disabled={!selectedImage || priceLoading || (!userPrompt.trim() && !autoOptimize)}
                className="gap-2 w-full sm:w-auto"
                size="lg"
              >
                <Video className="h-5 w-5" />
                <span className="sm:hidden">Сгенерировать</span>
                <span className="hidden sm:inline">Сгенерировать видеообложку</span>
                <Badge variant="secondary" className="ml-1">
                  {videoCost} токенов
                </Badge>
              </Button>

              <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed mt-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>Видео генерирует нейросеть. Внимательно относитесь к описанию пожеланий. Если результат не устраивает, видео можно перегенерировать в 5 раз дешевле.</p>
              </div>

              {/* Guard message */}
              {(!selectedImage || (!userPrompt.trim() && !autoOptimize)) && (
                <Alert className="bg-amber-500/10 border-amber-500/30 rounded-xl [&>svg]:!text-amber-600 dark:[&>svg]:!text-amber-400 [&>svg+div]:translate-y-0 items-center [&>svg]:!top-1/2 [&>svg]:!-translate-y-1/2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300 font-medium text-xs sm:text-sm">
                    {!selectedImage
                      ? "Загрузите карточку товара"
                      : "Напишите пожелания или включите «Придумай сам»"}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
