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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, Images, Loader2, Upload, X, AlertCircle, Download, Zap, RefreshCw, Clock, CheckCircle2, Eye, Sparkles, TrendingUp, Gift, ArrowRight, Edit } from "lucide-react";
import JSZip from 'jszip';
import exampleBefore1 from "@/assets/example-before-after-1.jpg";
import exampleAfter1 from "@/assets/example-after-1.jpg";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { useActiveAiModel, getImageEdgeFunctionName } from "@/hooks/useActiveAiModel";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
const CARD_STAGES = [{
  name: "Главная",
  key: "cover",
  description: "Главное фото товара с описанием ключевых преимуществ для повышения CTR"
}, {
  name: "Свойства и преимущества",
  key: "features",
  description: "Карточка с описанием ключевых свойств и преимуществ товара"
}, {
  name: "Макро с составом или характеристиками",
  key: "macro",
  description: "Детальная съемка с указанием состава, характеристик или материалов товара"
}, {
  name: "Товар в использовании + руководство по использованию",
  key: "usage",
  description: "Демонстрация товара в процессе использования с инструкциями и рекомендациями"
}, {
  name: "Сравнение с другими товарами",
  key: "comparison",
  description: "Карточка сравнения данного товара с аналогами или конкурентами"
}, {
  name: "Фото товара без инфографики",
  key: "clean",
  description: "Чистое фото товара без дополнительных графических элементов и текста"
}];

