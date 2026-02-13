import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { Upload, Video, Download, Loader2, AlertTriangle, X, Play, Clock, Sparkles, TrendingUp, Zap, Eye } from "lucide-react";

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
}

const ESTIMATED_TIME_SECONDS = 4 * 60; // 4 minutes

export function VideoCovers({ profile, onTokensUpdate }: VideoCoversProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null);
  const [history, setHistory] = useState<VideoJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(ESTIMATED_TIME_SECONDS);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { price: videoCost, isLoading: priceLoading } = useGenerationPrice("video_generation");

  // Load history
  useEffect(() => {
    loadHistory();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (isGenerating || (currentJob && (currentJob.status === "processing" || currentJob.status === "pending"))) {
      const startTime = generationStartTime || Date.now();
      if (!generationStartTime) setGenerationStartTime(startTime);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, ESTIMATED_TIME_SECONDS - elapsed);
        setRemainingSeconds(remaining);
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setRemainingSeconds(ESTIMATED_TIME_SECONDS);
      setGenerationStartTime(null);
    }
  }, [isGenerating, currentJob?.status]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const loadHistory = async () => {
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
        setCurrentJob(activeJob);
        setIsGenerating(true);
        // Estimate remaining time based on created_at
        const elapsed = Math.floor((Date.now() - new Date(activeJob.created_at).getTime()) / 1000);
        const remaining = Math.max(0, ESTIMATED_TIME_SECONDS - elapsed);
        setRemainingSeconds(remaining);
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
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Ошибка", description: "Максимальный размер файла — 10 МБ", variant: "destructive" });
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
        const { data, error } = await supabase.functions.invoke("check-video-status", {
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
          loadHistory();
          toast({ title: "Видео готово! 🎬", description: "Видеообложка успешно сгенерирована" });
        } else if (data.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCurrentJob((prev) => prev ? { ...prev, status: "failed", error_message: data.error_message } : null);
          setIsGenerating(false);
          onTokensUpdate();
          loadHistory();
          toast({
            title: "Ошибка генерации",
            description: `${data.error_message || "Неизвестная ошибка"}. Токены возвращены на баланс.`,
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
      setRemainingSeconds(ESTIMATED_TIME_SECONDS);

      const { data, error } = await supabase.functions.invoke("create-video-job", {
        body: { image_url: imageUrl, user_prompt: userPrompt.trim() || undefined },
      });

      if (error) throw error;

      if (data.error) {
        if (data.refunded) {
          toast({
            title: "Ошибка",
            description: `${data.error}. Токены возвращены.`,
            variant: "destructive",
          });
        } else {
          toast({ title: "Ошибка", description: data.error, variant: "destructive" });
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
        description: error.message || "Не удалось создать задачу",
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

  const isProcessing = isUploading || isGenerating;
  const hasActiveJob = currentJob && (currentJob.status === "processing" || currentJob.status === "pending");

  return (
    <div className="space-y-6">
      {/* Header - matching other pages */}
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Video className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            Видеообложки
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 animate-pulse">
              New
            </Badge>
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
                  <p className="text-xs font-medium">Готово за ~4 минуты</p>
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

      {/* Upload & Generation */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Warning during processing */}
          {isProcessing && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium text-primary">
                {isUploading
                  ? "Загрузка изображения… Не закрывайте страницу"
                  : "Генерация видео… Не закрывайте и не сворачивайте страницу"}
              </span>
            </div>
          )}

          {/* Active job progress - with timer and loading animation */}
          {hasActiveJob && (
            <div className="flex flex-col items-center gap-4 py-8">
              {/* Loading animation */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Генерация видеообложки…</p>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Clock className="h-4 w-4" />
                  <span className="text-lg font-bold tabular-nums">{formatTime(remainingSeconds)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Расчётное время ~4 минуты. Вы можете переключиться на другие вкладки.
                </p>
              </div>
            </div>
          )}

          {/* Completed video */}
          {currentJob?.status === "completed" && currentJob.video_url && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Play className="h-5 w-5" />
                <span className="font-medium">Видео готово!</span>
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
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button onClick={() => downloadVideo(currentJob.video_url!)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Скачать видео
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentJob(null);
                  }}
                >
                  Создать новое
                </Button>
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

          {/* Upload zone and form - only when no active job */}
          {!currentJob && !isProcessing && (
            <div className="space-y-4">
              {/* Image upload */}
              {!selectedImage ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Загрузите фото товара</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Перетащите или нажмите для выбора. Без сжатия — оригинальное качество.
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
                <div className="space-y-4">
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
                </div>
              )}

              {/* User wishes field */}
              <div className="space-y-2">
                <Label htmlFor="userPrompt">
                  Пожелания к видео
                  <span className="text-muted-foreground text-xs ml-2">(необязательно)</span>
                </Label>
                <Textarea
                  id="userPrompt"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value.slice(0, 600))}
                  placeholder="Опишите ваши персональные пожелания по анимации, например: плавное вращение, приближение камеры, эффект дыма и т.д. Если оставить поле пустым — нейросеть подберёт лучший вариант автоматически."
                  className="min-h-[80px]"
                  maxLength={600}
                  disabled={isProcessing}
                />
                <div className="flex justify-end text-xs text-muted-foreground">
                  <span>{userPrompt.length}/600 символов</span>
                </div>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedImage || priceLoading}
                className="gap-2 w-full sm:w-auto"
                size="lg"
              >
                <Video className="h-5 w-5" />
                Сгенерировать видеообложку
                <Badge variant="secondary" className="ml-1">
                  {videoCost} токенов
                </Badge>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            История генераций
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history
              .filter((j) => j.id !== currentJob?.id)
              .map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "default"
                            : job.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {job.status === "completed"
                          ? "Готово"
                          : job.status === "failed"
                          ? "Ошибка"
                          : "В процессе"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>

                    {job.status === "completed" && job.video_url && (
                      <>
                        <video
                          src={job.video_url}
                          muted
                          loop
                          playsInline
                          className="w-full rounded-lg border border-border"
                          style={{ aspectRatio: "3/4" }}
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const v = e.target as HTMLVideoElement;
                            v.pause();
                            v.currentTime = 0;
                          }}
                          onTouchStart={(e) => (e.target as HTMLVideoElement).play()}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => downloadVideo(job.video_url!)}
                        >
                          <Download className="h-4 w-4" />
                          Скачать
                        </Button>
                      </>
                    )}

                    {job.status === "failed" && (
                      <p className="text-xs text-destructive">
                        {job.error_message || "Ошибка генерации"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
