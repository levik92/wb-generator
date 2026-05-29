import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Info,
  FileText,
  Loader2,
  Copy,
  Download,
  Sparkles,
  TrendingUp,
  Settings,
  Clock,
  AlertTriangle,
  X,
  ShieldCheck,
  Eye,
  ExternalLink,
  Coins,
  Zap,
  PenLine,
} from "lucide-react";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { useActiveAiModel, getEdgeFunctionName } from "@/hooks/useActiveAiModel";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface GenerateDescriptionProps {
  profile: Profile;
  onTokensUpdate: () => void;
  onNavigateToBalance?: () => void;
}

const ESTIMATED_TIME_SEC = 30;

export const GenerateDescription = ({
  profile,
  onTokensUpdate,
  onNavigateToBalance,
}: GenerateDescriptionProps) => {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [competitor1, setCompetitor1] = useState("");
  const [competitor2, setCompetitor2] = useState("");
  const [competitor3, setCompetitor3] = useState("");
  const [keywords, setKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [hasCheckedJobs, setHasCheckedJobs] = useState(false);
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0);

  const [isPromoVisible, setIsPromoVisible] = useState(() => {
    return localStorage.getItem("description-promo-dismissed") !== "true";
  });

  const handleDismissPromo = () => {
    localStorage.setItem("description-promo-dismissed", "true");
    setIsPromoVisible(false);
  };

  const { toast } = useToast();
  const { price: descriptionPrice, isLoading: priceLoading } = useGenerationPrice("description_generation");
  const { data: activeModel } = useActiveAiModel();

  const WAITING_MESSAGES = [
    "Еще чуть-чуть...",
    "Добавляем мелкие детали...",
    "Причесываем и шлифуем...",
    "Почти готово, немного терпения...",
  ];

  // Poll for generation result
  const pollGeneration = useCallback(
    async (generationId: string, _startTime: number) => {
      const pollInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from("generations")
            .select("status, output_data")
            .eq("id", generationId)
            .single();

          if (error) {
            console.error("Poll error:", error);
            return;
          }

          if (data.status === "completed" && data.output_data) {
            clearInterval(pollInterval);
            const outputData = data.output_data as any;
            setGeneratedText(outputData.description || "");
            setGenerating(false);
            setCurrentGenerationId(null);
            setGenerationStartTime(null);
            setSmoothProgress(100);
            onTokensUpdate();
            toast({
              title: "Описание создано!",
              description: "Описание товара успешно сгенерировано",
            });
          } else if (data.status === "failed") {
            clearInterval(pollInterval);
            const outputData = data.output_data as any;
            setGenerating(false);
            setCurrentGenerationId(null);
            setGenerationStartTime(null);
            setSmoothProgress(0);
            onTokensUpdate();
            toast({
              title: "Ошибка генерации",
              description: outputData?.error || "Не удалось создать описание. Попробуйте позже",
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error("Poll exception:", err);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    },
    [onTokensUpdate, toast]
  );

  // Resume in-flight generation + restore last result
  useEffect(() => {
    if (hasCheckedJobs) return;
    const checkActiveGenerations = async () => {
      try {
        const { data: activeData, error: activeError } = await supabase
          .from("generations")
          .select("id, created_at")
          .eq("user_id", profile.id)
          .eq("generation_type", "description")
          .eq("status", "processing")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!activeError && activeData && activeData.length > 0) {
          const activeGen = activeData[0];
          const createdAt = new Date(activeGen.created_at).getTime();
          const elapsed = (Date.now() - createdAt) / 1000;
          if (elapsed <= 300) {
            setGenerating(true);
            setCurrentGenerationId(activeGen.id);
            setGenerationStartTime(createdAt);
            const remaining = Math.max(ESTIMATED_TIME_SEC - elapsed, 0);
            setEstimatedTimeRemaining(Math.ceil(remaining));
            setSmoothProgress(Math.min((elapsed / ESTIMATED_TIME_SEC) * 95, 95));
            pollGeneration(activeGen.id, createdAt);
            setHasCheckedJobs(true);
            return;
          }
        }

        if (!generatedText) {
          const { data: lastCompleted } = await supabase
            .from("generations")
            .select("output_data")
            .eq("user_id", profile.id)
            .eq("generation_type", "description")
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1);

          if (lastCompleted && lastCompleted.length > 0 && lastCompleted[0].output_data) {
            const outputData = lastCompleted[0].output_data as any;
            if (outputData.description) setGeneratedText(outputData.description);
          }
        }
      } catch (err) {
        console.error("Error checking active generations:", err);
      } finally {
        setHasCheckedJobs(true);
      }
    };
    checkActiveGenerations();
  }, [profile.id, hasCheckedJobs, pollGeneration, generatedText]);

  // Smooth progress
  useEffect(() => {
    if (!generating || !generationStartTime) return;
    const interval = setInterval(() => {
      setSmoothProgress((prev) => {
        const elapsed = (Date.now() - generationStartTime) / 1000;
        const targetProgress = Math.min((elapsed / ESTIMATED_TIME_SEC) * 95, 95);
        if (prev >= targetProgress) return targetProgress;
        return Math.min(prev + 0.2, targetProgress);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [generating, generationStartTime]);

  // Countdown
  useEffect(() => {
    if (!generating || estimatedTimeRemaining <= 0) return;
    const interval = setInterval(() => {
      setEstimatedTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [generating, estimatedTimeRemaining]);

  // Waiting messages cycle
  useEffect(() => {
    if (!generating || estimatedTimeRemaining > 0) {
      setWaitingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setWaitingMessageIndex((prev) => {
        if (prev >= WAITING_MESSAGES.length - 1) return prev;
        return prev + 1;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [generating, estimatedTimeRemaining]);

  const canGenerate = () => {
    return (
      productName.trim() &&
      productName.trim().length <= 150 &&
      productName.trim().length >= 3 &&
      keywords.trim().length <= 1200 &&
      profile.tokens_balance >= descriptionPrice &&
      !priceLoading
    );
  };

  const getGuardMessage = () => {
    if (!productName.trim()) return "Введите название товара";
    if (productName.trim().length > 150) return "Название товара должно быть не более 150 символов";
    if (productName.trim().length < 3) return "Название товара должно содержать минимум 3 символа";
    if (keywords.trim().length > 1200) return "Ключевые слова должны быть не более 1200 символов";
    if (profile.tokens_balance < descriptionPrice) return `Недостаточно токенов (нужно ${descriptionPrice})`;
    return null;
  };

  const simulateGeneration = async () => {
    if (!activeModel) {
      toast({
        title: "Подождите",
        description: "Загрузка настроек модели...",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setGeneratedText("");
    setSmoothProgress(0);
    setWaitingMessageIndex(0);
    const startTime = Date.now();
    setGenerationStartTime(startTime);
    setEstimatedTimeRemaining(ESTIMATED_TIME_SEC);

    try {
      const competitors = [competitor1, competitor2, competitor3].filter(Boolean);
      const keywordsList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const functionName = getEdgeFunctionName(
        "generate-description",
        activeModel?.model || "google",
        activeModel?.provider
      );

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          productName,
          category: category || "товар",
          competitors,
          keywords: keywordsList,
          userId: profile.id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.generationId) {
        setCurrentGenerationId(data.generationId);
        pollGeneration(data.generationId, startTime);
      } else if (data.description) {
        setGeneratedText(data.description);
        setGenerating(false);
        setGenerationStartTime(null);
        setSmoothProgress(100);
        onTokensUpdate();
        toast({
          title: "Описание создано!",
          description: "Описание товара успешно сгенерировано",
        });
      }
    } catch (error: any) {
      setGenerating(false);
      setGenerationStartTime(null);
      setSmoothProgress(0);
      toast({
        title: "Ошибка генерации",
        description: "Не удалось создать описание. Попробуйте позже",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    toast({
      title: "Скопировано!",
      description: "Описание скопировано в буфер обмена",
    });
  };

  const downloadAsFile = (format: "txt" | "docx" | "pdf") => {
    toast({
      title: "Скачивание начато",
      description: `Файл в формате ${format.toUpperCase()} будет скачан`,
    });
  };

  const guardMessage = getGuardMessage();

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Hero — conversion-focused (same style as cards page) */}
      <AnimatePresence>
        {isPromoVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-card"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-violet-500/15 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl"
            />

            <button
              onClick={handleDismissPromo}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-20"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="space-y-1.5 pr-8">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-violet-700 dark:text-violet-300">
                      Описания, которые продают
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                    Текст карточки, который повышает конверсию{" "}
                    <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                      за 30 секунд
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    WBGen подбирает стиль, ключевые слова и эмоциональные акценты — готовое описание под ваш товар и аудиторию.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">Выше конверсия</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">SEO + продающие триггеры</p>
                      </div>
                    </div>
                  </div>

                  <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">30 сек. вместо часов</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">без копирайтера и правок</p>
                      </div>
                    </div>
                  </div>

                  <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">Возврат 100%</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">если не понравится</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-column: form + result */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-border/60 bg-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="w-4 h-4 shrink-0" />
                <span>Параметры генерации</span>
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
                      <p>
                        Чем точнее название и ключевые слова, тем точнее результат. Ссылки на конкурентов
                        помогают модели подобрать правильную лексику и структуру.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Заполните данные — нейросеть подберёт стиль, ключи и продающие акценты
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-sm font-medium">
                  Название товара
                </Label>
                <Input
                  id="productName"
                  placeholder="Например: Беспроводные наушники AirPods"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value.slice(0, 150))}
                  maxLength={150}
                  disabled={generating}
                  className="bg-background border-border/60 focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{productName.length}/150 символов</span>
                  {productName.length > 140 && (
                    <span className="text-amber-500">Осталось: {150 - productName.length}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Ссылки на конкурентов <span className="text-muted-foreground font-normal">(необязательно)</span>
                </Label>
                <div className="space-y-2">
                  {[
                    { v: competitor1, set: setCompetitor1, p: "Ссылка на конкурента 1" },
                    { v: competitor2, set: setCompetitor2, p: "Ссылка на конкурента 2" },
                    { v: competitor3, set: setCompetitor3, p: "Ссылка на конкурента 3" },
                  ].map((f, i) => (
                    <Input
                      key={i}
                      placeholder={f.p}
                      value={f.v}
                      onChange={(e) => f.set(e.target.value)}
                      disabled={generating}
                      className="bg-background border-border/60 focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Нейросеть проанализирует описания конкурентов и выделит важные ключевые слова
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords" className="text-sm font-medium">
                  Ключевые слова <span className="text-muted-foreground font-normal">(необязательно)</span>
                </Label>
                <Textarea
                  id="keywords"
                  placeholder="ключ1, ключ2, ключ3"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value.slice(0, 1200))}
                  maxLength={1200}
                  disabled={generating}
                  className="bg-background border-border/60 focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20 min-h-[100px] resize-none"
                  rows={3}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Разделяйте запятыми</span>
                  <span className={keywords.length >= 1200 ? "text-destructive" : ""}>
                    {keywords.length}/1200
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Result */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-border/60 bg-card rounded-2xl h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Готовое описание</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {generatedText ? `${generatedText.length} символов` : "Результат появится здесь"}
                  </CardDescription>
                </div>
                {generatedText && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyToClipboard}
                    className="shrink-0 rounded-md h-9 px-3 text-sm font-medium bg-muted/60 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Копировать
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedText ? (
                <div className="space-y-4">
                  <Textarea
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    rows={10}
                    className="bg-background border-border/60 focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20 text-sm leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(["txt", "docx", "pdf"] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAsFile(fmt)}
                        className="gap-2 rounded-lg border-border/60 hover:border-violet-500/40 hover:bg-violet-500/[0.06]"
                      >
                        <Download className="w-4 h-4" />
                        {fmt.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/30">
                  <div className="text-center text-muted-foreground">
                    {generating ? (
                      <>
                        <div className="relative w-10 h-10 mx-auto mb-3">
                          <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-md animate-pulse" />
                          <div className="relative w-10 h-10 rounded-full border-[3px] border-violet-500/15 border-t-violet-500 border-r-violet-500/70 animate-spin" />
                          <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-violet-600 dark:text-violet-300" />
                        </div>
                        <p className="text-sm font-medium">Генерация описания...</p>
                        <p className="text-xs mt-1">Результат появится здесь автоматически</p>
                      </>
                    ) : (
                      <>
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Описание появится после генерации</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Generate Button card — cards-page style */}
      {!generating && (
        <Card className="border-border/60 bg-card rounded-2xl">
          <CardContent className="pt-6 space-y-3">
            <Button
              onClick={simulateGeneration}
              disabled={!canGenerate()}
              size="lg"
              className="gap-2 w-full sm:w-auto rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">
                {generatedText ? "Сгенерировать ещё одно описание" : "Сгенерировать описание"}
              </span>
              <span className="sm:hidden">Сгенерировать</span>
              <Badge className="ml-1 bg-white/20 text-white border-white/30 hover:bg-white/20">
                {priceLoading ? "..." : descriptionPrice} ток.
              </Badge>
            </Button>

            <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed mt-1">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>
                Стоимость: <strong>{priceLoading ? "..." : descriptionPrice} токенов</strong>. Описание
                генерирует нейросеть на основе введённых данных.
              </p>
            </div>

            {guardMessage && (
              <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-3 py-2 animate-fade-in">
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/15">
                  <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-amber-800 dark:text-amber-200 font-medium text-xs sm:text-[13px] leading-snug">
                  {guardMessage}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Card — exact cards-page style */}
      {generating && (
        <Card className="relative overflow-hidden border-violet-500/30 bg-card rounded-2xl shadow-lg shadow-violet-500/5 animate-fade-in">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at var(--glow-x, 30%) 100%, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
              animation: "glow-drift 6s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 45% at var(--glow-x2, 70%) 0%, hsl(280 80% 70% / 0.10) 0%, transparent 65%)",
              animation: "glow-drift-top 8s ease-in-out infinite alternate",
            }}
          />
          <CardContent className="relative z-10 p-4 sm:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-md animate-pulse" />
                <div className="relative w-11 h-11 rounded-full border-[3px] border-violet-500/15 border-t-violet-500 border-r-violet-500/70 animate-spin" />
                <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-violet-600 dark:text-violet-300" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-semibold text-sm sm:text-base">Генерация описания</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {estimatedTimeRemaining > 0
                    ? "Анализируем данные и создаём описание…"
                    : WAITING_MESSAGES[waitingMessageIndex]}
                </p>
              </div>
              {estimatedTimeRemaining > 0 && (
                <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/5 border border-violet-500/30 text-violet-700 dark:text-violet-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm font-bold tabular-nums">
                    0:{String(estimatedTimeRemaining).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full space-y-1.5">
              <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-1000 ease-linear shadow-sm shadow-violet-500/40"
                  style={{ width: `${Math.min(smoothProgress, 95)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>Создаём текст</span>
                <span className="tabular-nums">
                  {estimatedTimeRemaining <= 0 ? "Финализация…" : `${Math.round(smoothProgress)}%`}
                </span>
              </div>
            </div>

            {/* Info hint */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50">
              <AlertTriangle className="h-4 w-4 text-violet-500/70 shrink-0 mt-0.5" />
              <span className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Генерация проходит в фоновом режиме — можно переключиться на другую вкладку, результат
                появится автоматически.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
