import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, FileText, Loader2, AlertCircle, Copy, Download, Sparkles, TrendingUp, Zap, Settings, Clock, AlertTriangle } from "lucide-react";
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
}

const ESTIMATED_TIME_SEC = 30;

export const GenerateDescription = ({
  profile,
  onTokensUpdate
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

  const { toast } = useToast();
  const { price: descriptionPrice, isLoading: priceLoading } = useGenerationPrice('description_generation');
  const { data: activeModel, isLoading: modelLoading } = useActiveAiModel();

  const WAITING_MESSAGES = ["Еще чуть-чуть...", "Добавляем мелкие детали...", "Причесываем и шлифуем...", "Почти готово, немного терпения..."];

  // Poll for generation result
  const pollGeneration = useCallback(async (generationId: string, startTime: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('status, output_data')
          .eq('id', generationId)
          .single();

        if (error) {
          console.error('Poll error:', error);
          return;
        }

        if (data.status === 'completed' && data.output_data) {
          clearInterval(pollInterval);
          const outputData = data.output_data as any;
          setGeneratedText(outputData.description || '');
          setGenerating(false);
          setCurrentGenerationId(null);
          setGenerationStartTime(null);
          setSmoothProgress(100);
          onTokensUpdate();
          toast({
            title: "Описание создано!",
            description: "Описание товара успешно сгенерировано"
          });
        } else if (data.status === 'failed') {
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
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('Poll exception:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [onTokensUpdate, toast]);

  // Check for active description generation on mount
  useEffect(() => {
    if (hasCheckedJobs) return;

    const checkActiveGenerations = async () => {
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('id, created_at')
          .eq('user_id', profile.id)
          .eq('generation_type', 'description')
          .eq('status', 'processing')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) {
          setHasCheckedJobs(true);
          return;
        }

        const activeGen = data[0];
        const createdAt = new Date(activeGen.created_at).getTime();
        const elapsed = (Date.now() - createdAt) / 1000;

        // If older than 5 minutes, it's probably stale
        if (elapsed > 300) {
          setHasCheckedJobs(true);
          return;
        }

        // Resume polling
        console.log('[GenerateDescription] Resuming active generation:', activeGen.id);
        setGenerating(true);
        setCurrentGenerationId(activeGen.id);
        setGenerationStartTime(createdAt);
        const remaining = Math.max(ESTIMATED_TIME_SEC - elapsed, 0);
        setEstimatedTimeRemaining(Math.ceil(remaining));
        setSmoothProgress(Math.min((elapsed / ESTIMATED_TIME_SEC) * 95, 95));
        pollGeneration(activeGen.id, createdAt);
      } catch (err) {
        console.error('Error checking active generations:', err);
      } finally {
        setHasCheckedJobs(true);
      }
    };

    checkActiveGenerations();
  }, [profile.id, hasCheckedJobs, pollGeneration]);

  // Smooth progress bar animation - same approach as card generation
  useEffect(() => {
    if (!generating || !generationStartTime) return;

    const interval = setInterval(() => {
      setSmoothProgress(prev => {
        const elapsed = (Date.now() - generationStartTime) / 1000;
        const targetProgress = Math.min((elapsed / ESTIMATED_TIME_SEC) * 95, 95);
        if (prev >= targetProgress) return targetProgress;
        return Math.min(prev + 0.2, targetProgress);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [generating, generationStartTime]);

  // Countdown timer
  useEffect(() => {
    if (!generating || estimatedTimeRemaining <= 0) return;
    const interval = setInterval(() => {
      setEstimatedTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [generating, estimatedTimeRemaining]);

  // Cycle through waiting messages after timer ends
  useEffect(() => {
    if (!generating || estimatedTimeRemaining > 0) {
      setWaitingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setWaitingMessageIndex(prev => {
        if (prev >= WAITING_MESSAGES.length - 1) return prev;
        return prev + 1;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [generating, estimatedTimeRemaining]);

  const canGenerate = () => {
    return productName.trim() && productName.trim().length <= 150 && productName.trim().length >= 3 && keywords.trim().length <= 1200 && profile.tokens_balance >= descriptionPrice && !priceLoading;
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
        variant: "destructive"
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
      const keywordsList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const functionName = getEdgeFunctionName('generate-description', activeModel);
      console.log('[GenerateDescription] Active model:', activeModel, '| Function:', functionName);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          productName,
          category: category || 'товар',
          competitors,
          keywords: keywordsList,
          userId: profile.id
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.generationId) {
        // Background mode: poll for result
        setCurrentGenerationId(data.generationId);
        pollGeneration(data.generationId, startTime);
      } else if (data.description) {
        // Synchronous fallback
        setGeneratedText(data.description);
        setGenerating(false);
        setGenerationStartTime(null);
        setSmoothProgress(100);
        onTokensUpdate();
        toast({
          title: "Описание создано!",
          description: "Описание товара успешно сгенерировано"
        });
      }
    } catch (error: any) {
      setGenerating(false);
      setGenerationStartTime(null);
      setSmoothProgress(0);
      toast({
        title: "Ошибка генерации",
        description: "Не удалось создать описание. Попробуйте позже",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    toast({
      title: "Скопировано!",
      description: "Описание скопировано в буфер обмена"
    });
  };

  const downloadAsFile = (format: 'txt' | 'docx' | 'pdf') => {
    toast({
      title: "Скачивание начато",
      description: `Файл в формате ${format.toUpperCase()} будет скачан`
    });
  };

  return <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Генерация описаний</h2>
          <p className="text-muted-foreground text-sm">Создайте профессиональное описание товара для Wildberries</p>
        </div>
      </motion.div>

      {/* Feature Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Умный текст, который продаёт</h3>
              <p className="text-sm text-muted-foreground">
                Подбор стиля, ключевых слов и эмоциональных акцентов
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-primary/20">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm">
              CTR и конверсия растут — время на описание <span className="font-semibold text-primary">30 секунд</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Generation Progress Card - matches card generation style */}
      {generating && (
        <Card className="relative overflow-hidden">
          {/* Animated radial gradient background — bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 50% at var(--glow-x, 30%) 100%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
            animation: 'glow-drift 6s ease-in-out infinite alternate',
          }} />
          <CardContent className="relative z-10 p-4 sm:p-6 space-y-4">
            {/* Header: Spinner + Title + Status */}
            <div className="flex items-start gap-3 pt-2">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
              </div>
              <div className="space-y-0.5">
                {estimatedTimeRemaining > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">Генерация описания</p>
                      <div className="flex items-center gap-1 text-primary">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-sm font-bold tabular-nums">
                          0:{String(estimatedTimeRemaining).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Анализируем данные и создаём описание...</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm">Генерация описания</p>
                    <p className="text-xs text-primary">{WAITING_MESSAGES[waitingMessageIndex]}</p>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar — full width, smooth transitions */}
            <div className="w-full space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.min(smoothProgress, 95)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Генерация описания</span>
                <span>{estimatedTimeRemaining <= 0 ? 'Финализация…' : `${Math.round(smoothProgress)}%`}</span>
              </div>
            </div>

            {/* Info hint */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 backdrop-blur-sm border border-border/50">
              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                Генерация проходит в фоновом режиме. Вы можете переключиться на другую вкладку — результат появится автоматически.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Form */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative overflow-hidden rounded-2xl border border-border/50 p-6 space-y-5 shadow-sm bg-card">
          <div>
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold mb-1"><Settings className="w-4 h-4 shrink-0" />Параметры генерации</h3>
            <p className="text-sm text-muted-foreground">Заполните данные для создания уникального описания</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Название товара</Label>
              <Input id="productName" placeholder="Например: Беспроводные наушники AirPods" value={productName} onChange={e => setProductName(e.target.value.slice(0, 150))} maxLength={150} disabled={generating} className="bg-background/50 border-border/50 focus:border-primary/50" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{productName.length}/150 символов</span>
                {productName.length > 140 && <span className="text-amber-500">Осталось: {150 - productName.length}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ссылки на конкурентов <span className="text-muted-foreground">(необязательно)</span></Label>
              <div className="space-y-2">
                <Input placeholder="Ссылка на конкурента 1" value={competitor1} onChange={e => setCompetitor1(e.target.value)} disabled={generating} className="bg-background/50 border-border/50 focus:border-primary/50" />
                <Input placeholder="Ссылка на конкурента 2" value={competitor2} onChange={e => setCompetitor2(e.target.value)} disabled={generating} className="bg-background/50 border-border/50 focus:border-primary/50" />
                <Input placeholder="Ссылка на конкурента 3" value={competitor3} onChange={e => setCompetitor3(e.target.value)} disabled={generating} className="bg-background/50 border-border/50 focus:border-primary/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                WB Генератор проанализирует описания конкурентов и выделит ключевые слова
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Ключевые слова</Label>
              <Textarea id="keywords" placeholder="Введите ключевые слова через запятую: Ключ1, ключ2, ключ3" value={keywords} onChange={e => setKeywords(e.target.value.slice(0, 1200))} maxLength={1200} disabled={generating} className="bg-background/50 border-border/50 focus:border-primary/50 min-h-[80px] resize-none" rows={3} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Разделяйте запятыми (необязательно)</span>
                <span>{keywords.length}/1200</span>
              </div>
            </div>

            {!generating && (
              <Button onClick={simulateGeneration} disabled={!canGenerate() || generating} className="gap-2 w-full sm:w-auto" size="lg">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{generatedText ? 'Сгенерировать еще' : 'Сгенерировать описание'}</span>
                <span className="sm:hidden">Сгенерировать</span>
                <Badge variant="secondary" className="ml-1">
                  {priceLoading ? '...' : descriptionPrice} токенов
                </Badge>
              </Button>
            )}

            {!generating && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed mt-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>Стоимость: <strong>{priceLoading ? '...' : descriptionPrice} токенов</strong>. Описание генерирует нейросеть на основе введённых данных.</p>
              </div>
            )}
            
            {!canGenerate() && !generating && (
              <Alert className="bg-amber-500/10 border-amber-500/30 rounded-xl [&>svg]:!text-amber-600 dark:[&>svg]:!text-amber-400 [&>svg+div]:translate-y-0 items-center [&>svg]:!top-1/2 [&>svg]:!-translate-y-1/2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-700 dark:text-amber-300 font-medium text-xs sm:text-sm">
                  {getGuardMessage()}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </motion.div>

        {/* Generated Result */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="rounded-2xl border border-border/50 p-6 space-y-4 shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold mb-1"><FileText className="w-4 h-4 shrink-0" />Готовое описание</h3>
              <p className="text-sm text-muted-foreground">
                {generatedText ? `${generatedText.length} символов` : "Результат появится здесь"}
              </p>
            </div>
            {generatedText && <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-2">
                <Copy className="w-4 h-4" />
                Копировать
              </Button>}
          </div>

          {generatedText ? <div className="space-y-4">
              <Textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)} rows={8} className="bg-background/50 border-border/50 font-mono text-sm" />
              
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadAsFile('txt')} className="gap-2">
                  <Download className="w-4 h-4" />
                  TXT
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadAsFile('docx')} className="gap-2">
                  <Download className="w-4 h-4" />
                  DOCX
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadAsFile('pdf')} className="gap-2">
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
              </div>
            </div> : <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/30">
              <div className="text-center text-muted-foreground">
                {generating ? (
                  <>
                    <div className="relative w-10 h-10 mx-auto mb-3">
                      <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                      <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
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
            </div>}
        </motion.div>
      </div>
    </div>;
};
