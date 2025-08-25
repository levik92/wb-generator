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
import { FileText, Copy, Download, AlertCircle, Zap, Loader2 } from "lucide-react";

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

  const canGenerate = () => {
    return productName && category && competitor1 && keywords && profile.tokens_balance >= 1;
  };

  const getGuardMessage = () => {
    if (!productName) return "Введите название товара";
    if (!category) return "Выберите категорию товара";
    if (!competitor1) return "Добавьте хотя бы одну ссылку на конкурента";
    if (!keywords) return "Добавьте ключевые слова";
    if (profile.tokens_balance < 1) return "Недостаточно токенов (нужен 1)";
    return null;
  };

  const simulateGeneration = async () => {
    setGenerating(true);
    setGeneratedText("");
    
    try {
      const competitors = [competitor1, competitor2, competitor3].filter(Boolean);
      const keywordsList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: {
          productName,
          category,
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Генерация описаний</h2>
        <p className="text-muted-foreground">
          Создайте SEO-оптимизированное описание товара (1000-2000 символов)
        </p>
      </div>

      {/* Token Cost */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          Стоимость генерации: <strong>1 токен</strong> за описание
        </AlertDescription>
      </Alert>

      {/* Guard Messages */}
      {!canGenerate() && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getGuardMessage()}</AlertDescription>
        </Alert>
      )}

      {/* Input Form */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
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
                onChange={(e) => setProductName(e.target.value)}
                className="input-bordered"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория товара</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="input-bordered">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Электроника">Электроника</SelectItem>
                  <SelectItem value="Одежда">Одежда</SelectItem>
                  <SelectItem value="Обувь">Обувь</SelectItem>
                  <SelectItem value="Дом и сад">Дом и сад</SelectItem>
                  <SelectItem value="Красота и здоровье">Красота и здоровье</SelectItem>
                  <SelectItem value="Спорт">Спорт</SelectItem>
                  <SelectItem value="Детские товары">Детские товары</SelectItem>
                  <SelectItem value="Автотовары">Автотовары</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ссылки на конкурентов</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Ссылка на конкурента 1 (обязательно)"
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
                Вставьте ссылки на похожие товары с WB для лучшего анализа
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Ключевые слова</Label>
              <Input
                id="keywords"
                placeholder="ключ1, ключ2, ключ3"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="input-bordered"
              />
              <p className="text-xs text-muted-foreground">
                Разделяйте запятыми
              </p>
            </div>

            <Button 
              onClick={simulateGeneration}
              disabled={!canGenerate() || generating}
              className="w-full bg-wb-purple hover:bg-wb-purple-dark"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Генерирую...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Сгенерировать описание (1 токен)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Result */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Готовое описание</CardTitle>
                <CardDescription>
                  {generatedText ? `${generatedText.length} символов` : "Результат появится здесь"}
                </CardDescription>
              </div>
              {generatedText && (
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4" />
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
                  rows={12}
                  className="font-mono text-sm input-bordered"
                />
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadAsFile('txt')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    TXT
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadAsFile('docx')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    DOCX
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadAsFile('pdf')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>Описание появится после генерации</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};