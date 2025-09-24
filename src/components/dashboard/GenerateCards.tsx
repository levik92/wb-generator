import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Upload, 
  Download, 
  Eye, 
  Zap, 
  RefreshCw, 
  AlertTriangle,
  Image as ImageIcon,
  FileText as FileTextIcon
} from "lucide-react";

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
  { name: "Планкой", key: "planka", description: "Главное фото товара с отличными ключевыми преимуществами для привлечения СТР" },
  { name: "Свойства и преимущества", key: "benefits", description: "Карточка с описанием ключевых свойств и преимуществ товара" },
  { name: "Макро с составом или характеристиками", key: "macro", description: "Детальная схема с указанием состава, характеристик или материалов товара" },
  { name: "Сравнение с другими товарами", key: "comparison", description: "Карточка сравнения данного товара с аналогами или конкурентами" },
  { name: "Товар в использовании + руководство по использованию", key: "usage", description: "Демонстрация товара в процессе использования с инструкциями по применению" },
  { name: "Фото товара без информативки", key: "clean", description: "Чистое фото товара без дополнительных графических элементов и текста" },
];

export const GenerateCards = ({ profile, onTokensUpdate }: GenerateCardsProps) => {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedCardTypes, setSelectedCardTypes] = useState<number[]>([0]); // Default to first card
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isRegenerating, setIsRegenerating] = useState<{ [key: number]: boolean }>({});
  const [jobStatus, setJobStatus] = useState<string>("");
  const { toast } = useToast();
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Optimized polling with exponential backoff
  const pollJobStatus = async (jobId: string) => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('generation_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) {
          throw error;
        }

        setCurrentJob(data);
        setProgress((data.completed_cards / data.total_cards) * 100);

        if (data.status === 'completed' || data.status === 'failed') {
          isPollingRef.current = false;
          setIsGenerating(false);
          onTokensUpdate();
          
          if (data.status === 'completed') {
            toast({
              title: "Генерация завершена!",
              description: "Все карточки успешно сгенерированы",
            });
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Exponential backoff: 2s, 4s, 8s, then 5s intervals
          const delay = attempts < 4 ? Math.min(2000 * Math.pow(2, attempts - 1), 8000) : 5000;
          pollingRef.current = setTimeout(poll, delay);
        } else {
          isPollingRef.current = false;
          setIsGenerating(false);
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          pollingRef.current = setTimeout(poll, 5000);
        } else {
          isPollingRef.current = false;
          setIsGenerating(false);
        }
      }
    };

    poll();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
      isPollingRef.current = false;
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const validFiles = uploadedFiles.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== uploadedFiles.length) {
      toast({
        title: "Некорректные файлы",
        description: "Можно загружать только изображения",
        variant: "destructive",
      });
    }
    
    setFiles(prev => [...prev, ...validFiles].slice(0, 10));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const canGenerate = () => {
    return productName && category && description && files.length > 0 && selectedCardTypes.length > 0;
  };

  const getGuardMessage = () => {
    if (!productName) return "Укажите название товара";
    if (!category) return "Выберите категорию";
    if (!description) return "Добавьте описание";
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (selectedCardTypes.length === 0) return "Выберите тип карточки";
    return null;
  };

  const toggleCardSelection = (index: number) => {
    setSelectedCardTypes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleGenerate = async () => {
    if (!canGenerate()) {
      toast({
        title: "Заполните все поля",
        description: getGuardMessage(),
        variant: "destructive",
      });
      return;
    }

    const totalCost = selectedCardTypes.length * 10;
    if (profile.tokens_balance < totalCost) {
      toast({
        title: "Недостаточно токенов",
        description: `Для генерации нужно ${totalCost} токенов`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setJobStatus("Загрузка изображений...");

    try {
      // Upload images first
      const imageUrls: string[] = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`${profile.id}/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(uploadData.path);

        imageUrls.push(urlData.publicUrl);
      }

      setJobStatus("Создание задания...");

      // Create generation job
      const { data, error } = await supabase.functions.invoke('create-generation-job-v2', {
        body: {
          productName,
          category,
          description,
          userId: profile.id,
          productImages: imageUrls.map((url, index) => ({
            url: url,
            name: `image_${index + 1}.png`
          })),
          selectedCards: selectedCardTypes
        }
      });

      if (error) throw error;

      const jobId = data.jobId;
      pollJobStatus(jobId);

      toast({
        title: "Генерация началась",
        description: "Ваши карточки генерируются. Это займет несколько минут.",
      });

    } catch (error: any) {
      setIsGenerating(false);
      setJobStatus("");
      toast({
        title: "Ошибка генерации",
        description: error.message || "Произошла ошибка при генерации карточек",
        variant: "destructive",
      });
    }
  };

  const downloadCard = async (imageUrl: string, cardType: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeProductName = productName.replace(/[^a-z0-9_-]/gi, '');
      link.download = `${safeProductName}-${cardType}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Скачивание началось",
        description: `Карточка "${cardType}" скачивается`,
      });
    } catch (error) {
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать изображение",
        variant: "destructive",
      });
    }
  };

  const downloadAllCards = async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      await downloadCard(generatedImages[i], `card-${i + 1}`);
      // Add delay between downloads
      if (i < generatedImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const regenerateCard = async (cardIndex: number) => {
    if (!currentJob) return;
    
    setIsRegenerating(prev => ({ ...prev, [cardIndex]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-single-card-v2', {
        body: {
          jobId: currentJob.id,
          cardIndex: cardIndex,
          userId: profile.id
        }
      });

      if (error) throw error;
      
      onTokensUpdate();
      
      // Start polling for the updated job
      const pollRegeneration = async () => {
        const { data: updatedJob, error: pollError } = await supabase
          .from('generation_jobs')
          .select('*')
          .eq('id', currentJob.id)
          .single();

        if (pollError) throw pollError;

          if (updatedJob.product_images && Array.isArray(updatedJob.product_images)) {
            setGeneratedImages(updatedJob.product_images as string[]);
            setCurrentJob(updatedJob);
          }
      };

      // Poll for updates every 3 seconds for 1 minute
      let pollCount = 0;
      const maxPolls = 20;
      const pollInterval = setInterval(async () => {
        await pollRegeneration();
        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
        }
      }, 3000);

      toast({
        title: "Перегенерация началась",
        description: "Карточка перегенерируется...",
      });

    } catch (error: any) {
      toast({
        title: "Ошибка перегенерации",
        description: error.message || "Произошла ошибка при перегенерации карточки",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(prev => ({ ...prev, [cardIndex]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div>
        <h2 className="text-3xl font-semibold mb-2">Генерация карточек</h2>
        <p className="text-muted-foreground">
          Создайте профессиональные карточки для Wildberries с помощью ИИ
        </p>
      </div>

      {/* Beta Alert */}
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Бета-версия сервиса</strong>
        </AlertDescription>
      </Alert>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          <strong>Ранний доступ</strong><br />
          Сервис находится в раннем доступе. Все функции работают, но изредка могут возникать ошибки. Мы ежедневно работаем над его улучшением и видим все возникающие ошибки. Если что-то не сработает, просто подождите и попробуйте снова чуть позже.
        </AlertDescription>
      </Alert>

      {/* Image Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Изображения товара
          </CardTitle>
          <CardDescription>
            Загрузите качественные фотографии вашего товара с разных ракурсов (максимум 3 изображения)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Нажмите для загрузки или перетащите файлы
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, JPEG (макс. 3 изображения)
              </p>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-4 cursor-pointer"
                disabled={isGenerating}
              />
            </div>
            
            {files.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    {!isGenerating && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Information */}
      <Card>
        <CardHeader>
          <CardTitle>Информация о товаре</CardTitle>
          <CardDescription>
            Укажите детали товара для генерации оптимальных карточек
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Название товара</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Например: Спортивная куртка для зимнего бега"
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Категория</Label>
            <Select value={category} onValueChange={setCategory} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Одежда">Одежда</SelectItem>
                <SelectItem value="Обувь">Обувь</SelectItem>
                <SelectItem value="Аксессуары">Аксессуары</SelectItem>
                <SelectItem value="Электроника">Электроника</SelectItem>
                <SelectItem value="Дом и сад">Дом и сад</SelectItem>
                <SelectItem value="Красота и здоровье">Красота и здоровье</SelectItem>
                <SelectItem value="Спорт и отдых">Спорт и отдых</SelectItem>
                <SelectItem value="Автотовары">Автотовары</SelectItem>
                <SelectItem value="Детские товары">Детские товары</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание и пожелания</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите преимущества товара, основные характеристики и пожелания по дизайну и реализации. Чем больше и точнее информации, тем лучше результат..."
              className="min-h-[120px]"
              disabled={isGenerating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5" />
            Выбор карточек для генерации
          </CardTitle>
          <CardDescription>
            Выберите какие типы карточек вам нужны
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup className="space-y-4">
            {CARD_STAGES.map((stage, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div
                  className={`w-4 h-4 rounded border-2 mt-1 cursor-pointer transition-colors ${
                    selectedCardTypes.includes(index)
                      ? 'bg-wb-purple border-wb-purple'
                      : 'border-gray-300 hover:border-wb-purple'
                  }`}
                  onClick={() => toggleCardSelection(index)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <label 
                      className="font-medium cursor-pointer"
                      onClick={() => toggleCardSelection(index)}
                    >
                      {stage.name}
                    </label>
                    {selectedCardTypes.includes(index) && (
                      <Badge variant="secondary" className="bg-wb-purple/10 text-wb-purple">
                        Выбрано
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stage.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Стоимость: <Badge variant="secondary">{selectedCardTypes.length * 10} токенов</Badge> за {selectedCardTypes.length} изображение
              </p>
              {!canGenerate() && (
                <p className="text-sm text-red-600">
                  {getGuardMessage()}
                </p>
              )}
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate() || isGenerating || profile.tokens_balance < selectedCardTypes.length * 10}
              size="lg"
              className="bg-wb-purple hover:bg-wb-purple-dark"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Генерируем карточку ({selectedCardTypes.length * 10} токенов)
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Сгенерировать {selectedCardTypes.length} карточку ({selectedCardTypes.length * 10} токенов)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generation Progress */}
      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle>Прогресс генерации</CardTitle>
            <CardDescription>
              {jobStatus || (currentJob.status === 'completed' ? 'Генерация завершена!' : 'Создаем ваши карточки...')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Прогресс</span>
                <span>{currentJob.completed_cards || 0} из {currentJob.total_cards || selectedCardTypes.length}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {generatedImages.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Готовые карточки:</h4>
                  <Button onClick={downloadAllCards} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Скачать все
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Generated card ${index + 1}`}
                        className="w-full h-48 object-cover rounded-md border cursor-pointer"
                        onClick={() => window.open(imageUrl, '_blank')}
                        title="Кликните чтобы открыть в новом окне"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(imageUrl, '_blank');
                          }}
                          variant="secondary"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadCard(imageUrl, `card-${index + 1}`);
                          }}
                          variant="secondary"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            regenerateCard(index);
                          }}
                          variant="secondary"
                          disabled={isRegenerating[index] || profile.tokens_balance < 10}
                        >
                          {isRegenerating[index] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {profile.tokens_balance < 10 && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Загрузите хотя бы одно изображение
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};