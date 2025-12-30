import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, FileText, Loader2, AlertCircle, Copy, Download, Sparkles, TrendingUp, Clock } from "lucide-react";
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
    // Check if model is loaded
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
      
      // Refresh profile to update token balance
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
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden px-2 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Генерация описаний</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Создайте профессиональное описание товара для Wildberries
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20">
        <CardContent className="pt-4 sm:pt-5 pb-4 sm:pb-5">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Умный текст, который продаёт
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Забудь про скучные шаблоны. Генератор описаний от WB Генератор подбирает стиль, ключевые слова и эмоциональные акценты так, чтобы карточка выглядела профессионально и попадала в поиск Wildberries.
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-primary/10">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  CTR и конверсия растут — время на описание сокращается до 30 секунд
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Input Form */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>Параметры генерации</CardTitle>
            <CardDescription>
              Заполните данные для создания уникального описания
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Название товара</Label>
              <Input
                id="productName"
                placeholder="Например: Беспроводные наушники AirPods"
                value={productName}
                onChange={(e) => setProductName(e.target.value.slice(0, 150))}
                maxLength={150}
                className="input-bordered"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{productName.length}/150 символов</span>
                {productName.length > 140 && (
                  <span className="text-warning">Осталось символов: {150 - productName.length}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ссылки на конкурентов</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Ссылка на конкурента 1 (по желанию)"
                  value={competitor1}
                  onChange={(e) => setCompetitor1(e.target.value)}
                  className="input-bordered"
                />
                <Input
                  placeholder="Ссылка на конкурента 2 (по желанию)"
                  value={competitor2}
                  onChange={(e) => setCompetitor2(e.target.value)}
                  className="input-bordered"
                />
                <Input
                  placeholder="Ссылка на конкурента 3 (по желанию)"
                  value={competitor3}
                  onChange={(e) => setCompetitor3(e.target.value)}
                  className="input-bordered"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Вставьте ссылки на ваших конкурентов. WB Генератор проанализирует описание их товаров, выделит самые релевантные ключевые слова и учтет их при разработке вашего.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Ключевые слова</Label>
              <Textarea
                id="keywords"
                placeholder="Введите ключевые слова через запятую в формате: Ключ1, ключ2, ключ3 и т.д."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value.slice(0, 1200))}
                maxLength={1200}
                className="input-bordered min-h-[80px] resize-none"
                rows={3}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Разделяйте запятыми (необязательное поле)</span>
                <span>{keywords.length}/1200 символов</span>
              </div>
              {keywords.length > 1140 && (
                <div className="text-xs text-warning">
                  Осталось символов: {1200 - keywords.length}
                </div>
              )}
            </div>

            <Button 
              onClick={simulateGeneration}
              disabled={!canGenerate() || generating}
              className="w-full bg-wb-purple hover:bg-wb-purple-dark"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Генерирую... (это может занять несколько минут)</span>
                  <span className="sm:hidden">Генерирую...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {generatedText ? 'Сгенерировать еще варианты' : 'Сгенерировать описание'}
                </>
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Стоимость: <strong>{priceLoading ? '...' : descriptionPrice} токен{descriptionPrice !== 1 ? 'ов' : ''}</strong> за генерацию описания
              </p>
            </div>
            
            {!canGenerate() && (
              <Alert className="mt-4 border-amber-500/30 bg-amber-500/10 dark:border-amber-400/30 dark:bg-amber-400/10 [&>svg]:!text-amber-700 dark:[&>svg]:!text-amber-400 [&>svg+div]:translate-y-0 items-center [&>svg]:!top-1/2 [&>svg]:!-translate-y-1/2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-amber-800 dark:text-amber-300 font-medium">
                  {getGuardMessage()}
                </AlertDescription>
              </Alert>
            )}
            
            {generating && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Важно:</strong> Генерация может занять несколько минут. 
                  Пожалуйста, не закрывайте страницу и не перезагружайте её.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Generated Result */}
        <Card className="bg-muted/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="mb-3">Готовое описание</CardTitle>
                <CardDescription>
                  {generatedText ? `${generatedText.length} символов` : "Результат появится здесь"}
                </CardDescription>
              </div>
              {generatedText && (
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={copyToClipboard}>
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedText ? (
              <div className="space-y-4">
                <Textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  rows={8}
                  className="font-mono text-xs sm:text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                />
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadAsFile('txt')}
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    TXT
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadAsFile('docx')}
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    DOCX
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadAsFile('pdf')}
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-sm">Описание появится после генерации</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};