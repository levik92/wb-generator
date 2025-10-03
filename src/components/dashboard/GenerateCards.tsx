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
import JSZip from 'jszip';

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
  { name: "Главная", key: "cover", description: "Главное фото товара с описанием ключевых преимуществ для повышения CTR" },
  { name: "Свойства и преимущества", key: "features", description: "Карточка с описанием ключевых свойств и преимуществ товара" },
  { name: "Макро с составом или характеристиками", key: "macro", description: "Детальная съемка с указанием состава, характеристик или материалов товара" },
  { name: "Товар в использовании + руководство по использованию", key: "usage", description: "Демонстрация товара в процессе использования с инструкциями и рекомендациями" },
  { name: "Сравнение с другими товарами", key: "comparison", description: "Карточка сравнения данного товара с аналогами или конкурентами" },
  { name: "Фото товара без инфографики", key: "clean", description: "Чистое фото товара без дополнительных графических элементов и текста" }
];

// Global polling control - только один polling в любой момент времени
let globalPollingInterval: NodeJS.Timeout | null = null;
let currentPollingJobId: string | null = null;

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
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasCheckedJobs, setHasCheckedJobs] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const { toast } = useToast();

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
      const { data: recentJobs, error } = await supabase
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
        .eq('user_id', profile.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking for active jobs:', error);
        return;
      }

      const latestJob = recentJobs?.[0];
      if (latestJob && latestJob.status === 'completed') {
        const completedTasks = latestJob.generation_tasks?.filter((t: any) => t.status === 'completed') || [];
        
        if (completedTasks.length > 0) {
          // Show completed images from the latest job
          const images = completedTasks
            .sort((a: any, b: any) => a.card_index - b.card_index)
            .map((task: any) => ({
              id: task.id,
              url: task.image_url,
              stage: CARD_STAGES[task.card_index]?.name || `Card ${task.card_index}`,
              stageIndex: task.card_index
            }));
          
          setGeneratedImages(images);
          setJobCompleted(true);
          
          // Уведомление уже создано database trigger'ом в таблице notifications,
          // пользователь увидит его в NotificationCenter. Не дублируем toast.
        }
      } else if (latestJob && latestJob.status === 'processing') {
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
        variant: "destructive",
      });
      return false;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    const oversizedFiles = uploadedFiles.filter(file => file.size > maxSizeBytes);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "Файлы слишком большие",
        description: "Максимальный размер файла: 10 МБ",
        variant: "destructive",
      });
      return false;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = uploadedFiles.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Неподдерживаемый формат",
        description: "Поддерживаются только JPG, PNG и WebP файлы",
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    validateAndAddFiles(imageFiles);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const canGenerate = () => {
    const tokensNeeded = selectedCards.length * 10;
    return files.length > 0 && 
           productName.trim() && 
           productName.trim().length <= 150 &&
           category && 
           description.trim() && 
           description.trim().length <= 600 &&
           selectedCards.length > 0 &&
           profile.tokens_balance >= tokensNeeded && 
           !generating;
  };

  const getGuardMessage = () => {
    const tokensNeeded = selectedCards.length * 10;
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (!productName.trim()) return "Введите название товара";
    if (productName.trim().length > 150) return "Название товара должно быть не более 150 символов";
    if (productName.trim().length < 3) return "Название товара должно содержать минимум 3 символа";
    if (!category) return "Выберите категорию товара";
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
    
    // Расчет времени: ~40 секунд на карточку
    const estimatedSecondsPerCard = 40;
    const totalEstimatedSeconds = selectedCards.length * estimatedSecondsPerCard;
    setEstimatedTimeRemaining(totalEstimatedSeconds); // в секундах
    
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
          
          const progressPercent = (completedTasks.length / selectedCards.length) * 100;
          
          setProgress(progressPercent);
          setCurrentStage(completedTasks.length);
          
          // Обновляем расчетное время
          const remainingCards = selectedCards.length - completedTasks.length;
          const estimatedSecondsPerCard = 40;
          setEstimatedTimeRemaining(remainingCards * estimatedSecondsPerCard);

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
              
              // Note: Уведомления и история теперь создаются автоматически database trigger'ом
              // когда job status меняется на 'completed'. Это работает даже если клиент офлайн.
              // Клиентское уведомление показываем только для лучшего UX когда пользователь онлайн.
              toast({
                title: "Генерация завершена!",
                description: `Все карточки готовы для скачивания`,
              });
              
            } else if (job.status === 'failed') {
              toast({
                title: "Ошибка генерации", 
                description: job.error_message || "Генерация не удалась",
                variant: "destructive",
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
            return
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
    if (downloadingAll || generatedImages.length === 0) return;
    
    setDownloadingAll(true);
    
    try {
      const zip = new JSZip();
      const safeProductName = (productName || 'cards').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      
      toast({
        title: "Создание архива",
        description: "Подготавливаем ZIP-архив с изображениями...",
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
      const zipBlob = await zip.generateAsync({ type: 'blob' });
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
        description: `ZIP-архив с ${generatedImages.length} изображениями готов`,
      });
    } catch (error) {
      console.error('Error creating ZIP archive:', error);
      toast({
        title: "Ошибка создания архива",
        description: "Не удалось создать ZIP-архив. Попробуйте скачать изображения по одному.",
        variant: "destructive",
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

      if (data?.success && data?.taskId && data?.jobId) {
        toast({
          title: "Перегенерация запущена",
          description: `Карточка "${image.stage}" поставлена в очередь на перегенерацию`,
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
        variant: "destructive",
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
        const { data: task, error } = await supabase
          .from('generation_tasks')
          .select('*')
          .eq('id', taskId)
          .single();

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
          setGeneratedImages(prev => prev.map((img, i) => 
            i === imageIndex ? { ...img, url: task.image_url } : img
          ));
          
          toast({
            title: "Перегенерация завершена",
            description: `Карточка успешно перегенерирована`,
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
            variant: "destructive",
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

  // Smooth progress bar animation
  useEffect(() => {
    if (!generating || currentStage >= selectedCards.length) {
      setSmoothProgress(progress);
      return;
    }
    
    // Плавное движение прогресс-бара между реальными обновлениями
    const targetProgress = progress;
    const interval = setInterval(() => {
      setSmoothProgress(prev => {
        if (prev >= targetProgress) return targetProgress;
        // Медленное увеличение (0.1% каждые 100ms = 1% за секунду)
        return Math.min(prev + 0.1, targetProgress);
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [progress, generating, currentStage, selectedCards.length]);

  // Countdown timer for estimated time
  useEffect(() => {
    if (!generating || estimatedTimeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setEstimatedTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    
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
              <label 
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragOver 
                    ? 'border-primary bg-primary/10 hover:bg-primary/20' 
                    : 'border-border bg-muted/30 hover:bg-muted/50'
                }`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                  <Upload className={`w-8 h-8 mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className={`mb-2 text-sm text-center ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
                  </p>
                  <p className={`text-xs text-center ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}>
                    PNG, JPG, JPEG (МАКС. 3 изображения)
                  </p>
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
                      className="w-full aspect-square object-cover rounded-lg border"
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
              onChange={(e) => setProductName(e.target.value.slice(0, 150))}
              maxLength={150}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{productName.length}/150 символов</span>
              {productName.length > 140 && (
                <span className="text-warning">Осталось символов: {150 - productName.length}</span>
              )}
            </div>
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
              onChange={(e) => setDescription(e.target.value.slice(0, 600))}
              rows={4}
              maxLength={600}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{description.length}/600 символов</span>
              {description.length > 570 && (
                <span className="text-warning">Осталось символов: {600 - description.length}</span>
              )}
            </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {CARD_STAGES.map((stage, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
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
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base mb-1 leading-tight">{stage.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{stage.description}</p>
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
                  <span>{Math.round(smoothProgress)}%</span>
                </div>
                <Progress value={smoothProgress} className="w-full" />
                {estimatedTimeRemaining > 0 && (
                  <div className="text-xs text-muted-foreground text-center">
                    {estimatedTimeRemaining >= 60 
                      ? `Расчетное время: ~${Math.ceil(estimatedTimeRemaining / 60)} мин` 
                      : `Расчетное время: ~${estimatedTimeRemaining} сек`}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedCards.map((cardIndex) => {
                  const stage = CARD_STAGES[cardIndex];
                  const completedCount = Math.min(currentStage, selectedCards.length);
                  const currentCardPosition = selectedCards.indexOf(cardIndex);
                  
                  return (
                    <div
                      key={cardIndex}
                      className={`text-xs p-2 rounded border ${
                        currentCardPosition < completedCount
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : currentCardPosition === completedCount
                          ? 'bg-primary/5 border-primary/10 text-primary animate-pulse'
                          : 'bg-muted/30 border-border text-muted-foreground'
                      }`}
                    >
                      {stage.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Images className="w-4 h-4 shrink-0" />
                  <span className="truncate">Готовые карточки ({generatedImages.length}/{selectedCards.length})</span>
                </CardTitle>
                <CardDescription className="text-sm space-y-1">
                  <div>Ваши сгенерированные карточки готовы к скачиванию</div>
                  <div className="text-xs text-muted-foreground">
                    💡 Перегенерация одного изображения: 5 токенов
                  </div>
                </CardDescription>
              </div>
              <Button
                onClick={downloadAll}
                variant="outline"
                className="shrink-0 w-full sm:w-auto"
                size="sm"
                disabled={downloadingAll}
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Создаю ZIP...</span>
                    <span className="sm:hidden">Создаю...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать все
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 lg:px-6">
            <div className="grid gap-2 sm:gap-3">
              {generatedImages.map((image, index) => {
                const cardKey = `${image.id}_${index}`;
                const isRegenerating = regeneratingCards.has(cardKey);
                
                return (
                  <div key={image.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 border rounded-lg bg-muted/30">
                    <div className="relative group shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                      <img
                        src={image.url}
                        alt={`Generated card ${index + 1}`}
                        className="w-20 h-24 sm:w-16 sm:h-20 object-cover rounded-md border cursor-pointer transition-all duration-200 group-hover:brightness-75"
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
                        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-2">
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
                    
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <h3 className="font-medium text-sm sm:text-base text-center sm:text-left truncate">{image.stage}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left line-clamp-2 sm:line-clamp-1 mt-1">
                        {CARD_STAGES[image.stageIndex]?.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateCard(image, index);
                        }}
                        disabled={isRegenerating}
                        className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3"
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            <span className="hidden sm:inline">Перегенерация...</span>
                            <span className="sm:hidden">Обновление...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Перегенерировать</span>
                            <span className="sm:hidden">Обновить</span>
                          </>
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await downloadSingle(index);
                        }}
                        className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3"
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
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <Button 
            onClick={simulateGeneration}
            disabled={!canGenerate()}
            className="w-full bg-wb-purple hover:bg-wb-purple-dark text-sm sm:text-base"
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
          
          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-3 px-2">
            Стоимость: <strong>{selectedCards.length * 10} {selectedCards.length * 10 === 1 ? 'токен' : (selectedCards.length * 10) % 10 >= 2 && (selectedCards.length * 10) % 10 <= 4 && ((selectedCards.length * 10) % 100 < 10 || (selectedCards.length * 10) % 100 >= 20) ? 'токена' : 'токенов'}</strong> за {selectedCards.length} {selectedCards.length === 1 ? 'изображение' : selectedCards.length < 5 ? 'изображения' : 'изображений'}
          </p>
          
          {!canGenerate() && !generating && (
            <Alert className="mt-4 bg-amber-50 border-amber-200 rounded-xl">
              <Info className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-800 font-medium text-xs sm:text-sm">
                <strong>{getGuardMessage()}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          {generating && (
            <>
              <div className="bg-muted/50 border border-muted-foreground/20 rounded-lg p-3 sm:p-4 mt-4">
                <p className="text-muted-foreground text-xs sm:text-sm flex items-start sm:items-center gap-2">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="leading-relaxed">
                    Генерация происходит в фоне, но если вы хотите перегенерировать фото, не закрывайте данное окно. Перегенерация 1 изображения: 5 токенов.
                  </span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2 text-center px-2 leading-relaxed">
                WB Генератор может совершать ошибки. Перегенерируйте фото при необходимости.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};