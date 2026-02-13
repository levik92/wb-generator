import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { Upload, Video, Download, Loader2, AlertTriangle, X, Play, Clock } from "lucide-react";

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
}

interface VideoCoversProps {
  profile: Profile;
  onTokensUpdate: () => void;
}

export function VideoCovers({ profile, onTokensUpdate }: VideoCoversProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null);
  const [history, setHistory] = useState<VideoJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { price: videoCost, isLoading: priceLoading } = useGenerationPrice("video_generation");

  // Load history
  useEffect(() => {
    loadHistory();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("video_generation_jobs")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);

      // Check if there's an active job
      const activeJob = data?.find((j: VideoJob) => j.status === "processing" || j.status === "pending");
      if (activeJob) {
        setCurrentJob(activeJob);
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
      // Upload image to storage (no compression!)
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

      // Create video job
      const { data, error } = await supabase.functions.invoke("create-video-job", {
        body: { image_url: imageUrl },
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold">Видеообложки</h2>
        <p className="text-muted-foreground mt-1">
          Загрузите фото товара и получите 5-секундную видеообложку
        </p>
      </div>

      {/* Upload & Generation */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Warning during processing */}
          {isProcessing && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium text-primary">
                {isUploading
                  ? "Загрузка изображения… Не закрывайте страницу"
                  : "Генерация видео… Это может занять 1–3 минуты. Не закрывайте страницу"}
              </span>
            </div>
          )}

          {/* Current job progress */}
          {currentJob && (currentJob.status === "processing" || currentJob.status === "pending") && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Генерация видео…</p>
                <p className="text-sm text-muted-foreground mt-1">Обычно занимает 1–3 минуты</p>
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
              <div className="flex justify-center gap-3">
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

          {/* Upload zone - only when no active job */}
          {!currentJob && !isProcessing && (
            <>
              {!selectedImage ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
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

                  <Button
                    onClick={handleGenerate}
                    disabled={priceLoading}
                    className="gap-2"
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
            </>
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
                  <CardContent className="p-4 space-y-3">
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
