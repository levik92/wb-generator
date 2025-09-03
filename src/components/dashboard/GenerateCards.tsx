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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, Images, Loader2, Upload, X, AlertCircle, Download, Zap, RefreshCw, Clock } from "lucide-react";

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
  { name: "Главная", key: "cover", description: "Главное фото товара" },
  { name: "Образ жизни", key: "lifestyle", description: "Товар в использовании" },
  { name: "Макро", key: "macro", description: "Макро-съемка деталей" },
  { name: "До/После", key: "beforeAfter", description: "Сравнение результатов" },
  { name: "Комплект", key: "bundle", description: "Товар в комплекте" },
  { name: "Гарантия", key: "guarantee", description: "Гарантии и доверие" }
];

export const GenerateCards = ({ profile, onTokensUpdate }: GenerateCardsProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    if (uploadedFiles.length + files.length > 10) {
      toast({
        title: "Слишком много файлов",
        description: "Максимум 10 изображений",
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
    return files.length > 0 && 
           productName.trim() && 
           category && 
           description.trim() && 
           profile.tokens_balance >= 6 && 
           !generating;
  };

  const getGuardMessage = () => {
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (!productName.trim()) return "Введите название товара";
    if (!category) return "Выберите категорию товара";
    if (!description.trim()) return "Добавьте описание товара";
    if (profile.tokens_balance < 6) return "Недостаточно токенов (нужно 6)";
    if (generating) return "Генерация уже выполняется";
    return null;
  };

  const startJobPolling = (jobId: string) => {
    setCurrentJobId(jobId);
    
    const pollJob = async () => {
      try {
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
          
          const progressPercent = (completedTasks.length / job.total_cards) * 100;
          
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

          // Check if job is completed
          if (job.status === 'completed') {
            setGenerating(false);
            toast({
              title: "Генерация завершена!",
              description: "Все карточки готовы для скачивания",
            });
            
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
            setCurrentJobId(null);
            onTokensUpdate?.();
          } else if (job.status === 'failed') {
            setGenerating(false);
            toast({
              title: "Ошибка генерации",
              description: job.error_message || "Генерация не удалась",
              variant: "destructive",
            });
            
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
            setCurrentJobId(null);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll immediately and then every 5 seconds
    pollJob();
    const interval = setInterval(pollJob, 5000);
    setPollingInterval(interval);
  };

  const simulateGeneration = async () => {
    if (!canGenerate()) return;

    setGenerating(true);
    setProgress(0);
    setCurrentStage(0);
    setJobStatus('Создание задачи...');

    try {
      const productImagesData = files.map(file => ({
        url: URL.createObjectURL(file),
        name: file.name
      }));

      // Create generation job
      const { data, error } = await supabase.functions.invoke('create-generation-job', {
        body: {
          productName,
          category,
          description,
          userId: profile.id,
          productImages: productImagesData
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

  const downloadAll = () => {
    toast({
      title: "Скачивание начато",
      description: "Все изображения будут скачаны",
    });
    
    generatedImages.forEach((image, index) => {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `${productName}_${image.stage}_${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const downloadSingle = (index: number) => {
    const image = generatedImages[index];
    if (!image) return;
    
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `${productName}_${image.stage}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Скачивание началось",
      description: `Карточка "${image.stage}" скачивается`,
    });
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

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
          console.log('Job update:', payload);
          // Trigger polling to get updated data with tasks
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          startJobPolling(currentJobId);
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
          console.log('Task update:', payload);
          // Trigger polling to get updated data
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          startJobPolling(currentJobId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentJobId, pollingInterval]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden px-2 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-2">Генерация карточек</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Создайте профессиональные карточки для Wildberries с помощью ИИ
        </p>
      </div>

      <Card className="bg-muted/30 border border-muted">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-muted p-2 rounded-lg">
              <Info className="h-4 w-4 text-purple-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Новая система генерации</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 border border-border/50 rounded-[8px] p-3 flex items-center gap-3">
            <Zap className="h-4 w-4 text-purple-600 shrink-0" />
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p className="font-medium">Фоновая обработка + защита от лимитов</p>
              <p>Генерация теперь происходит в фоне с автоматическими повторами при ошибках rate limit</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Изображения товара
          </CardTitle>
          <CardDescription>
            Загрузите фотографии вашего товара (максимум 10 изображений)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, JPEG (МАКС. 10MB)</p>
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
              placeholder="Например: Спортивная куртка для зимнего бега"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Категория</Label>
            <Select value={category} onValueChange={setCategory}>
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
                <SelectItem value="Детские товары">Детские товары</SelectItem>
                <SelectItem value="Автотовары">Автотовары</SelectItem>
                <SelectItem value="Другое">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание и преимущества</Label>
            <Textarea
              id="description"
              placeholder="Опишите ключевые преимущества товара, материалы, особенности использования..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
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
                  <span>Прогресс: {currentStage} из 6 карточек</span>
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
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Images className="w-4 h-4" />
                  Готовые карточки ({generatedImages.length}/6)
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
              {generatedImages.map((image, index) => (
                <div key={image.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  <img
                    src={image.url}
                    alt={`Generated card ${index + 1}`}
                    className="w-16 h-20 object-cover rounded-md border"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{image.stage}</h3>
                    <p className="text-xs text-muted-foreground">
                      {CARD_STAGES[image.stageIndex]?.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadSingle(index)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Скачать
                  </Button>
                </div>
              ))}
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
                  {generatedImages.length > 0 ? 'Сгенерировать новый комплект' : 'Сгенерировать карточки'}
                </span>
                <span className="sm:hidden">
                  {generatedImages.length > 0 ? 'Новый комплект' : 'Генерация'}
                </span>
              </>
            )}
          </Button>
          
          <p className="text-center text-sm text-muted-foreground mt-3">
            Стоимость: <strong>6 токенов</strong> за комплект из 6 изображений
          </p>
          
          {!canGenerate() && !generating && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>{getGuardMessage()}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          {generating && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Важно:</strong> Генерация выполняется в фоне. Вы можете закрыть эту страницу - 
                уведомление о завершении придет автоматически.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};