import { useState, useEffect, useCallback, useRef } from "react";
import { compressImage, compressImages } from "@/lib/imageCompression";
import { isTelegramWebApp } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Download, Zap, RefreshCw, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['JPG', 'PNG', 'WebP'];
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { useActiveAiModel, getEdgeFunctionName, getImageEdgeFunctionName } from "@/hooks/useActiveAiModel";

interface Profile {
  id: string;
  tokens_balance: number;
}

interface OptimizedGenerateCardsProps {
  profile: Profile;
  onTokensUpdate: () => void;
}

interface JobStatus {
  id: string;
  status: string;
  completed_cards: number;
  total_cards: number;
  product_images: any; // JSON type from Supabase
}

export function OptimizedGenerateCards({ profile, onTokensUpdate }: OptimizedGenerateCardsProps) {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { price: photoPrice, isLoading: priceLoading } = useGenerationPrice('photo_generation');
  const { data: activeModel } = useActiveAiModel();
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  
  const totalCost = photoPrice * 6; // 6 cards

  // Optimized polling with exponential backoff
  const pollJobStatus = useCallback(async (jobId: string) => {
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
  }, [onTokensUpdate, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
      isPollingRef.current = false;
    };
  }, []);

  // Validate files for size and format
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: `"${file.name}" — неподдерживаемый формат. Разрешены: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { valid: false, error: `"${file.name}" (${sizeMB} МБ) — превышает лимит 3 МБ. Пожалуйста, сожмите изображение.` };
    }
    return { valid: true };
  };

  // Check if all current files are valid
  const getValidationErrors = useCallback(() => {
    const errors: string[] = [];
    files.forEach(file => {
      const result = validateFile(file);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    });
    if (referenceImage) {
      const result = validateFile(referenceImage);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }
    return errors;
  }, [files, referenceImage]);

  // Update errors when files change
  useEffect(() => {
    setFileErrors(getValidationErrors());
  }, [getValidationErrors]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    
    // Filter and validate files
    const validFormatFiles = uploadedFiles.filter(file => ALLOWED_TYPES.includes(file.type));
    
    if (validFormatFiles.length !== uploadedFiles.length) {
      toast({
        title: "Некорректные файлы",
        description: `Разрешены только форматы: ${ALLOWED_EXTENSIONS.join(', ')}`,
        variant: "destructive",
      });
    }
    
    const combined = [...files, ...validFormatFiles];
    if (combined.length > 3) {
      toast({
        title: "Превышен лимит",
        description: "Можно загрузить максимум 3 изображения товара",
        variant: "destructive"
      });
      setFiles(combined.slice(0, 3));
    } else {
      setFiles(combined);
    }
  };

  const handleReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Некорректный формат",
          description: `Разрешены только форматы: ${ALLOWED_EXTENSIONS.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast({
          title: "Файл слишком большой",
          description: `"${file.name}" (${sizeMB} МБ) превышает лимит 3 МБ. Пожалуйста, сожмите изображение.`,
          variant: "destructive",
        });
        return;
      }
      setReferenceImage(file);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeReference = () => {
    setReferenceImage(null);
  };

  const handleGenerate = async () => {
    if (!productName || !description) {
      toast({
        title: "Заполните все поля",
        description: "Необходимо указать название и описание товара",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Загрузите изображения",
        description: "Необходимо загрузить хотя бы одно изображение товара",
        variant: "destructive",
      });
      return;
    }

    if (profile.tokens_balance < totalCost) {
      toast({
        title: "Недостаточно токенов",
        description: `Для генерации 6 карточек нужно ${totalCost} токенов`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Compress images before upload
      const compressedFiles = await compressImages(files);

      // Upload product images first
      const imageUrls: string[] = [];
      
      for (const file of compressedFiles) {
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

      // Upload reference image if provided
      let referenceImageUrl: string | null = null;
      if (referenceImage) {
        const compressedRef = await compressImage(referenceImage);
        const fileExt = compressedRef.name.split('.').pop();
        const fileName = `${profile.id}/reference_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, compressedRef);

        if (uploadError) {
          console.error('Reference upload error:', uploadError);
          toast({
            title: "Ошибка загрузки референса",
            description: "Не удалось загрузить референс. Попробуйте снова",
            variant: "destructive"
          });
        } else {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(uploadData.path);
          referenceImageUrl = urlData.publicUrl;
        }
      }

      // Create generation job
      const functionName = getImageEdgeFunctionName('create-generation-job', activeModel || 'openai');
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          productName,
          category,
          description: autoOptimize ? 'Самостоятельно придумай и определи наилучшие параметры для достижения результата.' : description,
          userId: profile.id,
          productImages: imageUrls.map((url, index) => ({
            url: url,
            name: `image_${index + 1}.png`
          })),
          referenceImageUrl,
          selectedCards: [0, 1, 2, 3, 4, 5] // Все карточки
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
      toast({
        title: "Ошибка генерации",
        description: "Не удалось запустить генерацию. Попробуйте позже",
        variant: "destructive",
      });
    }
  };

  const downloadCard = async (imageUrl: string, cardType: string) => {
    try {
      // In Telegram WebView, open image directly
      if (isTelegramWebApp()) {
        window.open(imageUrl, '_blank');
        toast({
          title: "Изображение открыто",
          description: `Сохраните "${cardType}" из открывшегося окна`,
        });
        return;
      }

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

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div>
        <h2 className="text-3xl font-bold mb-2">Генерация карточек</h2>
        <p className="text-muted-foreground">
          Создайте профессиональные карточки для Wildberries с помощью ИИ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-wb-purple" />
            Информация о товаре
          </CardTitle>
          <CardDescription>
            Опишите ваш товар для создания уникальных карточек
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Название товара</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Например: Беспроводные наушники AirPods"
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание и пожелания</Label>
            <Textarea
              id="description"
              value={autoOptimize ? 'Самостоятельно придумай и определи наилучшие параметры для достижения результата.' : description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите преимущества товара, основные характеристики и пожелания по дизайну и реализации. Чем больше и точнее информации, тем лучше результат..."
              className="min-h-[100px]"
              disabled={isGenerating || autoOptimize}
            />
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="autoOptimize"
                checked={autoOptimize}
                onChange={(e) => {
                  setAutoOptimize(e.target.checked);
                  if (e.target.checked) {
                    setDescription('');
                  }
                }}
                disabled={isGenerating}
                className="rounded border-gray-300"
              />
              <Label
                htmlFor="autoOptimize"
                className="text-sm font-normal cursor-pointer"
              >
                Придумай сам — доверь AI подбор параметров
              </Label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Фото товара
                <span className="text-muted-foreground text-xs ml-2">(до 3 изображений)</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Загрузите качественные фото вашего товара
              </p>
              <Input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={isGenerating}
                className="cursor-pointer"
              />
              
              {files.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Товар ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md border"
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

            <div className="space-y-2">
              <Label>
                Референс дизайна (опционально)
                <span className="text-muted-foreground text-xs ml-2">(1 изображение)</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Загрузите пример карточки или дизайна, стиль которого хотите использовать
              </p>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleReferenceUpload}
                disabled={isGenerating}
                className="cursor-pointer"
              />
              
              {referenceImage && (
                <div className="mt-4">
                  <div className="relative group max-w-xs">
                    <img
                      src={URL.createObjectURL(referenceImage)}
                      alt="Референс"
                      className="w-full h-40 object-cover rounded-md border"
                    />
                    {!isGenerating && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={removeReference}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors Alert */}
          {fileErrors.length > 0 && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Исправьте ошибки перед генерацией:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {fileErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Стоимость: <Badge variant="secondary">{priceLoading ? "..." : `${totalCost} токенов`}</Badge>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || profile.tokens_balance < totalCost || priceLoading || fileErrors.length > 0}
                className="bg-wb-purple hover:bg-wb-purple-dark"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Сгенерировать карточки
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Макс. размер файла: 3 МБ • Форматы: {ALLOWED_EXTENSIONS.join(', ')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle>Прогресс генерации</CardTitle>
            <CardDescription>
              {currentJob.status === 'completed' ? 'Генерация завершена!' : 'Создаем ваши карточки...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-2 sm:px-4 lg:px-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Прогресс</span>
                <span>{currentJob.completed_cards} из {currentJob.total_cards}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {currentJob.status === 'completed' && Array.isArray(currentJob.product_images) && currentJob.product_images.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Готовые карточки:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {(currentJob.product_images as string[]).map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Generated card ${index + 1}`}
                        className="w-full h-48 object-cover rounded-md border cursor-pointer"
                        onClick={() => window.open(imageUrl, '_blank')}
                        title="Кликните чтобы открыть в новом окне"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadCard(imageUrl, `card-${index + 1}`);
                          }}
                          className="bg-white text-black hover:bg-gray-100"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Скачать
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
    </div>
  );
}