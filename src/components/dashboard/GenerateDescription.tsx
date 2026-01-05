import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, FileText, Loader2, AlertCircle, Copy, Download, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { useActiveAiModel, getEdgeFunctionName } from "@/hooks/useActiveAiModel";
import { LightningLoader } from "@/components/ui/lightning-loader";

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

export const GenerateDescription = ({ profile, onTokensUpdate }: GenerateDescriptionProps) => {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [competitor1, setCompetitor1] = useState("");
  const [competitor2, setCompetitor2] = useState("");
  const [competitor3, setCompetitor3] = useState("");
  const [keywords, setKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const { toast } = useToast();
  const { price: descriptionPrice, isLoading: priceLoading } = useGenerationPrice('description_generation');
  const { data: activeModel, isLoading: modelLoading } = useActiveAiModel();

  const canGenerate = () => {
    return productName.trim() && 
           productName.trim().length <= 150 && 
           productName.trim().length >= 3 &&
           keywords.trim().length <= 1200 &&
           profile.tokens_balance >= descriptionPrice &&
           !priceLoading;
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

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedText(data.description);
      onTokensUpdate();
      
      toast({
        title: "Описание создано!",
        description: "Описание товара успешно сгенерировано",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось создать описание",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    toast({
      title: "Скопировано!",
      description: "Описание скопировано в буфер обмена",
    });
  };

  const downloadAsFile = (format: 'txt' | 'docx' | 'pdf') => {
    toast({
      title: "Скачивание начато",
      description: `Файл в формате ${format.toUpperCase()} будет скачан`,
    });
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          Генерация описаний
        </h2>
        <p className="text-muted-foreground">
          Создайте профессиональное описание товара для Wildberries
        </p>
      </motion.div>

      {/* Feature Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Умный текст, который продаёт</h3>
              <p className="text-sm text-muted-foreground">
                Подбор стиля, ключевых слов и эмоциональных акцентов
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm">
              CTR и конверсия растут — время на описание <span className="font-semibold text-primary">30 секунд</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input Form */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-5"
        >
          <div>
            <h3 className="text-lg font-semibold mb-1">Параметры генерации</h3>
            <p className="text-sm text-muted-foreground">Заполните данные для создания уникального описания</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Название товара</Label>
              <Input
                id="productName"
                placeholder="Например: Беспроводные наушники AirPods"
                value={productName}
                onChange={(e) => setProductName(e.target.value.slice(0, 150))}
                maxLength={150}
                className="bg-background/50 border-border/50 focus:border-primary/50"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{productName.length}/150 символов</span>
                {productName.length > 140 && (
                  <span className="text-amber-500">Осталось: {150 - productName.length}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ссылки на конкурентов <span className="text-muted-foreground">(необязательно)</span></Label>
              <div className="space-y-2">
                <Input
                  placeholder="Ссылка на конкурента 1"
                  value={competitor1}
                  onChange={(e) => setCompetitor1(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                />
                <Input
                  placeholder="Ссылка на конкурента 2"
                  value={competitor2}
                  onChange={(e) => setCompetitor2(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                />
                <Input
                  placeholder="Ссылка на конкурента 3"
                  value={competitor3}
                  onChange={(e) => setCompetitor3(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                WB Генератор проанализирует описания конкурентов и выделит ключевые слова
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Ключевые слова</Label>
              <Textarea
                id="keywords"
                placeholder="Введите ключевые слова через запятую: Ключ1, ключ2, ключ3"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value.slice(0, 1200))}
                maxLength={1200}
                className="bg-background/50 border-border/50 focus:border-primary/50 min-h-[80px] resize-none"
                rows={3}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Разделяйте запятыми (необязательно)</span>
                <span>{keywords.length}/1200</span>
              </div>
            </div>

            <Button 
              onClick={simulateGeneration}
              disabled={!canGenerate() || generating}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold rounded-xl"
            >
              {generating ? (
                <span className="flex items-center gap-3">
                  <LightningLoader size="sm" />
                  <span>Генерирую описание...</span>
                </span>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {generatedText ? 'Сгенерировать еще' : 'Сгенерировать описание'}
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              <span>Стоимость: <strong className="text-foreground">{priceLoading ? '...' : descriptionPrice} токенов</strong></span>
            </div>
            
            {!canGenerate() && (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-600 dark:text-amber-400">
                  {getGuardMessage()}
                </AlertDescription>
              </Alert>
            )}
            
            {generating && (
              <Alert className="border-primary/30 bg-primary/10">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong>Важно:</strong> Генерация может занять несколько минут. Не закрывайте страницу.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </motion.div>

        {/* Generated Result */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Готовое описание</h3>
              <p className="text-sm text-muted-foreground">
                {generatedText ? `${generatedText.length} символов` : "Результат появится здесь"}
              </p>
            </div>
            {generatedText && (
              <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-2">
                <Copy className="w-4 h-4" />
                Копировать
              </Button>
            )}
          </div>

          {generatedText ? (
            <div className="space-y-4">
              <Textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={8}
                className="bg-background/50 border-border/50 font-mono text-sm"
              />
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadAsFile('txt')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  TXT
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadAsFile('docx')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  DOCX
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadAsFile('pdf')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/30">
              <div className="text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Описание появится после генерации</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
