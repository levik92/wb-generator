import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Download, Zap, RefreshCw, Image as ImageIcon } from "lucide-react";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { useActiveAiModel, getEdgeFunctionName } from "@/hooks/useActiveAiModel";

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
  const [files, setFiles] = useState<File[]>([]);
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

      // Create generation job
      const functionName = getEdgeFunctionName('create-generation-job-v2', activeModel || 'openai');
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          productName,
          category,
          description,
          userId: profile.id,
          productImages: imageUrls.map((url, index) => ({
            url: url,
            name: `image_${index + 1}.png`
          })),
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

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div>
        <h2 className="text-3xl font-semibold mb-2">Генерация карточек</h2>
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите преимущества товара, основные характеристики и пожелания по дизайну и реализации. Чем больше и точнее информации, тем лучше результат..."
              className="min-h-[100px]"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label>Изображения товара (до 10 фото)</Label>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isGenerating}
              className="cursor-pointer"
            />
            
            {files.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded-md border"
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

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Стоимость: <Badge variant="secondary">{priceLoading ? "..." : `${totalCost} токенов`}</Badge>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || profile.tokens_balance < totalCost || priceLoading}
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