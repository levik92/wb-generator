import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Image, Download, AlertCircle, Zap, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface GenerateCardsProps {
  profile: Profile;
  onTokensUpdate: () => void;
}

const CARD_STAGES = [
  { name: "Главная", description: "Главное фото товара" },
  { name: "Описание", description: "Товар в использовании" },
  { name: "Инфографика", description: "Характеристики и преимущества" },
  { name: "Погружение", description: "Сравнение с конкурентами" },
  { name: "Детализация", description: "Детальные фото и особенности" },
  { name: "Финал", description: "Призыв к действию" }
];

export const GenerateCards = ({ profile, onTokensUpdate }: GenerateCardsProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [generationHistory, setGenerationHistory] = useState<string[][]>([]);
  const [currentGenerationIndex, setCurrentGenerationIndex] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const { toast } = useToast();

  // Current generation is the active one being displayed
  const generatedImages = generationHistory[currentGenerationIndex] || [];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    if (uploadedFiles.length > 5) {
      toast({
        title: "Слишком много файлов",
        description: "Максимум 5 изображений за раз",
        variant: "destructive",
      });
      return;
    }
    setFiles(uploadedFiles);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const canGenerate = () => {
    return files.length > 0 && productName.trim() && category && description.trim() && profile.tokens_balance >= 6;
  };

  const getGuardMessage = () => {
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (!productName.trim()) return "Введите название товара";
    if (!category) return "Выберите категорию товара";
    if (!description.trim()) return "Добавьте описание товара";
    if (profile.tokens_balance < 6) return "Недостаточно токенов (нужно 6)";
    return null;
  };

  const simulateGeneration = async () => {
    setGenerating(true);
    setProgress(0);
    setCurrentStage(0);
    
    try {
      // Convert files to base64 for sending to API
      const productImages = await Promise.all(
        files.map(async (file) => {
          const reader = new FileReader();
          return new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      );

      const { data, error } = await supabase.functions.invoke('generate-cards', {
        body: {
          productName: productName,
          category,
          description,
          userId: profile.id,
          productImages
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Use the actual generated images from the response
      const newGeneration: string[] = data.images || [];

      // Simulate progress for UI
      for (let i = 0; i < CARD_STAGES.length; i++) {
        setCurrentStage(i);
        setProgress((i / CARD_STAGES.length) * 100);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setProgress(((i + 1) / CARD_STAGES.length) * 100);
      }
      
      // Add new generation to history and set as current
      setGenerationHistory(prev => [...prev, newGeneration]);
      setCurrentGenerationIndex(generationHistory.length);
      
      // Refresh profile to update token balance
      onTokensUpdate();
      
      toast({
        title: "Карточки созданы!",
        description: "Ваши карточки готовы к скачиванию",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось создать карточки",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadAll = () => {
    toast({
      title: "Скачивание начато",
      description: "Все изображения будут скачаны в ZIP архиве",
    });
  };

  const downloadSingle = (index: number) => {
    const link = document.createElement('a');
    link.href = generatedImages[index];
    link.download = `card_${index + 1}_${CARD_STAGES[index]?.name}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Скачивание началось",
      description: `Карточка "${CARD_STAGES[index]?.name}" скачивается`,
    });
  };

  const regenerateSingle = async (index: number) => {
    setRegeneratingIndex(index);
    
    try {
      // Convert files to base64 for sending to API
      const productImages = await Promise.all(
        files.map(async (file) => {
          const reader = new FileReader();
          return new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      );

      const { data, error } = await supabase.functions.invoke('regenerate-single-card', {
        body: {
          productName: productName,
          category,
          description,
          userId: profile.id,
          cardIndex: index,
          cardType: CARD_STAGES[index]?.name,
          productImages
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }
      
      // Replace the image at specific index in current generation
      const newHistory = [...generationHistory];
      const currentGeneration = [...newHistory[currentGenerationIndex]];
      currentGeneration[index] = data.regeneratedCard || currentGeneration[index];
      newHistory[currentGenerationIndex] = currentGeneration;
      setGenerationHistory(newHistory);
      
      // Refresh profile to update token balance
      onTokensUpdate();
      
      toast({
        title: "Карточка обновлена!",
        description: `Карточка "${CARD_STAGES[index]?.name}" успешно перегенерирована`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка перегенерации",
        description: error.message || "Не удалось перегенерировать карточку",
        variant: "destructive",
      });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden px-2 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-2">Генерация карточек</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Создайте 6 профессиональных карточек 960×1280 для Wildberries
        </p>
      </div>

      {/* Token Cost */}
      <Alert className="flex items-start justify-start py-4">
        <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <AlertDescription className="ml-3">
          <div className="flex flex-col space-y-1">
            <span>Стоимость генерации:</span>
            <span><strong>6 токенов</strong> за комплект из 6 изображений</span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Guard Messages */}
      {!canGenerate() && (
        <Alert variant="destructive" className="flex items-start justify-start text-left py-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <AlertDescription className="ml-3">{getGuardMessage()}</AlertDescription>
        </Alert>
      )}

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Загрузка изображений</CardTitle>
          <CardDescription>
            Загрузите до 5 фотографий товара на белом фоне
          </CardDescription>
        </CardHeader>
        <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-gray-50 overflow-hidden">
              <div className="flex flex-col items-center justify-center pt-2 pb-2 px-2">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 text-muted-foreground" />
                <p className="mb-1 sm:mb-2 text-xs text-muted-foreground text-center">
                  <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
                </p>
                <p className="text-xs text-muted-foreground text-center">PNG, JPG до 10MB каждый</p>
              </div>
              <Input
                type="file"
                className="hidden input-bordered"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
              />
            </label>
          </div>

            {files.length > 0 && (
              <div className="grid gap-2 sm:gap-4 grid-cols-3 sm:grid-cols-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-16 sm:h-24 object-cover rounded-lg border"
                    />
                    <Badge className="absolute -top-2 -left-2 bg-wb-purple">
                      {index + 1}
                    </Badge>
                    {/* Remove button - always visible */}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Name */}
      <Card>
        <CardHeader>
          <CardTitle>Название товара</CardTitle>
          <CardDescription>
            Введите точное название вашего товара
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="productName">Название товара</Label>
            <Input
              id="productName"
              placeholder="Например: Беспроводные наушники Apple AirPods Pro"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="border-2 border-border/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Категория товара</CardTitle>
          <CardDescription>
            Выберите категорию для лучшей генерации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="category">Категория товара</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="border-2 border-border/60">
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
        </CardContent>
      </Card>

      {/* Product Description */}
      <Card>
        <CardHeader>
          <CardTitle>Описание товара</CardTitle>
          <CardDescription>
            Опишите товар, его преимущества и пожелания по дизайну карточек
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              id="description"
              placeholder="Опишите ваш товар: основные характеристики, преимущества, целевую аудиторию. Добавьте пожелания по стилю карточек, цветовой гамме, акцентам..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-bordered text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Чем подробнее описание, тем лучше будут карточки
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generation Process */}
      {generating && (
        <Card>
          <CardHeader>
            <CardTitle>Генерация в процессе...</CardTitle>
            <CardDescription>
              Этап {currentStage + 1} из {CARD_STAGES.length}: {CARD_STAGES[currentStage]?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {CARD_STAGES[currentStage]?.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Results */}
      {generatedImages.length > 0 && !generating && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Готовые карточки</CardTitle>
                <CardDescription>
                  {generatedImages.length} карточек готовы к скачиванию
                </CardDescription>
              </div>
              {generationHistory.length > 1 && (
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border order-last sm:order-none">
                  <Button
                    onClick={() => setCurrentGenerationIndex(Math.max(0, currentGenerationIndex - 1))}
                    disabled={currentGenerationIndex === 0}
                    size="sm"
                    variant="outline"
                    className="px-3 py-1 h-8"
                  >
                    ←
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {currentGenerationIndex + 1} / {generationHistory.length}
                  </span>
                  <Button
                    onClick={() => setCurrentGenerationIndex(Math.min(generationHistory.length - 1, currentGenerationIndex + 1))}
                    disabled={currentGenerationIndex === generationHistory.length - 1}
                    size="sm"
                    variant="outline"
                    className="px-3 py-1 h-8"
                  >
                    →
                  </Button>
                </div>
              )}
              <Button onClick={downloadAll} className="bg-wb-purple hover:bg-wb-purple-dark" size="sm">
                <Download className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Скачать все</span>
                <span className="sm:hidden">Все</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop view */}
            <div className="hidden sm:grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
              {generatedImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Generated card ${index + 1}`}
                    className="w-full aspect-[3/4] object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                     <Button size="sm" className="bg-wb-purple hover:bg-wb-purple-dark" onClick={() => downloadSingle(index)}>
                       <Download className="w-4 h-4 mr-2" />
                       Скачать
                     </Button>
                     <Button 
                       size="sm" 
                       variant="outline" 
                       onClick={() => regenerateSingle(index)}
                       disabled={regeneratingIndex === index}
                       className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:border-white/50 disabled:bg-white/10"
                     >
                       {regeneratingIndex === index ? (
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       ) : (
                         <Image className="w-4 h-4 mr-2" />
                       )}
                       Сгенерировать заново
                     </Button>
                  </div>
                  <Badge className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-wb-purple text-xs">
                    {CARD_STAGES[index]?.name}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Mobile view */}
            <div className="sm:hidden space-y-4">
              {generatedImages.map((imageUrl, index) => (
                <div key={index} className="relative">
                  <img
                    src={imageUrl}
                    alt={`Generated card ${index + 1}`}
                    className="w-full aspect-[3/4] object-cover rounded-lg border"
                  />
                  <Badge className="absolute top-2 left-2 bg-wb-purple text-xs">
                    {CARD_STAGES[index]?.name}
                  </Badge>
                   <div className="flex gap-2 mt-3">
                     <Button 
                       size="sm" 
                       className="bg-wb-purple hover:bg-wb-purple-dark"
                       onClick={() => downloadSingle(index)}
                     >
                       <Download className="w-4 h-4" />
                     </Button>
                     <Button 
                       size="sm" 
                       variant="outline" 
                       className="flex-1"
                       onClick={() => regenerateSingle(index)}
                       disabled={regeneratingIndex === index}
                     >
                       {regeneratingIndex === index ? (
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       ) : (
                         <Image className="w-4 h-4 mr-2" />
                       )}
                       Перегенерировать
                     </Button>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={simulateGeneration}
            disabled={!canGenerate() || generating}
            className={generatedImages.length > 0 ? 
              "w-full bg-wb-purple hover:bg-wb-purple-dark hidden sm:flex" : 
              "w-full bg-wb-purple hover:bg-wb-purple-dark"
            }
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Генерирую... (это может занять несколько минут)</span>
                <span className="sm:hidden">Генерирую...</span>
              </>
            ) : (
              <>
                <Image className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">
                  {generatedImages.length > 0 ? 'Сгенерировать еще варианты' : 'Сгенерировать карточки'}
                </span>
                <span className="sm:hidden">
                  {generatedImages.length > 0 ? 'Еще варианты' : 'Генерация'}
                </span>
              </>
            )}
          </Button>
          
          {/* Mobile button for regenerate */}
          {generatedImages.length > 0 && (
            <Button 
              onClick={simulateGeneration}
              disabled={!canGenerate() || generating}
              className="w-full bg-wb-purple hover:bg-wb-purple-dark sm:hidden mt-2"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Генерирую...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4 mr-2" />
                  Еще варианты
                </>
              )}
            </Button>
          )}
          <p className="text-center text-sm text-muted-foreground mt-3">
            Стоимость: <strong>6 токенов</strong> за комплект из 6 изображений
          </p>
          
          {generatedImages.length > 0 && (
            <Alert className="mt-4 border-wb-purple/20 bg-wb-purple/5">
              <Zap className="h-4 w-4 text-wb-purple" />
              <AlertDescription>
                <strong>Перегенерация одного изображения = 1 токен</strong>
              </AlertDescription>
            </Alert>
          )}
          
          {generating && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Важно:</strong> Генерация карточек может занять несколько минут. 
                Пожалуйста, не закрывайте страницу и не перезагружайте её.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};