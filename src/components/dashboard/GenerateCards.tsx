import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, Images, Loader2, Upload, X, AlertCircle, Download, Zap, RefreshCw, Clock, CheckCircle2, Eye } from "lucide-react";

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
  { name: "Главная", key: "cover", description: "Основная карточка товара на белом фоне с четким изображением продукта" },
  { name: "Образ жизни", key: "lifestyle", description: "Товар в реальной обстановке использования, показывает как продукт интегрируется в жизнь" },
  { name: "Макро", key: "macro", description: "Детальная съемка материалов, текстур и особенностей товара крупным планом" },
  { name: "До/После", key: "beforeAfter", description: "Демонстрация результата использования товара в формате сравнения" },
  { name: "Комплект", key: "bundle", description: "Показывает товар в составе комплекта или с дополнительными аксессуарами" },
  { name: "Гарантия", key: "guarantee", description: "Карточка, подчеркивающая качество, надежность и гарантии производителя" }
];

export const GenerateCards = ({ profile, onTokensUpdate }: GenerateCardsProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCards, setSelectedCards] = useState<number[]>([0]); // По умолчанию выбрана только главная
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [fullscreenImage, setFullscreenImage] = useState<any | null>(null);
  const [regeneratingCards, setRegeneratingCards] = useState<Set<string>>(new Set());
  const [completionNotificationShown, setCompletionNotificationShown] = useState(false);
  const [jobCompleted, setJobCompleted] = useState(false);
  const [previousJobStatus, setPreviousJobStatus] = useState<string | null>(null);
  const { toast } = useToast();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);


  useEffect(() => {
    if (generating) {
      setGeneratedImages([]);
    }
  }, [generating]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);

    if (uploadedFiles.length + files.length > 3) {
      toast({
        title: "Слишком много файлов",
        description: "Максимум 3 изображения товара",
        variant: "destructive",
      });
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    const oversizedFiles = uploadedFiles.filter(file => file.size > maxSizeBytes);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "Файлы слишком большие",
        description: "Максимальный размер файла: 10 МБ",
        variant: "destructive",
      });
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = uploadedFiles.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Неподдерживаемый формат",
        description: "Поддерживаются только JPG, PNG и WebP файлы",
        variant: "destructive",
      });
      return;
    }
    
    setFiles(prev => [...prev, ...uploadedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const canGenerate = () => {
    const tokensNeeded = selectedCards.length * 10;
    return files.length > 0 && 
           productName.trim() && 
           category && 
           description.trim() && 
           selectedCards.length > 0 &&
           profile.tokens_balance >= tokensNeeded && 
           !generating;
  };

  const getGuardMessage = () => {
    const tokensNeeded = selectedCards.length * 10;
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (!productName.trim()) return "Введите название товара";
    if (!category) return "Выберите категорию товара";
    if (!description.trim()) return "Добавьте описание товара";
    if (selectedCards.length === 0) return "Выберите хотя бы один тип карточки";
    if (profile.tokens_balance < tokensNeeded) return `Недостаточно токенов (нужно ${tokensNeeded})`;
    if (generating) return "Генерация уже выполняется";
    return null;
  };

  const handleCardToggle = (cardIndex: number) => {
    setSelectedCards(prev => {
      if (prev.includes(cardIndex)) {
        if (prev.length === 1) return prev;
        return prev.filter(i => i !== cardIndex);
      } else {
        return [...prev, cardIndex].sort((a, b) => a - b);
      }
    });
  };

  const startJobPolling = (jobId: string) => {
    // Prevent duplicate polling for the same job
    if (pollingInterval || currentJobId === jobId) {
      console.log(`Polling already active for job ${jobId}, skipping`);
      return;
    }
    
    console.log(`Starting polling for job ${jobId}`);
    setCurrentJobId(jobId);
    
    const pollJob = async () => {
      try {
          if (jobCompleted) {
            console.log('Stopping poll - job already completed');
            return;
          }
        
        const { data: job, error } = await supabase
          .from('generation_jobs')
          .select(`
            *,
            generation_tasks (
              id,
              card_index,
              card_type,
              status,
              image_url,
              storage_path
            )
          `)
          .eq('id', jobId)
          .single();

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        if (job) {
          const completedTasks = job.generation_tasks?.filter((t: any) => t.status === 'completed') || [];
          const processingTasks = job.generation_tasks?.filter((t: any) => t.status === 'processing') || [];
          const failedTasks = job.generation_tasks?.filter((t: any) => t.status === 'failed') || [];
          const retryingTasks = job.generation_tasks?.filter((t: any) => t.status === 'retrying') || [];
          
          const progressPercent = (completedTasks.length / selectedCards.length) * 100;
          
          setProgress(progressPercent);
          setCurrentStage(completedTasks.length);

          // Set job status for display
          if (job.status === 'processing') {
            if (retryingTasks.length > 0) {
              setJobStatus(`Обработка... (${retryingTasks.length} задач ожидают повтора)`);
            } else if (processingTasks.length > 0) {
              setJobStatus(`Генерация... (${processingTasks.length} активных)`);
            } else {
              setJobStatus('Обработка...');
            }
          } else {
            setJobStatus(job.status);
          }

          // Update generated images
          if (completedTasks.length > 0) {
            const images = completedTasks
              .sort((a: any, b: any) => a.card_index - b.card_index)
              .map((task: any) => ({
                id: task.id,
                url: task.image_url,
                stage: CARD_STAGES[task.card_index]?.name || `Card ${task.card_index}`,
                stageIndex: task.card_index
              }));
            setGeneratedImages(images);
          }

          // Check if ALL cards are completed (not just job status)
          const totalCards = selectedCards.length;
          const allCompleted = completedTasks.length === totalCards;
          const hasFailures = failedTasks.length > 0;
          const shouldStopPolling = allCompleted || job.status === 'failed' || job.status === 'completed';
          
          if (shouldStopPolling) {
            setGenerating(false);
            setJobCompleted(true); // Mark job as completed (success or fail)
            
            // Show completion notification only on status transition (not on repeated polls)
            const jobStatusChanged = previousJobStatus !== job.status;
            const jobJustCompleted = job.status === 'completed' && jobStatusChanged && !completionNotificationShown;
            
            // Update previous status for next comparison
            setPreviousJobStatus(job.status);
            
            if (allCompleted && jobJustCompleted) {
              setCompletionNotificationShown(true);
              toast({
                title: "Генерация завершена!",
                description: `Все карточки готовы для скачивания`,
              });
              
              // Save to history
              try {
                await supabase.from('generations').insert({
                  user_id: profile.id,
                  generation_type: 'cards',
                  input_data: {
                    productName,
                    category,
                    description,
                    selectedCards: selectedCards.map(index => CARD_STAGES[index].name)
                  },
                  output_data: {
                    images: completedTasks.map((task: any) => ({
                      url: task.image_url,
                      type: task.card_type,
                      stage: CARD_STAGES[task.card_index]?.name
                    }))
                  },
                  tokens_used: selectedCards.length * 10, // 10 токенов за изображение
                  status: 'completed'
                });
              } catch (error) {
                console.error('Error saving to history:', error);
              }
            } else if (job.status === 'failed') {
              toast({
                title: "Ошибка генерации", 
                description: job.error_message || "Генерация не удалась",
                variant: "destructive",
              });
            }
            
            // Clean up polling only when completely done
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
            setCurrentJobId(null);
            onTokensUpdate?.();
            return
          }
        }
        } catch (error) {
          // Log error but continue polling
        }
    };

    // Poll immediately and then every 5 seconds
    pollJob();
    const interval = setInterval(pollJob, 5000);
    setPollingInterval(interval);
  };

  const simulateGeneration = async () => {
    // Clear previous state immediately
    setGeneratedImages([]); // Clear previous images first
    setCompletionNotificationShown(false); // Clear notification flag
    setJobCompleted(false); // Reset completion flag
    setCurrentJobId(null); // Clear previous job ID
    setPreviousJobStatus(null); // Reset status tracking
    
    if (!canGenerate()) return;

    setGenerating(true);
    setProgress(0);
    setCurrentStage(0);
    setJobStatus('Создание задачи генерации...');

    try {
      // Upload files to Supabase Storage first
      const productImagesData = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}/${Date.now()}_${i}.${fileExt}`;
        
        setJobStatus(`Загрузка изображения ${i + 1} из ${files.length}...`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Ошибка загрузки изображения: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        productImagesData.push({
          url: publicUrl,
          name: `image_${i + 1}.${fileExt}`
        });
      }

      setJobStatus('Создание задачи генерации...');

      // Create generation job
      const { data, error } = await supabase.functions.invoke('create-generation-job-v2', {
        body: {
          productName,
          category,
          description,
          userId: profile.id,
          productImages: productImagesData,
          selectedCards: selectedCards
        }
      });

      if (error) {
        console.error('Job creation error:', error);
        toast({
          title: "Ошибка создания задачи",
          description: error.message || "Произошла ошибка при создании задачи генерации",
          variant: "destructive",
        });
        return;
      }

      if (data.success && data.jobId) {
        // Start polling for job progress
        startJobPolling(data.jobId);
        
        toast({
          title: "Генерация начата!",
          description: "Ваша задача поставлена в очередь. Следите за прогрессом.",
        });
      } else {
        throw new Error(data.error || 'Job creation failed');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Произошла ошибка при создании задачи",
        variant: "destructive",
      });
      setGenerating(false);
      setProgress(0);
      setCurrentStage(0);
      setJobStatus('');
    }
  };

  const downloadAll = async () => {
    toast({
      title: "Скачивание начато",
      description: "Все изображения будут скачаны",
    });
    
    for (let index = 0; index < generatedImages.length; index++) {
      try {
        await downloadSingle(index);
        // Small delay between downloads to prevent overwhelming the browser
        if (index < generatedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to download image ${index}:`, error);
      }
    }
  };

  const downloadSingle = async (index: number) => {
    const image = generatedImages[index];
    if (!image) return;
    
    try {
      // Fetch the image as blob to ensure proper download
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const safeProductName = productName.replace(/[^a-z0-9_-]/gi, '');
      link.download = `${safeProductName}_${image.stage}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Скачивание началось",
        description: `Карточка "${image.stage}" скачивается`,
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать изображение",
        variant: "destructive",
      });
    }
  };

  const regenerateCard = async (image: any, index: number) => {
    const cardKey = `${image.id}_${index}`;
    setRegeneratingCards(prev => new Set([...prev, cardKey]));
    
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-single-card-v2', {
        body: {
          productName: productName,
          category: category,
          description: description,
          userId: profile.id,
          cardIndex: image.stageIndex,
          cardType: image.cardType || CARD_STAGES[image.stageIndex]?.key || 'cover',
          sourceImageUrl: image.url
        }
      });

      if (error) throw error;

      if (data?.success && data?.imageUrl) {
        // Update the generated image with new URL
        setGeneratedImages(prev => prev.map((img, i) => 
          i === index ? { ...img, url: data.imageUrl } : img
        ));
        
        toast({
          title: "Перегенерация завершена",
          description: `Карточка "${image.stage}" перегенерирована`,
        });
        
        // Update tokens balance
        onTokensUpdate();
      } else {
        throw new Error(data?.error || 'Неизвестная ошибка');
      }
    } catch (error: any) {
      console.error('Error regenerating card:', error);
      toast({
        title: "Ошибка перегенерации",
        description: error.message || 'Произошла ошибка при перегенерации',
        variant: "destructive",
      });
    } finally {
      setRegeneratingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Setup realtime subscription for job updates
  useEffect(() => {
    if (!currentJobId) return;

    const channel = supabase
      .channel(`job-${currentJobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_jobs',
          filter: `id=eq.${currentJobId}`
        },
        (payload) => {
          // Restart polling for job updates
          if (!pollingInterval) {
            startJobPolling(currentJobId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_tasks',
          filter: `job_id=eq.${currentJobId}`
        },
        (payload) => {
          // Restart polling for task updates
          if (!pollingInterval) {
            startJobPolling(currentJobId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentJobId]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden px-2 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-2">Генерация карточек</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Создайте профессиональные карточки для Wildberries с помощью ИИ
        </p>
      </div>

      <Card className="bg-yellow-50 border border-yellow-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Info className="h-4 w-4 text-amber-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Бета-версия сервиса</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-100 border border-yellow-300 rounded-[8px] p-3 flex items-center gap-3">
            <Zap className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p className="font-medium">Ранний доступ</p>
              <p>Сервис находиться в раннем доступе. Все функционирует, но изредка могут возникать ошибки. Мы ежедневно работает над его улучшением и видим все возникающие ошибки. Если что-то не сработало, просто подождите и вернитесь к генерации позже.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Изображения товара
          </CardTitle>
          <CardDescription>
            Загрузите качественные фотографии вашего товара с разных ракурсов (максимум 3 изображения)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground text-center">
                    <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
                  </p>
                  <p className="text-xs text-muted-foreground text-center">PNG, JPG, JPEG (МАКС. 3 изображения)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Details */}
      <Card className="bg-muted/30">
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
              placeholder="Например: Спортивная куртка для зимнего бега"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Категория</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="border-2 border-border/60">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Электроника">Электроника</SelectItem>
                <SelectItem value="Одежда">Одежда</SelectItem>
                <SelectItem value="Обувь">Обувь</SelectItem>
                <SelectItem value="Аксессуары">Аксессуары</SelectItem>
                <SelectItem value="Дом и сад">Дом и сад</SelectItem>
                <SelectItem value="Красота и здоровье">Красота и здоровье</SelectItem>
                <SelectItem value="Спорт и отдых">Спорт и отдых</SelectItem>
                <SelectItem value="Детские товары">Детские товары</SelectItem>
                <SelectItem value="Автотовары">Автотовары</SelectItem>
                <SelectItem value="Канцелярия">Канцелярия</SelectItem>
                <SelectItem value="Книги">Книги</SelectItem>
                <SelectItem value="Игрушки">Игрушки</SelectItem>
                <SelectItem value="Мебель">Мебель</SelectItem>
                <SelectItem value="Бытовая техника">Бытовая техника</SelectItem>
                <SelectItem value="Строительство">Строительство</SelectItem>
                <SelectItem value="Продукты питания">Продукты питания</SelectItem>
                <SelectItem value="Зоотовары">Зоотовары</SelectItem>
                <SelectItem value="Хобби и творчество">Хобби и творчество</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание и пожелания</Label>
            <Textarea
              id="description"
              placeholder="Опишите преимущества товара, основные характеристики и пожелания по дизайну и реализации. Чем больше и точнее информации, тем лучше результат..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card Selection */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="w-4 h-4" />
            Выбор карточек для генерации
          </CardTitle>
          <CardDescription>
            Выберите какие типы карточек вам нужны
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CARD_STAGES.map((stage, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedCards.includes(index) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/50'
                }`}
                onClick={() => handleCardToggle(index)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={selectedCards.includes(index)}
                    onChange={() => handleCardToggle(index)}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1">{stage.name}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{stage.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {generating && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Генерация карточек
            </CardTitle>
            <CardDescription>
              {jobStatus && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-3 h-3" />
                  {jobStatus}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Прогресс: {currentStage} из {selectedCards.length} карточек</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CARD_STAGES.map((stage, index) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded border ${
                      index < currentStage
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : index === currentStage
                        ? 'bg-primary/5 border-primary/10 text-primary animate-pulse'
                        : 'bg-muted/30 border-border text-muted-foreground'
                    }`}
                  >
                    {stage.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Images className="w-4 h-4" />
                  Готовые карточки ({generatedImages.length}/{selectedCards.length})
                </CardTitle>
                <CardDescription>
                  Ваши сгенерированные карточки готовы к скачиванию
                </CardDescription>
              </div>
              <Button
                onClick={downloadAll}
                variant="outline"
                className="shrink-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать все
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {generatedImages.map((image, index) => {
                const cardKey = `${image.id}_${index}`;
                const isRegenerating = regeneratingCards.has(cardKey);
                
                return (
                  <div key={image.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="relative group">
                      <img
                        src={image.url}
                        alt={`Generated card ${index + 1}`}
                        className="w-16 h-20 object-cover rounded-md border cursor-pointer transition-all duration-200 group-hover:brightness-75"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-md">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      {/* Dialog trigger (invisible but covers the image) */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <div 
                            className="absolute inset-0 cursor-pointer"
                            onClick={() => setFullscreenImage(image)}
                          />
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
                          <div className="flex items-center justify-center">
                            <img
                              src={image.url}
                              alt={`Generated card ${index + 1} - Fullscreen`}
                              className="max-w-full max-h-[80vh] object-contain rounded-lg cursor-pointer"
                              onClick={() => window.open(image.url, '_blank')}
                              title="Кликните чтобы открыть в новом окне"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{image.stage}</h3>
                      <p className="text-xs text-muted-foreground">
                        {CARD_STAGES[image.stageIndex]?.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateCard(image, index);
                        }}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        {isRegenerating ? 'Перегенерация...' : 'Перегенерировать'}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await downloadSingle(index);
                        }}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Скачать
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <Button 
            onClick={simulateGeneration}
            disabled={!canGenerate()}
            className="w-full bg-wb-purple hover:bg-wb-purple-dark"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Генерация... (выполняется в фоне)</span>
                <span className="sm:hidden">Генерация...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">
                  Сгенерировать {selectedCards.length} {selectedCards.length === 1 ? 'карточку' : selectedCards.length < 5 ? 'карточки' : 'карточек'} ({selectedCards.length * 10} {selectedCards.length * 10 === 1 ? 'токен' : (selectedCards.length * 10) % 10 >= 2 && (selectedCards.length * 10) % 10 <= 4 && ((selectedCards.length * 10) % 100 < 10 || (selectedCards.length * 10) % 100 >= 20) ? 'токена' : 'токенов'})
                </span>
                <span className="sm:hidden">
                  {generatedImages.length > 0 ? 'Новый комплект' : 'Генерация'}
                </span>
              </>
            )}
          </Button>
          
          <p className="text-center text-sm text-muted-foreground mt-3">
            Стоимость: <strong>{selectedCards.length * 10} {selectedCards.length * 10 === 1 ? 'токен' : (selectedCards.length * 10) % 10 >= 2 && (selectedCards.length * 10) % 10 <= 4 && ((selectedCards.length * 10) % 100 < 10 || (selectedCards.length * 10) % 100 >= 20) ? 'токена' : 'токенов'}</strong> за {selectedCards.length} {selectedCards.length === 1 ? 'изображение' : selectedCards.length < 5 ? 'изображения' : 'изображений'}
          </p>
          
          {!canGenerate() && !generating && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-800" />
              <AlertDescription className="text-amber-800">
                <strong>{getGuardMessage()}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          {generating && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Генерация выполняется в фоновом режиме. Вы можете закрыть эту страницу - 
                результат сохранится в вашем аккаунте.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};