// Global polling control - только один polling в любой момент времени
let globalPollingInterval: NodeJS.Timeout | null = null;
let currentPollingJobId: string | null = null;
export const GenerateCards = ({
  profile,
  onTokensUpdate
}: GenerateCardsProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [autoDescription, setAutoDescription] = useState(false);
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
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasCheckedJobs, setHasCheckedJobs] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [totalEstimatedTime, setTotalEstimatedTime] = useState<number>(0); // Полное время генерации
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0);
  const [uploadedProductImages, setUploadedProductImages] = useState<Array<{
    url: string;
    name: string;
  }>>([]);
  // Store original job data for regeneration/editing (not visible in form)
  const [jobData, setJobData] = useState<{
    productName: string;
    category: string;
    description: string;
    productImages: Array<{
      url: string;
      name: string;
    }>;
  } | null>(null);
  const {
    toast
  } = useToast();
  const {
    price: photoGenerationPrice,
    isLoading: priceLoading
  } = useGenerationPrice('photo_generation');
  const {
    price: photoRegenerationPrice
  } = useGenerationPrice('photo_regeneration');
  const {
    price: photoEditPrice
  } = useGenerationPrice('photo_edit');
  const {
    data: activeModel,
    isLoading: modelLoading
  } = useActiveAiModel();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editInstructions, setEditInstructions] = useState("");
  const [editingCards, setEditingCards] = useState<Set<string>>(new Set());
  const WAITING_MESSAGES = ["Еще чуть-чуть...", "Добавляем мелкие детали...", "Причесываем и шлифуем...", "Почти готово, немного терпения..."];

  // Check for active jobs on component mount (only once)
  useEffect(() => {
    if (!hasCheckedJobs) {
      checkForActiveJobs();
      setHasCheckedJobs(true);
    }
  }, [profile.id, hasCheckedJobs]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  const checkForActiveJobs = async () => {
    try {
      // Check for any recent jobs that might have completed while user was offline
      const {
        data: recentJobs,
        error
      } = await supabase.from('generation_jobs').select(`
          *,
          generation_tasks (
            id,
            card_index,
            card_type,
            status,
            image_url,
            storage_path
          )
        `).eq('user_id', profile.id).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', {
        ascending: false
      }).limit(1);
      if (error) {
        console.error('Error checking for active jobs:', error);
        return;
      }
      const latestJob = recentJobs?.[0];
      if (latestJob && latestJob.status === 'completed') {
        const completedTasks = latestJob.generation_tasks?.filter((t: any) => t.status === 'completed') || [];
        if (completedTasks.length > 0) {
          // Restore job data for regeneration (but don't fill form fields)
          setCurrentJobId(latestJob.id);

          // Save job data for regeneration/editing without showing in form
          const productImages = latestJob.product_images as Array<{
            url: string;
            name: string;
          }> || [];
          setJobData({
            productName: latestJob.product_name || '',
            category: latestJob.category || '',
            description: latestJob.description || '',
            productImages: productImages
          });
          setUploadedProductImages(productImages);

          // Show completed images from the latest job
          const images = completedTasks.sort((a: any, b: any) => a.card_index - b.card_index).map((task: any) => ({
            id: task.id,
            url: task.image_url,
            stage: CARD_STAGES[task.card_index]?.name || `Card ${task.card_index}`,
            stageIndex: task.card_index,
            cardType: task.card_type
          }));
          setGeneratedImages(images);
          setJobCompleted(true);

          // Уведомление уже создано database trigger'ом в таблице notifications,
          // пользователь увидит его в NotificationCenter. Не дублируем toast.
        }
      } else if (latestJob && latestJob.status === 'processing') {
        // Restore job data for active generation
        setCurrentJobId(latestJob.id);

        // Save job data but keep form fields empty during processing
        const productImages = latestJob.product_images as Array<{
          url: string;
          name: string;
        }> || [];
        setJobData({
          productName: latestJob.product_name || '',
          category: latestJob.category || '',
          description: latestJob.description || '',
          productImages: productImages
        });
        setUploadedProductImages(productImages);

        // Resume polling for active job
        startJobPolling(latestJob.id);
      }
    } catch (error) {
      console.error('Error checking for active jobs:', error);
    }
  };
  useEffect(() => {
    if (generating) {
      setGeneratedImages([]);
    }
  }, [generating]);
  const validateAndAddFiles = (uploadedFiles: File[]) => {
    if (uploadedFiles.length + files.length > 3) {
      toast({
        title: "Слишком много файлов",
        description: "Максимум 3 изображения товара",
        variant: "destructive"
      });
      return false;
    }
    const maxSizeBytes = 3 * 1024 * 1024; // 3 MB
    const oversizedFiles = uploadedFiles.filter(file => file.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `"${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} МБ)`).join(', ');
      toast({
        title: "Файлы слишком большие",
        description: `Максимальный размер файла: 3 МБ. Пожалуйста, сожмите или загрузите изображения меньшего размера. Превышен лимит: ${fileNames}`,
        variant: "destructive"
      });
      return false;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = uploadedFiles.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Неподдерживаемый формат",
        description: "Поддерживаются только JPG, PNG и WebP файлы",
        variant: "destructive"
      });
      return false;
    }
    setFiles(prev => [...prev, ...uploadedFiles]);
    return true;
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    validateAndAddFiles(uploadedFiles);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast({
        title: "Неподдерживаемые файлы",
        description: "Можно загружать только изображения",
        variant: "destructive"
      });
      return;
    }
    validateAndAddFiles(imageFiles);
  };
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  const handleReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const maxSizeBytes = 3 * 1024 * 1024; // 3 MB
      if (file.size > maxSizeBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast({
          title: "Файл слишком большой",
          description: `"${file.name}" (${sizeMB} МБ) превышает лимит 3 МБ. Пожалуйста, сожмите изображение.`,
          variant: "destructive"
        });
        event.target.value = '';
        return;
      }
      setReferenceImage(file);
    }
  };
  const removeReference = () => {
    setReferenceImage(null);
  };
  const canGenerate = () => {
    const tokensNeeded = selectedCards.length * photoGenerationPrice;
    return files.length > 0 && productName.trim() && productName.trim().length <= 150 && description.trim() && description.trim().length <= 600 && selectedCards.length > 0 && profile.tokens_balance >= tokensNeeded && !generating && !priceLoading;
  };
  const getGuardMessage = () => {
    const tokensNeeded = selectedCards.length * photoGenerationPrice;
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (!productName.trim()) return "Введите название товара";
    if (productName.trim().length > 150) return "Название товара должно быть не более 150 символов";
    if (productName.trim().length < 3) return "Название товара должно содержать минимум 3 символа";
    if (!description.trim()) return "Добавьте описание товара";
    if (description.trim().length > 600) return "Описание должно быть не более 600 символов";
    if (description.trim().length < 10) return "Описание должно содержать минимум 10 символов";
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
    // СТОП ВСЕМ POLLING'АМ - глобальная очистка
    if (globalPollingInterval) {
      console.log('Clearing global polling interval');
      clearInterval(globalPollingInterval);
      globalPollingInterval = null;
    }

    // Если тот же job уже polling - не запускаем повторно
    if (currentPollingJobId === jobId) {
      console.log(`Job ${jobId} already being polled globally, skipping`);
      return;
    }
    console.log(`Starting global polling for job ${jobId}`);
    currentPollingJobId = jobId;
    setCurrentJobId(jobId);

    // Расчет времени: 40 секунд на изображение
    const estimatedSecondsPerCard = 40;
    const totalEstimatedSeconds = selectedCards.length * estimatedSecondsPerCard;
    setEstimatedTimeRemaining(totalEstimatedSeconds); // в секундах
    setTotalEstimatedTime(totalEstimatedSeconds); // Сохраняем полное время для расчета прогресса
    setWaitingMessageIndex(0); // Сбрасываем индекс сообщений

    const pollJob = async () => {
      try {
        const {
          data: job,
          error
        } = await supabase.from('generation_jobs').select(`
            *,
            generation_tasks (
              id,
              card_index,
              card_type,
              status,
              image_url,
              storage_path
            )
          `).eq('id', jobId).single();
        if (error) {
          console.error('Polling error:', error);
          return;
        }
        if (job) {
          const completedTasks = job.generation_tasks?.filter((t: any) => t.status === 'completed') || [];
          const processingTasks = job.generation_tasks?.filter((t: any) => t.status === 'processing') || [];
          const failedTasks = job.generation_tasks?.filter((t: any) => t.status === 'failed') || [];
          const retryingTasks = job.generation_tasks?.filter((t: any) => t.status === 'retrying') || [];
          const progressPercent = completedTasks.length / selectedCards.length * 100;
          setProgress(progressPercent);
          setCurrentStage(completedTasks.length);

          // Set job status for display with selected cards info
          if (job.status === 'processing') {
            if (retryingTasks.length > 0) {
              setJobStatus(`Обработка... (${retryingTasks.length} задач ожидают повтора)`);
            } else if (processingTasks.length > 0) {
              const processingCardName = processingTasks[0] ? CARD_STAGES[processingTasks[0].card_index]?.name : 'карточку';
              setJobStatus(`Генерируется: ${processingCardName}`);
            } else {
              setJobStatus('Обработка...');
            }
          } else {
            setJobStatus(job.status);
          }

          // Update generated images
          if (completedTasks.length > 0) {
            const images = completedTasks.sort((a: any, b: any) => a.card_index - b.card_index).map((task: any) => ({
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

              // Note: Уведомления и история теперь создаются автоматически database trigger'ом
              // когда job status меняется на 'completed'. Это работает даже если клиент офлайн.
              // Клиентское уведомление показываем только для лучшего UX когда пользователь онлайн.
              toast({
                title: "Генерация завершена!",
                description: `Все карточки готовы для скачивания`
              });
            } else if (job.status === 'failed') {
              toast({
                title: "Ошибка генерации",
                description: job.error_message || "Генерация не удалась",
                variant: "destructive"
              });
            }

            // ГЛОБАЛЬНАЯ ОСТАНОВКА ПОСЛЕ обработки результата
            console.log(`Job ${jobId} is ${job.status}, STOPPING GLOBAL POLLING after processing`);
            if (globalPollingInterval) {
              clearInterval(globalPollingInterval);
              globalPollingInterval = null;
            }
            currentPollingJobId = null;
            setCurrentJobId(null);
            onTokensUpdate?.();
            return;
          }
        }
      } catch (error) {
        // Log error but continue polling
      }
    };

    // Poll immediately and then every 5 seconds
    pollJob();
    globalPollingInterval = setInterval(pollJob, 5000);
    setPollingInterval(globalPollingInterval);
  };
  const simulateGeneration = async () => {
    // Clear previous state immediately
    setGeneratedImages([]); // Clear previous images first
    setCompletionNotificationShown(false); // Clear notification flag
    setJobCompleted(false); // Reset completion flag
    setCurrentJobId(null); // Clear previous job ID
    setPreviousJobStatus(null); // Reset status tracking
    setJobData(null); // Clear saved job data on new generation

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
        const {
          data: uploadData,
          error: uploadError
        } = await supabase.storage.from('product-images').upload(fileName, file, {
          upsert: true
        });
        if (uploadError) {
          throw new Error(`Ошибка загрузки изображения: ${uploadError.message}`);
        }

        // Get public URL
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('product-images').getPublicUrl(fileName);
        productImagesData.push({
          url: publicUrl,
          name: `image_${i + 1}.${fileExt}`
        });
      }

      // Upload reference image if provided
      let referenceImageUrl: string | null = null;
      if (referenceImage) {
        setJobStatus('Загрузка референса дизайна...');
        const fileExt = referenceImage.name.split('.').pop();
        const fileName = `${profile.id}/reference_${Date.now()}.${fileExt}`;
        const {
          data: uploadData,
          error: uploadError
        } = await supabase.storage.from('product-images').upload(fileName, referenceImage, {
          upsert: true
        });
        if (uploadError) {
          console.error('Reference upload error:', uploadError);
          toast({
            title: "Ошибка загрузки референса",
            description: `Не удалось загрузить референс: ${uploadError.message}`,
            variant: "destructive"
          });
        } else {
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('product-images').getPublicUrl(fileName);
          referenceImageUrl = publicUrl;
        }
      }

      // Save uploaded images URLs and job data for regeneration
      setUploadedProductImages(productImagesData);
      setJobData({
        productName: productName,
        category: category || 'товар',
        description: description,
        productImages: productImagesData
      });
      setJobStatus('Создание задачи генерации...');

      // Check if model is loaded
      if (!activeModel) {
        toast({
          title: "Подождите",
          description: "Загрузка настроек модели...",
          variant: "destructive"
        });
        return;
      }

      // Create generation job with dynamic model-based function name
      const createJobFunction = getImageEdgeFunctionName('create-generation-job', activeModel);
      console.log('[GenerateCards] Active model:', activeModel, '| Function:', createJobFunction);
      const {
        data,
        error
      } = await supabase.functions.invoke(createJobFunction, {
        body: {
          productName,
          category: category || 'товар',
          description,
          userId: profile.id,
          productImages: productImagesData,
          referenceImageUrl,
          selectedCards: selectedCards
        }
      });
      if (error) {
        console.error('Job creation error:', error);
        toast({
          title: "Ошибка создания задачи",
          description: error.message || "Произошла ошибка при создании задачи генерации",
          variant: "destructive"
        });
        return;
      }
      if (data.success && data.jobId) {
        // Start polling for job progress
        startJobPolling(data.jobId);
        toast({
          title: "Генерация начата!",
          description: "Ваша задача поставлена в очередь. Следите за прогрессом."
        });
      } else {
        throw new Error(data.error || 'Job creation failed');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Произошла ошибка при создании задачи",
        variant: "destructive"
      });
      setGenerating(false);
      setProgress(0);
      setCurrentStage(0);
      setJobStatus('');
    }
  };
  const downloadAll = async () => {
    if (downloadingAll || generatedImages.length === 0) return;
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      const safeProductName = (productName || 'cards').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      toast({
        title: "Создание архива",
        description: "Подготавливаем ZIP-архив с изображениями..."
      });

      // Add each image to ZIP
      for (let index = 0; index < generatedImages.length; index++) {
        const image = generatedImages[index];
        if (image.url) {
          try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            const safeStageName = image.stage.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
            const fileName = `${safeProductName}_${safeStageName}_${index + 1}.png`;
            zip.file(fileName, blob);
          } catch (error) {
            console.error(`Failed to fetch image ${index}:`, error);
          }
        }
      }

      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({
        type: 'blob'
      });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const safeZipName = (productName || 'cards').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      link.download = `${safeZipName}_all_cards.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Скачивание завершено",
        description: `ZIP-архив с ${generatedImages.length} изображениями готов`
      });
    } catch (error) {
      console.error('Error creating ZIP archive:', error);
      toast({
        title: "Ошибка создания архива",
        description: "Не удалось создать ZIP-архив. Попробуйте скачать изображения по одному.",
        variant: "destructive"
      });
    } finally {
      setDownloadingAll(false);
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
      const safeProductName = productName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      // Use original Russian stage name, only replace problematic characters for file system
      const safeStageName = image.stage.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      link.download = `${safeProductName}_${safeStageName}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      toast({
        title: "Скачивание началось",
        description: `Карточка "${image.stage}" скачивается`
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать изображение",
        variant: "destructive"
      });
    }
  };
  const regenerateCard = async (image: any, index: number) => {
    const cardKey = `${image.id}_${index}`;
    setRegeneratingCards(prev => new Set([...prev, cardKey]));
    try {
      // Check if model is loaded
      if (!activeModel) {
        toast({
          title: "Подождите",
          description: "Загрузка настроек модели...",
          variant: "destructive"
        });
        setRegeneratingCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
        return;
      }

      // Use dynamic model-based function name for regeneration
      const regenerateFunction = getImageEdgeFunctionName('regenerate-single-card', activeModel);
      console.log('[GenerateCards] Regenerate - Active model:', activeModel, '| Function:', regenerateFunction);

      // Try to get source image from jobData or uploadedProductImages
      let sourceImageUrl = null;

      // First try jobData
      if (jobData?.productImages && jobData.productImages.length > 0) {
        sourceImageUrl = jobData.productImages[0].url;
      }
      // Fallback to uploadedProductImages
      else if (uploadedProductImages.length > 0) {
        sourceImageUrl = uploadedProductImages[0].url;
      }
      // Last resort: try to fetch from current job in database
      else if (currentJobId) {
        const {
          data: job
        } = await supabase.from('generation_jobs').select('product_images').eq('id', currentJobId).single();
        if (job?.product_images && Array.isArray(job.product_images) && job.product_images.length > 0) {
          sourceImageUrl = (job.product_images as Array<{
            url: string;
          }>)[0].url;
        }
      }
      if (!sourceImageUrl) {
        throw new Error('Оригинальное изображение недоступно');
      }

      // Use saved job data (fallback to form fields if needed)
      const productNameToUse = jobData?.productName || productName;
      const categoryToUse = (jobData?.category || category || 'товар').trim() || 'товар';
      const descriptionToUse = jobData?.description || description;
      if (!productNameToUse?.trim()) {
        throw new Error('Название товара недоступно');
      }
      const {
        data,
        error
      } = await supabase.functions.invoke(regenerateFunction, {
        body: {
          productName: productNameToUse,
          category: categoryToUse,
          description: descriptionToUse,
          userId: profile.id,
          cardIndex: image.stageIndex,
          cardType: image.cardType || CARD_STAGES[image.stageIndex]?.key || 'cover',
          sourceImageUrl: sourceImageUrl
        }
      });
      if (error) throw error;
      if (data?.success && data?.taskId && data?.jobId) {
        toast({
          title: "Перегенерация запущена",
          description: `Карточка "${image.stage}" поставлена в очередь на перегенерацию`
        });

        // Update tokens balance immediately
        onTokensUpdate();

        // Start polling for this specific regeneration task
        pollRegenerationTask(data.taskId, index, cardKey);
      } else {
        throw new Error(data?.error || 'Неизвестная ошибка');
      }
    } catch (error: any) {
      console.error('Error regenerating card:', error);
      toast({
        title: "Ошибка перегенерации",
        description: error.message || 'Произошла ошибка при перегенерации',
        variant: "destructive"
      });

      // Remove from regenerating set on error
      setRegeneratingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }
  };
  const pollRegenerationTask = async (taskId: string, imageIndex: number, cardKey: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const {
          data: task,
          error
        } = await supabase.from('generation_tasks').select('*').eq('id', taskId).single();
        if (error) {
          console.error('Error polling regeneration task:', error);
          clearInterval(pollInterval);
          setRegeneratingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardKey);
            return newSet;
          });
          return;
        }
        if (task.status === 'completed' && task.image_url) {
          // Update the generated image with new URL
          setGeneratedImages(prev => prev.map((img, i) => i === imageIndex ? {
            ...img,
            url: task.image_url
          } : img));
          toast({
            title: "Перегенерация завершена",
            description: `Карточка успешно перегенерирована`
          });
          clearInterval(pollInterval);
          setRegeneratingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardKey);
            return newSet;
          });
        } else if (task.status === 'failed') {
          toast({
            title: "Ошибка перегенерации",
            description: task.last_error || 'Перегенерация не удалась',
            variant: "destructive"
          });
          clearInterval(pollInterval);
          setRegeneratingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardKey);
            return newSet;
          });
        }
        // If status is 'pending' or 'processing', continue polling
      } catch (error) {
        console.error('Error polling regeneration task:', error);
        clearInterval(pollInterval);
        setRegeneratingCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
      }
    }, 3000); // Poll every 3 seconds for regeneration

    // Cleanup after 5 minutes max
    setTimeout(() => {
      clearInterval(pollInterval);
      setRegeneratingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }, 5 * 60 * 1000);
  };
  const openEditDialog = (image: any, index: number) => {
    setEditingImage(image);
    setEditingIndex(index);
    setEditInstructions("");
    setEditDialogOpen(true);
  };
  const editCard = async () => {
    if (!editInstructions.trim()) {
      toast({
        title: "Введите инструкции",
        description: "Пожалуйста, опишите что нужно изменить",
        variant: "destructive"
      });
      return;
    }
    const cardKey = `edit_${editingImage.id}_${editingIndex}`;
    setEditingCards(prev => new Set([...prev, cardKey]));
    setEditDialogOpen(false);
    try {
      // Check if model is loaded
      if (!activeModel) {
        toast({
          title: "Подождите",
          description: "Загрузка настроек модели...",
          variant: "destructive"
        });
        setEditingCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
        return;
      }

      // Use dynamic model-based function name for editing
      const editFunction = getImageEdgeFunctionName('edit-card', activeModel);
      console.log('[GenerateCards] Edit - Active model:', activeModel, '| Function:', editFunction);

      // Try to get product name from jobData or form field
      const productNameToUse = jobData?.productName || productName;
      if (!productNameToUse) {
        throw new Error('Название товара недоступно');
      }
      const {
        data,
        error
      } = await supabase.functions.invoke(editFunction, {
        body: {
          productName: productNameToUse,
          userId: profile.id,
          cardIndex: editingImage.stageIndex,
          cardType: editingImage.cardType || CARD_STAGES[editingImage.stageIndex]?.key || 'cover',
          sourceImageUrl: editingImage.url,
          editInstructions: editInstructions
        }
      });
      if (error) throw error;
      if (data?.success && data?.taskId && data?.jobId) {
        toast({
          title: "Редактирование запущено",
          description: `Карточка "${editingImage.stage}" поставлена в очередь на редактирование`
        });

        // Update tokens balance immediately
        onTokensUpdate();

        // Start polling for this specific edit task
        pollEditTask(data.taskId, editingIndex, cardKey);
      } else {
        throw new Error(data?.error || 'Неизвестная ошибка');
      }
    } catch (error: any) {
      console.error('Error editing card:', error);
      toast({
        title: "Ошибка редактирования",
        description: error.message || 'Произошла ошибка при редактировании',
        variant: "destructive"
      });

      // Remove from editing set on error
      setEditingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }
  };
  const pollEditTask = async (taskId: string, imageIndex: number, cardKey: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const {
          data: task,
          error
        } = await supabase.from('generation_tasks').select('*').eq('id', taskId).single();
        if (error) {
          console.error('Error polling edit task:', error);
          clearInterval(pollInterval);
          setEditingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardKey);
            return newSet;
          });
          return;
        }
        if (task.status === 'completed' && task.image_url) {
          // Update the generated image with new URL
          setGeneratedImages(prev => prev.map((img, i) => i === imageIndex ? {
            ...img,
            url: task.image_url
          } : img));
          toast({
            title: "Редактирование завершено",
            description: `Карточка успешно отредактирована`
          });
          clearInterval(pollInterval);
          setEditingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardKey);
            return newSet;
          });
        } else if (task.status === 'failed') {
          toast({
            title: "Ошибка редактирования",
            description: task.last_error || 'Редактирование не удалось',
            variant: "destructive"
          });
          clearInterval(pollInterval);
          setEditingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardKey);
            return newSet;
          });
        }
        // If status is 'pending' or 'processing', continue polling
      } catch (error) {
        console.error('Error polling edit task:', error);
        clearInterval(pollInterval);
        setEditingCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
      }
    }, 2000);

    // Cleanup after 5 minutes max
    setTimeout(() => {
      clearInterval(pollInterval);
      setEditingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }, 5 * 60 * 1000);
  };

  // Smooth progress bar animation based on time or completed tasks
  useEffect(() => {
    if (!generating || currentStage >= selectedCards.length) {
      setSmoothProgress(progress);
      return;
    }
    const interval = setInterval(() => {
      setSmoothProgress(prev => {
        // Прогресс на основе реальных завершенных карточек
        const realProgress = progress;

        // Прогресс на основе времени (если время установлено)
        const timeProgress = totalEstimatedTime > 0 ? (totalEstimatedTime - estimatedTimeRemaining) / totalEstimatedTime * 100 : 0;

        // Используем максимум из двух прогрессов, но не больше 95% если не все завершено
        const targetProgress = Math.max(realProgress, timeProgress);
        const maxProgress = currentStage >= selectedCards.length ? 100 : 95;
        const limitedTarget = Math.min(targetProgress, maxProgress);
        if (prev >= limitedTarget) return limitedTarget;
        // Плавное увеличение
        return Math.min(prev + 0.2, limitedTarget);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [progress, generating, currentStage, selectedCards.length, estimatedTimeRemaining, totalEstimatedTime]);

  // Countdown timer for estimated time
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
        // Останавливаемся на последней фразе, не зацикливаем
        if (prev >= WAITING_MESSAGES.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [generating, estimatedTimeRemaining]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (globalPollingInterval) {
        clearInterval(globalPollingInterval);
        globalPollingInterval = null;
      }
      currentPollingJobId = null;
    };
  }, []);
  return <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
          <Images className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Генерация карточек</h2>
          <p className="text-muted-foreground text-sm">Создайте профессиональные карточки для Wildberries с помощью ИИ</p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-4 sm:pt-5 pb-4 sm:pb-5">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold">
                Карточки, которые продают — за 3 минуты
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                WB Генератор оформляет товары как профессиональный дизайнер: выравнивает композицию, подбирает фон, добавляет тексты и делает изображение премиального уровня. Всё автоматически — просто загрузи фото.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-primary/20">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">Экономия до 10 000 ₽</p>
                  <p className="text-[10px] text-muted-foreground">на каждой карточке</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-primary/20">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">Результат за 3 минуты</p>
                  <p className="text-[10px] text-muted-foreground">вместо 3 дней</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-primary/20">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">Бесплатные 20 токенов</p>
                  <p className="text-[10px] text-muted-foreground">для теста</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload - Horizontal layout on desktop/tablet */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Product Images - Takes 3/5 width on desktop */}
        <Card className="border-border/50 md:col-span-3 shadow-sm bg-zinc-50">
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
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${generating ? 'border-muted-foreground/20 bg-muted/20 cursor-not-allowed opacity-60' : isDragOver ? 'border-primary bg-primary/10 hover:bg-primary/20 cursor-pointer' : 'border-border bg-muted/30 hover:bg-muted/50 cursor-pointer'}`} onDragOver={generating ? undefined : handleDragOver} onDragEnter={generating ? undefined : handleDragEnter} onDragLeave={generating ? undefined : handleDragLeave} onDrop={generating ? undefined : handleDrop}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <Upload className={`w-8 h-8 mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className={`mb-2 text-sm text-center ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}>
                      <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
                    </p>
                    <p className={`text-xs text-center ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}>
                      PNG, JPG, JPEG (МАКС. 3 изображения)
                    </p>
                  </div>
                  <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileUpload} disabled={generating} />
                </label>
              </div>
              
              {files.length > 0 && <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => <div key={index} className="relative group w-24 h-24">
                      <img src={URL.createObjectURL(file)} alt={`Upload ${index + 1}`} className="w-full h-full aspect-square object-cover rounded-lg border" />
                      <button onClick={() => removeFile(index)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" disabled={generating}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>)}
                </div>}
            </div>
          </CardContent>
        </Card>

        {/* Reference Image - Takes 2/5 width on desktop */}
        <Card className="border-border/50 md:col-span-2 shadow-sm bg-zinc-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Референс
            </CardTitle>
            <CardDescription>
              WB Генератор может взять за основу прикрепленный дизайн (не обязательно)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${generating ? 'border-muted-foreground/20 bg-muted/20 cursor-not-allowed opacity-60' : 'border-border bg-muted/30 hover:bg-muted/50 cursor-pointer'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm text-center text-muted-foreground">
                      <span className="font-semibold">Загрузить</span>
                    </p>
                    <p className="text-xs text-center text-muted-foreground">
                      PNG, JPG, JPEG
                    </p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleReferenceUpload} disabled={generating} />
                </label>
              </div>
              
              {referenceImage && <div className="relative group w-24 h-24">
                  <img src={URL.createObjectURL(referenceImage)} alt="Референс" className="w-full h-full aspect-square object-cover rounded-lg border" />
                  <button onClick={removeReference} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" disabled={generating}>
                    <X className="w-3 h-3" />
                  </button>
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Details */}
      <Card className="border-border/50 shadow-sm bg-zinc-50">
        <CardHeader>
          {/* Mobile clear button - above title */}
          <div className="flex justify-end mb-2 sm:hidden">
            <Button variant="outline" size="sm" onClick={() => {
            setFiles([]);
            setReferenceImage(null);
            setProductName("");
            setCategory("");
            setDescription("");
            setAutoDescription(false);
            setSelectedCards([0]);
          }} className="w-auto">
              <X className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          </div>
          
          {/* Desktop/Tablet layout */}
          <div className="hidden sm:flex sm:items-start sm:justify-between gap-2">
            <div className="flex-1 space-y-1.5">
              <CardTitle>Информация о товаре</CardTitle>
              <CardDescription>
                Укажите детали товара для генерации оптимальных карточек
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
            setFiles([]);
            setReferenceImage(null);
            setProductName("");
            setCategory("");
            setDescription("");
            setAutoDescription(false);
            setSelectedCards([0]);
          }} className="shrink-0">
              <X className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          </div>
          
          {/* Mobile title - below clear button */}
          <div className="sm:hidden space-y-1.5">
            <CardTitle>Информация о товаре</CardTitle>
            <CardDescription>
              Укажите детали товара для генерации оптимальных карточек
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Название товара</Label>
            <Input id="productName" placeholder="Например: Спортивная куртка для зимнего бега" value={productName} onChange={e => setProductName(e.target.value.slice(0, 150))} maxLength={150} disabled={generating} />
            <div className="flex justify-end text-xs text-muted-foreground">
              <span>{productName.length}/150 символов</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание и пожелания</Label>
            <Textarea id="description" placeholder="Опишите ваши пожелания по дизайну, как бы вы это писали дизайнеру. Укажите какие нюансы или преимущества о вашем товаре нужно написать в карточке либо учесть при их создании..." value={description} onChange={e => setDescription(e.target.value.slice(0, 1200))} rows={4} maxLength={1200} disabled={generating || autoDescription} />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 bg-muted/70 rounded-md px-3 py-2">
                <Checkbox id="autoDescription" checked={autoDescription} onCheckedChange={checked => {
                setAutoDescription(!!checked);
                if (checked) {
                  setDescription("Самостоятельно придумай и определи наилучшие параметры для достижения результата.");
                } else {
                  setDescription("");
                }
              }} disabled={generating} />
                <Label htmlFor="autoDescription" className="text-sm font-normal cursor-pointer">
                  Придумай сам
                </Label>
              </div>
              <div className="text-xs text-muted-foreground">
                <span>{description.length}/1200 символов</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Selection */}
      <Card className="bg-card">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {CARD_STAGES.map((stage, index) => <div key={index} className={`border rounded-lg p-3 sm:p-4 transition-all ${generating ? 'opacity-60 cursor-not-allowed' : selectedCards.includes(index) ? 'border-primary bg-primary/5 cursor-pointer' : 'border-border hover:border-muted-foreground/50 cursor-pointer'}`} onClick={generating ? undefined : () => handleCardToggle(index)}>
                <div className="flex items-start gap-3">
                  <Checkbox checked={selectedCards.includes(index)} onChange={() => handleCardToggle(index)} className="mt-0.5" disabled={generating} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base mb-1 leading-tight">{stage.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{stage.description}</p>
                  </div>
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {generating && <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Генерация карточек
            </CardTitle>
            <CardDescription>
              {jobStatus && <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-3 h-3" />
                  {jobStatus}
                </div>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Прогресс: {currentStage} из {selectedCards.length} карточек</span>
                  <span>{Math.round(smoothProgress)}%</span>
                </div>
                <Progress value={smoothProgress} className="w-full" />
                {generating && <div className="text-xs text-muted-foreground text-center">
                    {estimatedTimeRemaining > 0 ? `Обрабатываю... ${estimatedTimeRemaining >= 60 ? `~${Math.ceil(estimatedTimeRemaining / 60)} мин` : `~${estimatedTimeRemaining} сек`}` : WAITING_MESSAGES[waitingMessageIndex]}
                  </div>}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedCards.map(cardIndex => {
              const stage = CARD_STAGES[cardIndex];
              const completedCount = Math.min(currentStage, selectedCards.length);
              const currentCardPosition = selectedCards.indexOf(cardIndex);
              return <div key={cardIndex} className={`text-xs p-2 rounded border ${currentCardPosition < completedCount ? 'bg-primary/10 border-primary/20 text-primary' : currentCardPosition === completedCount ? 'bg-primary/5 border-primary/10 text-primary animate-pulse' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                      {stage.name}
                    </div>;
            })}
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Generated Images */}
      {generatedImages.length > 0 && <Card className="bg-card">
          <CardHeader>
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Images className="w-4 h-4 shrink-0" />
                  <span className="truncate">Готовые карточки ({generatedImages.length}/{selectedCards.length})</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Ваши сгенерированные карточки готовы к скачиванию
                </CardDescription>
              </div>
              <Button onClick={downloadAll} variant="outline" className="shrink-0 w-full sm:w-auto" size="sm" disabled={downloadingAll}>
                {downloadingAll ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Создаю ZIP...</span>
                    <span className="sm:hidden">Создаю...</span>
                  </> : <>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать все
                  </>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 lg:px-6">
            <div className="grid gap-2 sm:gap-3 w-full">
              {generatedImages.map((image, index) => {
            const cardKey = `${image.id}_${index}`;
            const isRegenerating = regeneratingCards.has(cardKey);
            return <div key={image.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 border rounded-lg bg-muted/30 w-full overflow-hidden">
                    <div className="relative group shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                      <img src={image.url} alt={`Generated card ${index + 1}`} className="w-24 h-28 sm:w-20 sm:h-24 object-cover rounded-md border cursor-pointer transition-all duration-200 group-hover:brightness-75" />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-md">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      {/* Dialog trigger (invisible but covers the image) */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="absolute inset-0 cursor-pointer" onClick={() => setFullscreenImage(image)} />
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-2">
                          <div className="flex items-center justify-center">
                            <img src={image.url} alt={`Generated card ${index + 1} - Fullscreen`} className="max-w-full max-h-[80vh] object-contain rounded-lg cursor-pointer" onClick={() => window.open(image.url, '_blank')} title="Кликните чтобы открыть в новом окне" />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="flex-1 min-w-0 w-full sm:w-auto px-2 sm:px-0">
                      <h3 className="font-medium text-sm sm:text-base text-center sm:text-left truncate">{image.stage}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left line-clamp-2 mt-1">
                        {CARD_STAGES[image.stageIndex]?.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-col xs:flex-row sm:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={e => {
                        e.stopPropagation();
                        openEditDialog(image, index);
                      }} disabled={editingCards.has(`edit_${image.id}_${index}`)} className="w-full xs:w-auto md:w-auto text-xs whitespace-nowrap md:px-3">
                              {editingCards.has(`edit_${image.id}_${index}`) ? <>
                                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                  <span className="md:hidden ml-1">Редактируется...</span>
                                </> : <>
                                  <Edit className="w-3 h-3 md:w-4 md:h-4" />
                                  <span className="md:hidden ml-1">Редактировать</span>
                                </>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="hidden md:block">
                            <p>Редактировать карточку</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={e => {
                        e.stopPropagation();
                        regenerateCard(image, index);
                      }} disabled={isRegenerating} className="w-full xs:w-auto md:w-auto text-xs whitespace-nowrap md:px-3">
                              {isRegenerating ? <>
                                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                  <span className="md:hidden ml-1">Перегенерация...</span>
                                </> : <>
                                  <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                                  <span className="md:hidden ml-1">Перегенерировать</span>
                                </>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="hidden md:block">
                            <p>Перегенерировать карточку</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={async e => {
                        e.stopPropagation();
                        await downloadSingle(index);
                      }} className="w-full xs:w-auto md:w-auto text-xs whitespace-nowrap md:px-3">
                              <Download className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="md:hidden ml-1">Скачать</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="hidden md:block">
                            <p>Скачать изображение</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>;
          })}
            </div>
            <div className="mt-4 pt-4 text-xs text-muted-foreground border-t flex items-center justify-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span className="text-center">Перегенерация 1 изображения: <span className="font-bold">{priceLoading ? '...' : photoRegenerationPrice} токена</span>. Редактирование: <span className="font-bold">{priceLoading ? '...' : photoEditPrice} токена</span>.</span>
            </div>
          </CardContent>
        </Card>}

      {/* Generate Button */}
      <Card className="bg-card">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 bg-gray-50">
          <Button onClick={simulateGeneration} disabled={!canGenerate()} className="w-full bg-wb-purple hover:bg-wb-purple-dark text-sm sm:text-base" size="lg">
            {generating ? <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Генерация... (выполняется в фоне)</span>
                <span className="sm:hidden">Генерация...</span>
              </> : <>
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">
                Сгенерировать {selectedCards.length} {selectedCards.length === 1 ? 'изображение' : selectedCards.length < 5 ? 'изображения' : 'изображений'}
              </span>
                <span className="sm:hidden">
                  {generatedImages.length > 0 ? 'Новый комплект' : 'Генерация'}
                </span>
              </>}
          </Button>
          
          <div className="flex items-center justify-center gap-2 mt-3 px-2 text-xs sm:text-sm text-muted-foreground">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span className="text-left text-xs">Стоимость: <strong>{priceLoading ? '...' : selectedCards.length * photoGenerationPrice} {selectedCards.length * photoGenerationPrice === 1 ? 'токен' : selectedCards.length * photoGenerationPrice % 10 >= 2 && selectedCards.length * photoGenerationPrice % 10 <= 4 && (selectedCards.length * photoGenerationPrice % 100 < 10 || selectedCards.length * photoGenerationPrice % 100 >= 20) ? 'токена' : 'токенов'}</strong> за {selectedCards.length} {selectedCards.length === 1 ? 'изображение' : selectedCards.length < 5 ? 'изображения' : 'изображений'}</span>
          </div>
          
          {!canGenerate() && !generating && <Alert className="mt-4 bg-amber-500/10 border-amber-500/30 rounded-xl [&>svg]:!text-amber-600 dark:[&>svg]:!text-amber-400 [&>svg+div]:translate-y-0 items-center [&>svg]:!top-1/2 [&>svg]:!-translate-y-1/2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-amber-700 dark:text-amber-300 font-medium text-xs sm:text-sm">
                {getGuardMessage()}
              </AlertDescription>
            </Alert>}
          
          {generating && <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4 mt-4">
              <p className="text-muted-foreground text-xs sm:text-sm flex items-start sm:items-center gap-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 sm:mt-0 text-primary" />
                <span className="leading-relaxed">
                  Результат создает нейросеть. Не понравилось либо заметили ошибки? Нажмите "перегенерировать" - это в 5 раз дешевле!
                </span>
              </p>
            </div>}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Редактировать карточку</DialogTitle>
            <DialogDescription>
              Опишите, что нужно изменить в изображении. AI внесёт изменения, сохраняя общий стиль карточки.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-instructions">
                Что нужно изменить?
              </Label>
              <Textarea id="edit-instructions" placeholder="Например: изменить цвет фона на синий, добавить больше света, убрать тени..." value={editInstructions} onChange={e => setEditInstructions(e.target.value)} className="min-h-[120px]" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Стоимость: {photoEditPrice} {photoEditPrice === 1 ? 'токен' : 'токена'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={editCard} disabled={!editInstructions.trim()}>
              Начать редактирование
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};