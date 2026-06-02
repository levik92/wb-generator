import { useState, useEffect, useRef } from "react";
import { getProxiedPublicUrl } from "@/lib/storage";
import { Switch } from "@/components/ui/switch";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Info, Images, Loader2, Upload, X, AlertCircle, Download, Zap, RefreshCw, Clock, CheckCircle2, Eye, Sparkles, TrendingUp, Gift, ArrowRight, Edit, AlertTriangle, Video, ChevronDown, ZoomIn, ExternalLink, Coins, ShieldCheck, Check, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GenerationPopups } from "./GenerationPopups";
import JSZip from 'jszip';
import exampleBefore1 from "@/assets/example-before-after-1.jpg";
import exampleAfter1 from "@/assets/example-after-1.jpg";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import { useActiveAiModel, getImageEdgeFunctionName, getIdentifyFunctionName } from "@/hooks/useActiveAiModel";
import { CollapsibleInfoBlock } from "@/components/dashboard/CollapsibleInfoBlock";
import { compressImage, compressImages } from "@/lib/imageCompression";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
  login_count?: number;
}
interface GenerateCardsProps {
  profile: Profile;
  onTokensUpdate: () => void;
  onNavigateToBalance?: () => void;
  onNavigateToLearning?: () => void;
  onNavigateToVideo?: (imageUrl: string) => void;
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
}, {
  name: "Редактирование изображения",
  key: "mainEdit",
  description: "Поменять товар, сделать редизайн, сменить ракурс или цвет и пр."
}];

// Global polling control - только один polling в любой момент времени
let globalPollingInterval: NodeJS.Timeout | null = null;
let currentPollingJobId: string | null = null;

const sanitizeApiErrorMessage = (message?: string | null) => {
  if (!message) return "Ошибка работы в API";

  const normalized = message.toLowerCase();
  const providerMentions = [
    "gemini",
    "google",
    "openai",
    "kling",
    "polza",
    "api error",
  ];

  if (providerMentions.some((term) => normalized.includes(term))) {
    return "Ошибка работы в API";
  }

  return message;
};

// Classify a client-side error from the generation start flow into a user-friendly message.
const classifyClientStartError = (error: any, stage: string): { title: string; description: string } => {
  const raw = (error?.message || error?.error_description || error?.toString?.() || '').toString();
  const status = error?.context?.status ?? error?.status;
  const lower = raw.toLowerCase();

  if (status === 402 || lower.includes('insufficient') || lower.includes('недостаточно')) {
    return { title: "Недостаточно токенов", description: "Пополните баланс, чтобы запустить генерацию." };
  }
  if (status === 401 || status === 403 || lower.includes('jwt') || lower.includes('unauthor')) {
    return { title: "Сессия истекла", description: "Войдите в аккаунт заново и попробуйте ещё раз." };
  }
  if (lower.includes('upload') || lower.includes('storage') || stage === 'upload') {
    return { title: "Не удалось загрузить фото", description: "Проверьте интернет и попробуйте снова. Если фото больше 3 МБ — уменьшите размер." };
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network error') || lower.includes('functionsfetcherror')) {
    return { title: "Нет связи с сервером", description: "Проверьте интернет-соединение и повторите попытку." };
  }
  if (lower.includes('timeout') || lower.includes('aborted')) {
    return { title: "Превышено время ожидания", description: "Сервер отвечает медленно. Повторите попытку через минуту." };
  }
  return { title: "Ошибка генерации", description: "Не удалось запустить генерацию. Попробуйте позже." };
};

export const GenerateCards = ({
  profile,
  onTokensUpdate,
  onNavigateToBalance,
  onNavigateToLearning,
  onNavigateToVideo
}: GenerateCardsProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [autoDescription, setAutoDescription] = useState(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]); // По умолчанию ничего не выбрано
  const [unifiedStyling, setUnifiedStyling] = useState(false);
  const [unifiedStylingManuallyDisabled, setUnifiedStylingManuallyDisabled] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('3:4');
  const [aspectRatioOpen, setAspectRatioOpen] = useState(false);
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
  const [isUploading, setIsUploading] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [previousJobStatus, setPreviousJobStatus] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Cards promo banner dismissal
  const CARDS_PROMO_KEY = `cards_promo_banner_dismissed_${profile.id}`;
  const CARDS_HERO_KEY = `cards_hero_block_hidden_${profile.id}`;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRefDragOver, setIsRefDragOver] = useState(false);
  const [hasCheckedJobs, setHasCheckedJobs] = useState(false);
  const [isRestoredGeneration, setIsRestoredGeneration] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [totalEstimatedTime, setTotalEstimatedTime] = useState<number>(0); // Полное время генерации
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0);
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [uploadedProductImages, setUploadedProductImages] = useState<Array<{
    url: string;
    name: string;
    type?: string;
  }>>([]);
  // Store original job data for regeneration/editing (not visible in form)
  const [jobData, setJobData] = useState<{
    productName: string;
    category: string;
    description: string;
    productImages: Array<{
      url: string;
      name: string;
      type?: string;
    }>;
  } | null>(null);
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
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
  
  // Edit variants: track all versions per image index
  const [imageVariants, setImageVariants] = useState<Record<number, Array<{ url: string; label: string; id?: string }>>>({});
  const [selectedVariant, setSelectedVariant] = useState<Record<number, number>>({});

  // Style generation dialog state
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [styleSourceImage, setStyleSourceImage] = useState<any | null>(null);
  const [styleSelectedCards, setStyleSelectedCards] = useState<number[]>([]);
  const [styleDescription, setStyleDescription] = useState("");
  const [styleAutoDescription, setStyleAutoDescription] = useState(false);
  const [styleGenerating, setStyleGenerating] = useState(false);
  
  // Ref to save images before style generation for merging after completion
  const preStyleImagesRef = useRef<any[]>([]);
  
  const WAITING_MESSAGES = ["Еще чуть-чуть...", "Добавляем мелкие детали...", "Причесываем и шлифуем...", "Почти готово, немного терпения..."];

  // Load generation count from localStorage on mount
  useEffect(() => {
    const storedCount = localStorage.getItem(`generation_count_${profile.id}`);
    if (storedCount) {
      setGenerationCount(parseInt(storedCount, 10));
    }
  }, [profile.id]);

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

  // Reset stuck regenerating buttons when component unmounts
  // (e.g. user switches tabs while regeneration polling was in flight)
  useEffect(() => {
    return () => {
      setRegeneratingCards(new Set());
    };
  }, []);
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
        `).eq('user_id', profile.id).not('category', 'in', '("edit","regeneration")').is('source_job_id', null).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
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
          const rawProductImages = latestJob.product_images as Array<{
            url: string;
            name?: string;
            type?: string;
          }> || [];
          const productImages = rawProductImages.map((img, idx) => ({
            url: img.url,
            name: img.name || `product_${idx + 1}`,
            type: img.type,
          }));
          setJobData({
            productName: latestJob.product_name || '',
            category: latestJob.category || '',
            description: latestJob.description || '',
            productImages: productImages
          });
          // Keep full image metadata (incl. reference type) for regeneration/edit flows
          setUploadedProductImages(
            productImages.map((img, idx) => ({
              url: img.url,
              name: img.name || `product_${idx + 1}`,
              type: img.type,
            }))
          );

          // Show completed images from the latest job
          const images = completedTasks.sort((a: any, b: any) => a.card_index - b.card_index).map((task: any) => ({
            id: task.id,
            url: task.image_url,
            stage: CARD_STAGES[task.card_index]?.name || `Card ${task.card_index}`,
            stageIndex: task.card_index,
            cardType: task.card_type,
            jobId: latestJob.id  // Store jobId for regeneration even after currentJobId is cleared
          }));
          setGeneratedImages(images);
          setJobCompleted(true);

          // Restore edit variants from completed edit jobs linked to this main job
          // First find the generation record for this job to get sourceGenerationId
          let sourceGenId: string | null = null;
          const { data: genRecord } = await supabase
            .from('generations')
            .select('id')
            .eq('user_id', profile.id)
            .eq('generation_type', 'cards')
            .filter('input_data->>job_id', 'eq', latestJob.id)
            .maybeSingle();
          if (genRecord?.id) {
            sourceGenId = genRecord.id;
          }

          // Build query for edit/regeneration jobs - filter by sourceGenerationId in description
          let editQuery = supabase
            .from('generation_jobs')
            .select(`
              *,
              generation_tasks (
                id, card_index, card_type, status, image_url, created_at
              )
            `)
            .eq('user_id', profile.id)
            .in('category', ['edit', 'regeneration'])
            .eq('status', 'completed')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });
          
          // If we have a sourceGenerationId, filter edits to only those linked to this job
          if (sourceGenId) {
            editQuery = editQuery.like('description', `%[sourceGenerationId:${sourceGenId}]%`);
          }

          const { data: completedEditJobs } = await editQuery;

          let restoredVariants: Record<number, Array<{ url: string; label: string; id?: string }>> = {};
          let restoredSelected: Record<number, number> = {};
          if (completedEditJobs && completedEditJobs.length > 0) {

            for (const editJob of completedEditJobs) {
              const editTasks = editJob.generation_tasks?.filter((t: any) => t.status === 'completed' && t.image_url) || [];
              const isRegen = editJob.category === 'regeneration';
              for (const task of editTasks) {
                const imgIndex = images.findIndex((img: any) => img.stageIndex === task.card_index);
                if (imgIndex >= 0) {
                  if (!restoredVariants[imgIndex]) {
                    // Start with original
                    restoredVariants[imgIndex] = [{ url: images[imgIndex].url, label: 'Оригинал', id: images[imgIndex].id }];
                  }
                  const vNum = restoredVariants[imgIndex].length;
                  const labelPrefix = isRegen ? 'Ген.' : 'Ред.';
                  restoredVariants[imgIndex].push({ url: task.image_url, label: `${labelPrefix} v.${vNum}`, id: task.id });
                  restoredSelected[imgIndex] = restoredVariants[imgIndex].length - 1;
                }
              }
            }

            if (Object.keys(restoredVariants).length > 0) {
              setImageVariants(restoredVariants);
              setSelectedVariant(restoredSelected);
              // Update displayed images to show last variant
              setGeneratedImages(prev => prev.map((img, i) => {
                if (restoredVariants[i] && restoredSelected[i] !== undefined) {
                  const variant = restoredVariants[i][restoredSelected[i]];
                  return { ...img, url: variant.url };
                }
                return img;
              }));
            }
          }

          // Also load completed style job results (children of this main job)
          const { data: styleChildJobs } = await supabase
            .from('generation_jobs')
            .select(`
              *,
              generation_tasks (
                id, card_index, card_type, status, image_url, storage_path
              )
            `)
            .eq('user_id', profile.id)
            .eq('source_job_id', latestJob.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: true });

          if (styleChildJobs && styleChildJobs.length > 0) {
            // Collect all styled tasks with their metadata
            const allStyledTasks: Array<{ task: any; jobId: string }> = [];
            for (const sj of styleChildJobs) {
              const tasks = sj.generation_tasks?.filter((t: any) => t.status === 'completed' && t.image_url) || [];
              for (const task of tasks) {
                allStyledTasks.push({ task, jobId: sj.id });
              }
              // Check one level deeper (style of style)
              const { data: deeperJobs } = await supabase
                .from('generation_jobs')
                .select(`*, generation_tasks (id, card_index, card_type, status, image_url, storage_path)`)
                .eq('user_id', profile.id)
                .eq('source_job_id', sj.id)
                .eq('status', 'completed');
              if (deeperJobs) {
                for (const dsj of deeperJobs) {
                  const dtasks = dsj.generation_tasks?.filter((t: any) => t.status === 'completed' && t.image_url) || [];
                  for (const task of dtasks) {
                    allStyledTasks.push({ task, jobId: dsj.id });
                  }
                }
              }
            }
            
            // Add styled tasks as variants of existing images, or as new images if card type is new
            if (allStyledTasks.length > 0) {
              // Build variants synchronously to avoid race conditions between state setters
              const currentVariants: Record<number, Array<{ url: string; label: string; id?: string }>> = {
                ...restoredVariants,
              };
              const styleSelected: Record<number, number> = {};
              const newImages: typeof images = [];

              for (const { task, jobId: styledJobId } of allStyledTasks) {
                let imgIndex = images.findIndex((img: any) => img.stageIndex === task.card_index);
                if (imgIndex < 0) {
                  const newIdx = newImages.findIndex((img: any) => img.stageIndex === task.card_index);
                  if (newIdx >= 0) {
                    imgIndex = images.length + newIdx;
                  }
                }

                if (imgIndex >= 0) {
                  if (!currentVariants[imgIndex]) {
                    const sourceImg = imgIndex < images.length ? images[imgIndex] : newImages[imgIndex - images.length];
                    currentVariants[imgIndex] = [{ url: sourceImg.url, label: 'Оригинал', id: sourceImg.id }];
                  }
                  const styleCount = currentVariants[imgIndex].filter(v => v.label.startsWith('Стиль')).length;
                  currentVariants[imgIndex].push({ url: task.image_url, label: `Стиль ${styleCount + 1}`, id: task.id });
                  styleSelected[imgIndex] = currentVariants[imgIndex].length - 1;
                } else {
                  newImages.push({
                    id: task.id,
                    url: task.image_url,
                    stage: CARD_STAGES[task.card_index]?.name || `Card ${task.card_index}`,
                    stageIndex: task.card_index,
                    cardType: task.card_type,
                    jobId: styledJobId
                  });
                }
              }

              const finalSelected = {
                ...restoredSelected,
                ...styleSelected,
              };

              setImageVariants(currentVariants);
              setSelectedVariant(finalSelected);

              const updatedImages = images.map((img, i) => {
                if (currentVariants[i] && finalSelected[i] !== undefined) {
                  const variant = currentVariants[i][finalSelected[i]];
                  return { ...img, url: variant.url };
                }
                return img;
              });

              setGeneratedImages([...updatedImages, ...newImages]);
            }
          }

          // Уведомление уже создано database trigger'ом в таблице notifications,
          // пользователь увидит его в NotificationCenter. Не дублируем toast.
        }
      } else if (latestJob && (latestJob.status === 'processing' || latestJob.status === 'pending')) {
          // After the category fix, any job here is guaranteed to be a main generation
          // (regeneration jobs have category='regeneration' and are excluded by the query)
          // So always show the full progress bar
          setCurrentJobId(latestJob.id);
          setGenerating(true);
          setIsRestoredGeneration(true);
          setJobCompleted(false);

          // Calculate elapsed time and restore timer
          const elapsedMs = Date.now() - new Date(latestJob.created_at).getTime();
          const totalCards = latestJob.total_cards || 1;
          const estimatedSecondsPerCard = 40;
          const unifiedExtra = latestJob.unified_styling ? 35 : 0;
          const totalEstimatedSeconds = totalCards * estimatedSecondsPerCard + unifiedExtra;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          const remaining = Math.max(0, totalEstimatedSeconds - elapsedSeconds);
          setEstimatedTimeRemaining(remaining);
          setTotalEstimatedTime(totalEstimatedSeconds);
          setSmoothProgress(Math.min(95, (elapsedSeconds / totalEstimatedSeconds) * 100));

          // Restore selected cards from job tasks
          const taskCardIndices = latestJob.generation_tasks?.map((t: any) => t.card_index).filter((v: any, i: any, a: any) => a.indexOf(v) === i).sort((a: number, b: number) => a - b) || [];
          if (taskCardIndices.length > 0) {
            setSelectedCards(taskCardIndices);
          }

          // Save job data but keep form fields empty during processing
          const rawProductImages = latestJob.product_images as Array<{
            url: string;
            name?: string;
            type?: string;
          }> || [];
          const productImages = rawProductImages.map((img, idx) => ({
            url: img.url,
            name: img.name || `product_${idx + 1}`,
            type: img.type,
          }));
          setJobData({
            productName: latestJob.product_name || '',
            category: latestJob.category || '',
            description: latestJob.description || '',
            productImages: productImages
          });
          setUploadedProductImages(
            productImages.map((img, idx) => ({
              url: img.url,
              name: img.name || `product_${idx + 1}`,
              type: img.type,
            }))
          );

          // Resume polling for active job
          startJobPolling(latestJob.id, { skipTimerReset: true });
      }

      // Check for active per-card edit tasks (editing/regeneration started before leaving)
      if (!latestJob || latestJob.status === 'completed') {
        const { data: activeEditJobs } = await supabase
          .from('generation_jobs')
          .select(`
            *,
            generation_tasks (
              id, card_index, card_type, status, image_url
            )
          `)
          .eq('user_id', profile.id)
          .in('category', ['edit', 'regeneration'])
          .in('status', ['processing', 'pending'])
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // last 10 min
          .order('created_at', { ascending: false })
          .limit(10);

        if (activeEditJobs && activeEditJobs.length > 0) {
          // We need the current generated images to match edit tasks to their originals
          // Use a slight delay to ensure generatedImages state is set from the completed job above
          setTimeout(() => {
            setGeneratedImages(currentImages => {
              for (const editJob of activeEditJobs!) {
                const isRegen = editJob.category === 'regeneration';
                const activeTasks = editJob.generation_tasks?.filter((t: any) => t.status === 'processing' || t.status === 'pending' || t.status === 'retrying') || [];
                for (const task of activeTasks) {
                  // Find the matching image by stageIndex (card_index)
                  const imgIndex = currentImages.findIndex(img => img.stageIndex === task.card_index);
                  if (imgIndex >= 0) {
                    const img = currentImages[imgIndex];
                    if (isRegen) {
                      const cardKey = `${img.id}_${imgIndex}`;
                      setRegeneratingCards(prev => new Set([...prev, cardKey]));
                      pollRegenerationTask(task.id, imgIndex, cardKey);
                    } else {
                      const cardKey = `edit_${img.id}_${imgIndex}`;
                      setEditingCards(prev => new Set([...prev, cardKey]));
                      pollEditTask(task.id, imgIndex, cardKey);
                    }
                  }
                }
              }
              return currentImages; // don't modify
            });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error checking for active jobs:', error);
    }
  };
  useEffect(() => {
    if (generating && !isRestoredGeneration) {
      setGeneratedImages([]);
    }
  }, [generating, isRestoredGeneration]);
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
    
    // Auto-detect product name on every new upload
    if (uploadedFiles.length > 0) {
      identifyProduct(uploadedFiles[0]);
    }
    
    return true;
  };
  const identifyProduct = async (file: File) => {
    try {
      setIsIdentifying(true);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const identifyFn = getIdentifyFunctionName(activeModel?.provider);
      const { data, error } = await supabase.functions.invoke(identifyFn, {
        body: { imageBase64: base64 },
      });
      
      if (!error && data?.productName) {
        setProductName(data.productName.slice(0, 150));
      }
    } catch (err) {
      console.error('Auto-detect failed:', err);
    } finally {
      setIsIdentifying(false);
    }
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
    processReferenceFile(file);
  };

  const processReferenceFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) {
      const maxSizeBytes = 3 * 1024 * 1024; // 3 MB
      if (file.size > maxSizeBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast({
          title: "Файл слишком большой",
          description: `"${file.name}" (${sizeMB} МБ) превышает лимит 3 МБ. Пожалуйста, сожмите изображение.`,
          variant: "destructive"
        });
        return;
      }
      setReferenceImage(file);
    }
  };

  const handleRefDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRefDragOver(true);
  };

  const handleRefDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRefDragOver(true);
  };

  const handleRefDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRefDragOver(false);
  };

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRefDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFile = droppedFiles.find(file => file.type.startsWith('image/'));
    if (!imageFile) {
      toast({
        title: "Неподдерживаемый файл",
        description: "Можно загружать только изображения",
        variant: "destructive"
      });
      return;
    }
    processReferenceFile(imageFile);
  };

  const removeReference = () => {
    setReferenceImage(null);
  };
  const canGenerate = () => {
    const tokensNeeded = selectedCards.length * photoGenerationPrice;
    return files.length > 0 && productName.trim() && productName.trim().length <= 150 && description.trim() && description.trim().length <= 1200 && selectedCards.length > 0 && profile.tokens_balance >= tokensNeeded && !generating && !priceLoading;
  };
  const getGuardMessage = () => {
    const tokensNeeded = selectedCards.length * photoGenerationPrice;
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (!productName.trim()) return "Введите название товара";
    if (productName.trim().length > 150) return "Название товара должно быть не более 150 символов";
    if (productName.trim().length < 3) return "Название товара должно содержать минимум 3 символа";
    if (!description.trim()) return "Добавьте описание товара";
    if (description.trim().length > 1200) return "Описание должно быть не более 1200 символов";
    if (description.trim().length < 10) return "Описание должно содержать минимум 10 символов";
    if (selectedCards.length === 0) return "Выберите хотя бы один тип карточки";
    if (profile.tokens_balance < tokensNeeded) return `Недостаточно токенов (нужно ${tokensNeeded})`;
    if (generating) return "Генерация уже выполняется";
    return null;
  };
  const handleCardToggle = (cardIndex: number) => {
    setSelectedCards(prev => {
      const newSelection = prev.includes(cardIndex)
        ? prev.filter(i => i !== cardIndex)
        : [...prev, cardIndex].sort((a, b) => a - b);
      
      // Auto-enable unified styling when 2+ cards selected (unless manually disabled)
      if (newSelection.length >= 2 && !unifiedStylingManuallyDisabled) {
        setUnifiedStyling(true);
      } else if (newSelection.length < 2) {
        setUnifiedStyling(false);
      }
      
      return newSelection;
    });
  };
  const startJobPolling = (jobId: string, options?: { skipTimerReset?: boolean }) => {
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

    // Расчет времени: 40 секунд на изображение + 35 секунд на стилизацию
    // Skip timer reset when restoring from navigation (values already set by checkForActiveJobs)
    if (!options?.skipTimerReset) {
      const estimatedSecondsPerCard = 40;
      const unifiedExtra = unifiedStyling ? 35 : 0;
      const totalEstimatedSeconds = selectedCards.length * estimatedSecondsPerCard + unifiedExtra;
      setEstimatedTimeRemaining(totalEstimatedSeconds); // в секундах
      setTotalEstimatedTime(totalEstimatedSeconds); // Сохраняем полное время для расчета прогресса
      setWaitingMessageIndex(0); // Сбрасываем индекс сообщений
    }

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
          const totalCards = job.total_cards || selectedCards.length || 1;
          const progressPercent = completedTasks.length / totalCards * 100;
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
          } else if (job.status === 'pending') {
            setJobStatus('Обрабатываю...');
          } else {
            setJobStatus(job.status);
          }

          // Update generated images
          if (completedTasks.length > 0) {
            const images = completedTasks.sort((a: any, b: any) => a.card_index - b.card_index).map((task: any) => ({
              id: task.id,
              url: task.image_url,
              stage: CARD_STAGES[task.card_index]?.name || `Card ${task.card_index}`,
              stageIndex: task.card_index,
              cardType: task.card_type,
              jobId: job.id
            }));
            // If this is a style generation, merge styled images as variants
            if (preStyleImagesRef.current.length > 0) {
              const baseImages = [...preStyleImagesRef.current];
              
              // Add each styled image as a variant of the matching stageIndex
              const updatedVariants: Record<number, Array<{ url: string; label: string; id?: string }>> = { ...imageVariants };
              const updatedSelected: Record<number, number> = { ...selectedVariant };
              
              for (const styledImg of images) {
                const baseIdx = baseImages.findIndex(b => b.stageIndex === styledImg.stageIndex);
                if (baseIdx >= 0) {
                  const existing = updatedVariants[baseIdx] || [];
                  if (existing.length === 0) {
                    updatedVariants[baseIdx] = [
                      { url: baseImages[baseIdx].url, label: 'Оригинал', id: baseImages[baseIdx].id },
                      { url: styledImg.url, label: 'Стиль 1', id: styledImg.id }
                    ];
                    updatedSelected[baseIdx] = 1;
                  } else {
                    const styleCount = existing.filter(v => v.label.startsWith('Стиль')).length;
                    updatedVariants[baseIdx] = [...existing, { url: styledImg.url, label: `Стиль ${styleCount + 1}`, id: styledImg.id }];
                    updatedSelected[baseIdx] = updatedVariants[baseIdx].length - 1;
                  }
                  // Update displayed URL to the new styled version
                  baseImages[baseIdx] = { ...baseImages[baseIdx], url: styledImg.url };
                } else {
                  baseImages.push(styledImg);
                }
              }
              
              setGeneratedImages(baseImages);
              setImageVariants(updatedVariants);
              setSelectedVariant(updatedSelected);
            } else {
              setGeneratedImages(images);
            }
          }

          // Check if ALL cards are completed (not just job status)
          const allTotalCards = job.total_cards || selectedCards.length || 1;
          const allCompleted = completedTasks.length === allTotalCards;
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

              // Increment generation count for popups tracking
              const newCount = generationCount + 1;
              setGenerationCount(newCount);
              localStorage.setItem(`generation_count_${profile.id}`, String(newCount));

              // Note: Уведомления и история теперь создаются автоматически database trigger'ом
              // когда job status меняется на 'completed'. Это работает даже если клиент офлайн.
              // Клиентское уведомление показываем только для лучшего UX когда пользователь онлайн.
              toast({
                title: "Генерация завершена!",
                description: `Все карточки готовы для скачивания`
              });

              // Clear pre-style ref (merge already happened during polling)
              if (preStyleImagesRef.current.length > 0) {
                preStyleImagesRef.current = [];
              }
            } else if (job.status === 'completed' && hasFailures) {
              // Partial success — show why some failed
              toast({
                title: "Готово частично",
                description: sanitizeApiErrorMessage(job.error_message) || `Удалось сгенерировать не все карточки. Токены за неудачные возвращены.`,
                variant: "destructive",
                duration: 9000,
              });
            } else if (job.status === 'failed') {
              toast({
                title: "Ошибка генерации",
                description: sanitizeApiErrorMessage(job.error_message) || "Генерация не удалась. Токены возвращены на баланс.",
                variant: "destructive",
                duration: 9000,
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
    setImageVariants({}); // Clear edit variants
    setSelectedVariant({}); // Clear selected variants
    setIsRestoredGeneration(false); // This is a new generation

    if (!canGenerate()) return;
    setGenerating(true);
    setProgress(0);
    setCurrentStage(0);
    setJobStatus('Создание задачи генерации...');
    let stage: 'compress' | 'upload' | 'invoke' | 'unknown' = 'unknown';
    try {
      // Compress images before upload
      stage = 'compress';
      setIsUploading(true);
      setJobStatus('Оптимизация изображений...');
      const compressedFiles = await compressImages(files);

      // Upload files to Supabase Storage first
      stage = 'upload';
      const productImagesData = [];
      for (let i = 0; i < compressedFiles.length; i++) {
        const file = compressedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}/${Date.now()}_${i}.${fileExt}`;
        setJobStatus(`Загрузка изображения ${i + 1} из ${compressedFiles.length}...`);
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
        const publicUrl = getProxiedPublicUrl('product-images', fileName);
        productImagesData.push({
          url: publicUrl,
          name: `image_${i + 1}.${fileExt}`,
          type: 'product'  // Mark as product image for consistency
        });
      }

      // Upload reference image if provided
      let referenceImageUrl: string | null = null;
      if (referenceImage) {
        setJobStatus('Оптимизация референса...');
        const compressedRef = await compressImage(referenceImage);
        setJobStatus('Загрузка референса дизайна...');
        const fileExt = compressedRef.name.split('.').pop();
        const fileName = `${profile.id}/reference_${Date.now()}.${fileExt}`;
        const {
          data: uploadData,
          error: uploadError
        } = await supabase.storage.from('product-images').upload(fileName, compressedRef, {
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
          referenceImageUrl = getProxiedPublicUrl('product-images', fileName);
        }
      }

      // Build complete product images array including reference
      const allImagesForJob: Array<{ url: string; name: string; type: string }> = productImagesData.map((img, idx) => ({
        url: img.url,
        name: img.name || `product_${idx + 1}`,
        type: 'product'
      }));
      
      // Add reference image if present
      if (referenceImageUrl) {
        allImagesForJob.push({
          url: referenceImageUrl,
          name: 'reference',
          type: 'reference'
        });
      }
      
      // Save uploaded images URLs and job data for regeneration (includes reference!)
      setUploadedProductImages(allImagesForJob);
      setJobData({
        productName: productName,
        category: category || 'товар',
        description: description,
        productImages: allImagesForJob
      });
      stage = 'invoke';
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
      const createJobFunction = getImageEdgeFunctionName('create-generation-job', activeModel?.model || 'google', activeModel?.provider);
      console.log('[GenerateCards] Active model:', activeModel?.model, '| Provider:', activeModel?.provider, '| Function:', createJobFunction);
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
          selectedCards: selectedCards,
          unifiedStyling: unifiedStyling && selectedCards.length >= 2,
          aspectRatio
        }
      });
      if (error) {
        console.error('Job creation error:', error);
        toast({
          title: "Ошибка создания задачи",
          description: "Не удалось создать задачу генерации. Попробуйте позже",
          variant: "destructive"
        });
        return;
      }
      if (data.success && data.jobId) {
        setIsUploading(false);
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
      console.error('[GenerateCards] Generation error at stage:', stage, error);
      const { title, description } = classifyClientStartError(error, stage);
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000,
      });
      setGenerating(false);
      setIsUploading(false);
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
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const safeZipName = (productName || 'cards').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      
      // Standard download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeZipName}_all_cards.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
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
      // Standard browser: fetch as blob for proper download
      const response = await fetch(image.url);
      const blob = await response.blob();
      const safeProductName = productName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      const safeStageName = image.stage.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      
      // Standard download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeProductName}_${safeStageName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
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
      const regenerateFunction = getImageEdgeFunctionName('regenerate-single-card', activeModel?.model || 'google', activeModel?.provider);
      console.log('[GenerateCards] Regenerate - Active model:', activeModel?.model, '| Provider:', activeModel?.provider, '| Function:', regenerateFunction);

      // Collect all product images and reference image for regeneration
      // PRIORITY: Database is the source of truth (has complete data incl. reference)
      let allProductImages: Array<{ url: string; name: string; type: string }> = [];
      let productNameToUse = '';
      let categoryToUse = '';
      let descriptionToUse = '';

      // Find the job ID to query (current active job or the one this image belongs to)
      // CRITICAL: prioritize image.jobId since currentJobId is cleared after job completion
      let jobIdForRegeneration = image.jobId || image.job_id || currentJobId;

      // Fallback 1: image came from History — use generation_id to find the job
      if (!jobIdForRegeneration && (image.generationId || image.generation_id)) {
        const genId = image.generationId || image.generation_id;
        const { data: genRow } = await supabase
          .from('generations')
          .select('input_data, output_data')
          .eq('id', genId)
          .maybeSingle();
        const inputJobId = (genRow?.input_data as any)?.job_id;
        const outputJobId = (genRow?.output_data as any)?.job_id;
        if (inputJobId || outputJobId) {
          jobIdForRegeneration = inputJobId || outputJobId;
        }
      }

      // Fallback 2: try generation_tasks lookup by image.id (if it happens to be a task id)
      if (!jobIdForRegeneration && image.id) {
        const { data: taskData } = await supabase
          .from('generation_tasks')
          .select('job_id')
          .eq('id', image.id)
          .maybeSingle();

        if (taskData?.job_id) {
          jobIdForRegeneration = taskData.job_id;
        }
      }

      if (jobIdForRegeneration) {
        // BEST SOURCE: Fetch from database - contains complete data including reference
        const { data: job, error: jobError } = await supabase
          .from('generation_jobs')
          .select('product_name, category, description, product_images')
          .eq('id', jobIdForRegeneration)
          .single();

        if (!jobError && job) {
          productNameToUse = job.product_name || '';
          categoryToUse = job.category || 'товар';
          descriptionToUse = job.description || '';

          if (job.product_images && Array.isArray(job.product_images) && job.product_images.length > 0) {
            allProductImages = (job.product_images as Array<{ url: string; name?: string; type?: string }>).map((img, idx) => ({
              url: img.url,
              name: img.name || `product_${idx + 1}`,
              type: img.type || 'product'
            }));
          }
        } else if (jobError) {
          console.error('[Regenerate] generation_jobs fetch failed', { jobIdForRegeneration, jobError });
        }
      }

      // Fallback to jobData if DB fetch didn't work
      if (allProductImages.length === 0 && jobData?.productImages && jobData.productImages.length > 0) {
        allProductImages = jobData.productImages.map((img: { url: string; name?: string; type?: string }, idx: number) => ({
          url: img.url,
          name: img.name || `product_${idx + 1}`,
          type: img.type || 'product'
        }));
        productNameToUse = productNameToUse || jobData.productName || '';
        categoryToUse = categoryToUse || jobData.category || 'товар';
        descriptionToUse = descriptionToUse || jobData.description || '';
      }

      // Last fallback: uploadedProductImages state
      if (allProductImages.length === 0 && uploadedProductImages.length > 0) {
        allProductImages = uploadedProductImages.map((img, idx) => ({
          url: img.url,
          name: img.name || `product_${idx + 1}`,
          type: img.type || 'product'
        }));
      }

      // Final fallback for text fields: form fields
      if (!productNameToUse) productNameToUse = productName;
      if (!categoryToUse || categoryToUse === 'товар') categoryToUse = category || 'товар';
      if (!descriptionToUse) descriptionToUse = description;

      if (allProductImages.length === 0) {
        console.error('[Regenerate] aborted: no source images', {
          reason: 'no_source_images',
          imageId: image?.id,
          imageJobId: image?.jobId,
          imageGenerationId: image?.generationId || image?.generation_id,
          jobIdForRegeneration,
          hasJobData: !!jobData,
          jobDataImages: jobData?.productImages?.length || 0,
          uploadedCount: uploadedProductImages.length,
          currentJobId,
        });
        throw new Error('Оригинальные изображения недоступны');
      }

      // Log regeneration context for debugging
      const referenceCount = allProductImages.filter(img => img.type === 'reference').length;
      const productCount = allProductImages.filter(img => img.type === 'product').length;
      console.log(`[Regeneration] cardType: ${image.cardType}, images: ${allProductImages.length} (product: ${productCount}, reference: ${referenceCount})`);

      // First product image URL for backward compatibility
      const sourceImageUrl = allProductImages.find(img => img.type === 'product')?.url || allProductImages[0].url;

      if (!productNameToUse?.trim()) {
        console.error('[Regenerate] aborted: no product name', {
          reason: 'no_product_name',
          imageId: image?.id,
          jobIdForRegeneration,
          hasJobData: !!jobData,
          formProductName: productName,
        });
        throw new Error('Название товара недоступно');
      }

      // Find sourceGenerationId so the DB trigger clusters the regen with the original
      let sourceGenerationId: string | undefined;
      if (jobIdForRegeneration) {
        const { data: genData } = await supabase
          .from('generations')
          .select('id')
          .eq('user_id', profile.id)
          .eq('generation_type', 'cards')
          .filter('input_data->>job_id', 'eq', jobIdForRegeneration)
          .maybeSingle();
        if (genData?.id) {
          sourceGenerationId = genData.id;
        }
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
          sourceImageUrl: sourceImageUrl,
          productImages: allProductImages,
          sourceGenerationId,
          sourceJobId: jobIdForRegeneration
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

      // Map specific errors to actionable user-friendly messages
      let title = "Ошибка перегенерации";
      let description = "Не удалось перегенерировать карточку. Попробуйте позже";

      const message = error?.message || '';
      const errorName = error?.name || '';
      const isNetworkError =
        errorName === 'FunctionsFetchError' ||
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('network');

      if (message === 'Оригинальные изображения недоступны') {
        title = "Не найдены исходные изображения";
        description = "Откройте генерацию заново из истории и попробуйте снова";
      } else if (message === 'Название товара недоступно') {
        title = "Не определено название товара";
        description = "Перезагрузите страницу и попробуйте ещё раз";
      } else if (isNetworkError) {
        title = "Нет связи с сервером";
        description = "Проверьте интернет-соединение и попробуйте снова";
      } else if (error?.context?.status === 402 || message.toLowerCase().includes('insufficient')) {
        title = "Недостаточно токенов";
        description = "Пополните баланс, чтобы продолжить";
      }

      toast({
        title,
        description,
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
          // Add as a new variant instead of replacing (like edits, but with "Ген." label)
          setImageVariants(prev => {
            const existing = prev[imageIndex] || [];
            const currentImage = generatedImages[imageIndex];
            const variants = existing.length === 0 && currentImage 
              ? [{ url: currentImage.url, label: 'Оригинал', id: currentImage.id }] 
              : [...existing];
            const newLabel = `Ген. v.${variants.length}`;
            variants.push({ url: task.image_url, label: newLabel, id: task.id });
            return { ...prev, [imageIndex]: variants };
          });
          // Select the new variant
          setSelectedVariant(prev => {
            const existing = imageVariants[imageIndex] || [];
            const newIdx = existing.length === 0 ? 1 : existing.length;
            return { ...prev, [imageIndex]: newIdx };
          });
          // Update the displayed image
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
            description: sanitizeApiErrorMessage(task.last_error) || 'Перегенерация не удалась',
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
      const editFunction = getImageEdgeFunctionName('edit-card', activeModel?.model || 'google', activeModel?.provider);
      console.log('[GenerateCards] Edit - Active model:', activeModel?.model, '| Provider:', activeModel?.provider, '| Function:', editFunction);

      // Try to get product name from jobData or form field
      const productNameToUse = jobData?.productName || productName;
      if (!productNameToUse) {
        throw new Error('Название товара недоступно');
      }

      // Find sourceGenerationId so the DB trigger clusters the edit with the original
      let sourceGenerationId: string | undefined;
      const editJobId = editingImage.jobId || currentJobId;
      if (editJobId) {
        const { data: genData } = await supabase
          .from('generations')
          .select('id')
          .eq('user_id', profile.id)
          .eq('generation_type', 'cards')
          .filter('input_data->>job_id', 'eq', editJobId)
          .maybeSingle();
        if (genData?.id) {
          sourceGenerationId = genData.id;
        }
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
          editInstructions: editInstructions,
          sourceGenerationId
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
        description: "Не удалось отредактировать карточку. Попробуйте позже",
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
          // Add as a new variant instead of replacing
          setImageVariants(prev => {
            const existing = prev[imageIndex] || [];
            // If no variants yet, add original as first variant
            const currentImage = generatedImages[imageIndex];
            const variants = existing.length === 0 && currentImage 
              ? [{ url: currentImage.url, label: 'Оригинал', id: currentImage.id }] 
              : [...existing];
            const newLabel = `Ред. v.${variants.length}`;
            variants.push({ url: task.image_url, label: newLabel, id: task.id });
            return { ...prev, [imageIndex]: variants };
          });
          // Select the new variant
          setSelectedVariant(prev => {
            const existing = imageVariants[imageIndex] || [];
            const newIdx = existing.length === 0 ? 1 : existing.length; // +1 because we just added
            return { ...prev, [imageIndex]: newIdx };
          });
          // Update the displayed image
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
            description: sanitizeApiErrorMessage(task.last_error) || 'Редактирование не удалось',
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

  // Style generation: open dialog
  const openStyleDialog = (image: any) => {
    setStyleSourceImage(image);
    // Pre-select all card types except the current one
    const availableCards = CARD_STAGES.map((_, i) => i).filter(i => i !== image.stageIndex && i !== 6); // Exclude current + mainEdit
    setStyleSelectedCards([]);
    // Set description from jobData or empty
    const originalDesc = jobData?.description || '';
    setStyleAutoDescription(false);
    setStyleDescription('');
    setStyleDialogOpen(true);
  };

  const handleStyleCardToggle = (cardIndex: number) => {
    setStyleSelectedCards(prev => 
      prev.includes(cardIndex) 
        ? prev.filter(i => i !== cardIndex)
        : [...prev, cardIndex].sort((a, b) => a - b)
    );
  };

  const generateInStyle = async () => {
    if (!styleSourceImage || styleSelectedCards.length === 0 || !jobData) return;

    const tokensNeeded = styleSelectedCards.length * photoGenerationPrice;
    if (profile.tokens_balance < tokensNeeded) {
      toast({
        title: "Недостаточно токенов",
        description: `Нужно ${tokensNeeded} токенов, доступно ${profile.tokens_balance}`,
        variant: "destructive"
      });
      return;
    }

    setStyleGenerating(true);
    setStyleDialogOpen(false);

    try {
      // Save current images for merging after style generation completes
      preStyleImagesRef.current = [...generatedImages];
      
      // Find the source job ID (job that created the existing images)
      const sourceJobId = generatedImages[0]?.jobId || currentJobId || null;

      // Clear display state for progress bar
      setGeneratedImages([]);
      setCompletionNotificationShown(false);
      setJobCompleted(false);
      setCurrentJobId(null);
      setPreviousJobStatus(null);
      setImageVariants({});
      setSelectedVariant({});
      setIsRestoredGeneration(false);
      setGenerating(true);
      setProgress(0);
      setCurrentStage(0);
      setIsUploading(false);
      setSelectedCards(styleSelectedCards);
      setUnifiedStyling(true); // Style generation always uses unified styling for correct timer

      const createJobFunction = getImageEdgeFunctionName('create-generation-job', activeModel?.model || 'google', activeModel?.provider);
      
      const { data, error } = await supabase.functions.invoke(createJobFunction, {
        body: {
          productName: jobData.productName,
          category: jobData.category || 'товар',
          description: styleDescription,
          userId: profile.id,
          productImages: jobData.productImages.filter(img => img.type !== 'reference'),
          referenceImageUrl: null,
          selectedCards: styleSelectedCards,
          unifiedStyling: true,
          styleSourceImageUrl: styleSourceImage.url,
          sourceJobId: sourceJobId
        }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.jobId) {
        // Keep original job data (don't overwrite productName etc)
        startJobPolling(data.jobId);
        toast({
          title: "Генерация в стиле начата!",
          description: "Создаём карточки в выбранном стиле..."
        });
      } else {
        throw new Error(data.error || 'Ошибка создания задачи');
      }
    } catch (error: any) {
      console.error('Style generation error:', error);
      // Restore pre-style images on error
      if (preStyleImagesRef.current.length > 0) {
        setGeneratedImages(preStyleImagesRef.current);
        preStyleImagesRef.current = [];
      }
      toast({
        title: "Ошибка генерации",
        description: "Не удалось запустить генерацию в стиле",
        variant: "destructive"
      });
      setGenerating(false);
    } finally {
      setStyleGenerating(false);
    }
  };

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

      {/* Hero — conversion-focused */}
      <CollapsibleInfoBlock storageKey={CARDS_HERO_KEY} collapsedLabel="Подробнее о генерации карточек">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-card">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-violet-500/15 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl"
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="space-y-1.5 pr-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-violet-700 dark:text-violet-300">Карточки, которые продают</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                Поднимите конверсию карточки <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">до +260%</span> за 3 минуты
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                WBGen упаковывает товар как профессиональный дизайнер: продающая композиция, инфографика, тексты-крючки и премиальный вид — всё автоматически.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">+260% к CTR</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">больше кликов и заказов</p>
                  </div>
                </div>
              </div>

              <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">3 мин. вместо 3 дн.</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">без брифов и правок</p>
                  </div>
                </div>
              </div>

              <div className="group/stat relative rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-3 transition-colors hover:border-violet-500/30">
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">Экономия до 12 тыс. ₽</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">на каждом товаре</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </CollapsibleInfoBlock>




      {/* Cards Promo Banner */}
      <CollapsibleInfoBlock storageKey={CARDS_PROMO_KEY} mode="dismiss" collapsedLabel="Посмотреть примеры генераций">
        <div className="group relative isolate overflow-hidden rounded-2xl border border-violet-500/20 bg-card hover:border-violet-500/35 transition-colors">
          {/* Ambient drifting accents */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-violet-500/[0.10] blur-3xl"
            animate={{ x: [0, 18, 0], y: [0, 10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-fuchsia-500/[0.08] blur-3xl"
            animate={{ x: [0, -14, 0], y: [0, -8, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-shimmer"
          />

          <div className="relative z-10 p-4 sm:p-5 pr-12 sm:pr-14">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5">
              {/* Left: copy (icon hidden on mobile) */}
              <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0 lg:pr-4">
                <div className="shrink-0 hidden sm:flex w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20 items-center justify-center">
                  <Eye className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <h3 className="text-[15px] sm:text-base font-semibold leading-tight">
                      Посмотреть примеры генераций
                    </h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      <Sparkles className="w-2.5 h-2.5" />
                      Полезно
                    </span>
                  </div>
                  <p className="text-[12.5px] sm:text-sm text-muted-foreground leading-relaxed">
                    Перед пополнением баланса и генерацией — посмотрите реальные карточки пользователей и результаты, которых они достигают.
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="w-3 h-3" />
                      Рост конверсии до +260%
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                      <Clock className="w-3 h-3" />
                      30 секунд на просмотр
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[11px] font-medium text-foreground/80">
                      <ShieldCheck className="w-3 h-3" />
                      Без обязательств
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: CTAs */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto lg:min-w-[200px] lg:shrink-0">
                <Button
                  asChild
                  size="sm"
                  className="group/btn h-9 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm shadow-violet-500/20 font-medium text-xs"
                >
                  <a href="/cases" target="_blank" rel="noopener noreferrer">
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Посмотреть примеры
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
                  </a>
                </Button>
                {onNavigateToBalance && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNavigateToBalance}
                    className="h-9 rounded-lg border-violet-500/25 bg-transparent hover:bg-violet-500/[0.06] hover:border-violet-500/45 hover:text-foreground text-xs font-medium"
                  >
                    <Coins className="w-3.5 h-3.5 mr-1.5" />
                    Пополнить баланс
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleInfoBlock>


      {/* Generation Popups */}
      {onNavigateToLearning && (
        <GenerationPopups 
          userId={profile.id} 
          generationCount={generationCount} 
          onNavigateToLearning={onNavigateToLearning} 
        />
      )}

      {/* File Upload - Horizontal layout on desktop/tablet */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Product Images - Takes 3/5 width on desktop */}
        <Card className="md:col-span-3 relative overflow-hidden border-border/60 bg-card rounded-2xl">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl"
          />
          <CardHeader className="relative">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
                <Upload className="w-4 h-4 text-violet-600 dark:text-violet-300" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <span>Изображения товара</span>
                  <span className="text-[10px] uppercase tracking-wider text-violet-600/80 dark:text-violet-300/80 font-semibold">Обязательно</span>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs font-normal text-foreground/70">
                        <p>Сервис не генерирует контент с нарушением авторских прав или откровенного характера. Загружайте фото без водяных знаков.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Загрузите качественные фотографии вашего товара с разных ракурсов (максимум 3 изображения, до 3 МБ каждое)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className={`group flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-6 sm:p-8 transition-all ${generating ? 'border-muted-foreground/20 bg-muted/20 cursor-not-allowed opacity-60' : isDragOver ? 'border-violet-500 bg-violet-500/10 cursor-pointer scale-[1.01]' : 'border-violet-500/25 bg-white/40 dark:bg-white/[0.02] hover:border-violet-500/60 hover:bg-violet-500/[0.06] cursor-pointer'}`} onDragOver={generating ? undefined : handleDragOver} onDragEnter={generating ? undefined : handleDragEnter} onDragLeave={generating ? undefined : handleDragLeave} onDrop={generating ? undefined : handleDrop}>
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`flex items-center justify-center w-12 h-12 mb-3 rounded-xl transition-all ${isDragOver ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/40' : 'bg-violet-500/10 group-hover:bg-violet-500/20'}`}>
                      <Upload className={`w-5 h-5 transition-colors ${isDragOver ? 'text-white' : 'text-violet-600 dark:text-violet-300'}`} />
                    </div>
                    <p className={`text-sm font-semibold ${isDragOver ? 'text-violet-700 dark:text-violet-200' : 'text-foreground/80'}`}>
                      Загрузите изображения товара
                    </p>
                    <p className={`text-xs mt-1 ${isDragOver ? 'text-violet-600 dark:text-violet-300' : 'text-muted-foreground'}`}>
                      Перетащите или нажмите для выбора. PNG, JPG, JPEG (макс. 3)
                    </p>
                  </div>
                  <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileUpload} disabled={generating} />
                </label>
              </div>
              
              {files.length > 0 && <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => <div key={index} className="relative group w-24 h-24">
                      <img src={URL.createObjectURL(file)} alt={`Upload ${index + 1}`} className="w-full h-full aspect-square object-cover rounded-lg border" />
                      {!generating && <button onClick={() => removeFile(index)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>}
                    </div>)}
                </div>}
            </div>
          </CardContent>
        </Card>

        {/* Reference Image - Takes 2/5 width on desktop */}
        <Card className="md:col-span-2 relative overflow-hidden border-border/60 bg-card rounded-2xl">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl"
          />
          <CardHeader className="relative">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
                <Upload className="w-4 h-4 text-violet-600 dark:text-violet-300" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <span>Референс</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Необязательно</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  WBGen может взять за основу прикрепленный дизайн
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label 
                  className={`group flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-6 sm:p-8 transition-all ${generating ? 'border-muted-foreground/20 bg-muted/20 cursor-not-allowed opacity-60' : isRefDragOver ? 'border-violet-500 bg-violet-500/10 cursor-pointer scale-[1.01]' : 'border-border/60 bg-white/40 dark:bg-white/[0.02] hover:border-violet-500/50 hover:bg-violet-500/[0.05] cursor-pointer'}`}
                  onDragOver={generating ? undefined : handleRefDragOver}
                  onDragEnter={generating ? undefined : handleRefDragEnter}
                  onDragLeave={generating ? undefined : handleRefDragLeave}
                  onDrop={generating ? undefined : handleRefDrop}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`flex items-center justify-center w-12 h-12 mb-3 rounded-xl transition-all ${isRefDragOver ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/40' : 'bg-muted group-hover:bg-violet-500/15'}`}>
                      <Upload className={`w-5 h-5 transition-colors ${isRefDragOver ? 'text-white' : 'text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-300'}`} />
                    </div>
                    <p className={`text-sm font-semibold ${isRefDragOver ? 'text-violet-700 dark:text-violet-200' : 'text-foreground/80'}`}>
                      Загрузите референс
                    </p>
                    <p className={`text-xs mt-1 ${isRefDragOver ? 'text-violet-600 dark:text-violet-300' : 'text-muted-foreground'}`}>
                      1 изобр. до 3 МБ
                    </p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleReferenceUpload} disabled={generating} />
                </label>
              </div>
              
              {referenceImage && <div className="relative group w-24 h-24">
                  <img src={URL.createObjectURL(referenceImage)} alt="Референс" className="w-full h-full aspect-square object-cover rounded-lg border" />
                  {!generating && <button onClick={removeReference} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>}
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Details */}
      <Card className="relative overflow-hidden border-border/60 bg-card rounded-2xl">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl"
        />
        <CardHeader className="relative">
          {/* Mobile clear button - above title */}
          <div className="flex justify-start mb-2 sm:hidden">
            <Button variant="outline" size="sm" onClick={() => {
              setFiles([]);
              setReferenceImage(null);
              setProductName("");
              setCategory("");
              setDescription("");
              setAutoDescription(false);
              setSelectedCards([0]);
            }} className="w-auto rounded-lg border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-200 hover:border-violet-500/50 transition-colors" disabled={generating}>
              <X className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
              <Info className="w-4 h-4 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span>Информация о товаре</span>
                <span className="text-[10px] uppercase tracking-wider text-violet-600/80 dark:text-violet-300/80 font-semibold">Обязательно</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
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
            }} className="hidden sm:inline-flex shrink-0 rounded-lg h-8 px-2.5 text-xs font-normal text-muted-foreground hover:text-foreground border-transparent bg-transparent hover:bg-muted/60 transition-colors" disabled={generating}>
              <X className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Название товара</Label>
            <div className="relative">
              <Input id="productName" placeholder="Например: Спортивная куртка для зимнего бега" value={productName} onChange={e => setProductName(e.target.value.slice(0, 150))} maxLength={150} disabled={generating} className={`rounded-lg border-border/60 focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20 ${isIdentifying ? 'pr-9 sm:pr-32 identifying-input' : ''}`} />
              {isIdentifying && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-300 identifying-fade pointer-events-none">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Определяю товар</span>
                </div>
              )}
            </div>
            <div className="flex justify-end text-xs text-muted-foreground">
              <span>{productName.length}/150 символов</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание и пожелания</Label>
            <Textarea id="description" placeholder="Опишите ваши пожелания по дизайну, как бы вы это писали дизайнеру. Укажите какие нюансы или преимущества о вашем товаре нужно написать в карточке либо учесть при их создании..." value={description} onChange={e => setDescription(e.target.value.slice(0, 1200))} rows={4} maxLength={1200} disabled={generating || autoDescription} className="rounded-lg border-border/60 focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20" />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label
                htmlFor="autoDescription"
                className={`group inline-flex items-center gap-2 sm:gap-2.5 rounded-md px-2.5 sm:px-3 h-10 cursor-pointer select-none transition-colors max-w-full ${
                  autoDescription
                    ? 'bg-gradient-to-r from-violet-500/15 to-purple-500/10 text-violet-700 dark:text-violet-300'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                } ${generating ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Sparkles className={`w-3.5 h-3.5 shrink-0 transition-colors ${autoDescription ? 'text-violet-500' : ''}`} />
                <span className="text-[11px] sm:text-xs font-medium leading-none whitespace-nowrap">
                  Придумай сам
                </span>
                <Switch
                  id="autoDescription"
                  checked={autoDescription}
                  onCheckedChange={checked => {
                    setAutoDescription(!!checked);
                    if (checked) {
                      setDescription("Самостоятельно придумай и определи наилучшие параметры для достижения результата.");
                    } else {
                      setDescription("");
                    }
                  }}
                  disabled={generating}
                  className="data-[state=checked]:bg-violet-500 scale-75 sm:scale-90 -my-1 shrink-0"
                />
              </label>
              <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                {description.length}/1200
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Selection */}
      <Card className="relative overflow-hidden border-border/60 bg-card rounded-2xl">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl"
        />
        <CardHeader className="relative">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
              <Images className="w-4 h-4 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span>Выбор типа карточек</span>
                <span className="text-[10px] uppercase tracking-wider text-violet-600/80 dark:text-violet-300/80 font-semibold">Обязательно</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Выберите какие типы карточек вам нужны
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {CARD_STAGES.map((stage, index) => {
              const isSelected = selectedCards.includes(index);
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-3 sm:p-4 transition-colors ${
                    generating
                      ? 'opacity-60 cursor-not-allowed border-border'
                      : isSelected
                        ? 'border-violet-500/50 bg-violet-500/5 cursor-pointer'
                        : 'border-border/60 hover:border-violet-500/30 hover:bg-violet-500/[0.02] cursor-pointer'
                  }`}
                  onClick={generating ? undefined : () => handleCardToggle(index)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleCardToggle(index)}
                      className="mt-0.5 h-5 w-5 rounded-md border-violet-500/40 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-600 data-[state=checked]:border-violet-500 data-[state=checked]:text-white shadow-sm"
                      disabled={generating}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm sm:text-base mb-1 leading-tight transition-colors ${isSelected ? 'text-violet-700 dark:text-violet-300' : ''}`}>{stage.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{stage.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unified Styling Toggle */}
          <div
            onClick={() => {
              if (selectedCards.length < 2 || generating) return;
              const next = !unifiedStyling;
              setUnifiedStyling(next);
              setUnifiedStylingManuallyDisabled(!next);
            }}
            role="button"
            tabIndex={selectedCards.length < 2 || generating ? -1 : 0}
            className={`group relative mt-4 overflow-hidden border rounded-xl p-3 sm:p-4 transition-all select-none ${
              selectedCards.length < 2 || generating
                ? 'opacity-50 cursor-not-allowed border-border'
                : unifiedStyling
                  ? 'border-violet-500/40 bg-gradient-to-br from-violet-500/[0.12] via-purple-500/[0.06] to-transparent shadow-sm shadow-violet-500/10 cursor-pointer'
                  : 'border-border/60 bg-muted/30 hover:border-violet-500/30 hover:bg-violet-500/[0.04] cursor-pointer'
            }`}
          >
            {unifiedStyling && (
              <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-violet-500/20 blur-3xl" />
            )}
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  unifiedStyling
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/30'
                    : 'bg-muted'
                }`}>
                  <Sparkles className={`w-4 h-4 transition-colors ${unifiedStyling ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className={`font-semibold text-sm sm:text-base transition-colors ${unifiedStyling ? 'text-violet-700 dark:text-violet-300' : ''}`}>Единая стилизация</h4>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            className="text-muted-foreground hover:text-foreground transition-colors touch-manipulation inline-flex"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs font-normal text-foreground/70">
                          <p>Сервис создаст карточки в едином стиле. Генерация карточек в едином стиле занимает немного больше времени.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Пакет карточек товара будет создан в едином стиле
                  </p>
                </div>
              </div>
              <Switch
                checked={unifiedStyling}
                onCheckedChange={(checked) => {
                  setUnifiedStyling(checked);
                  setUnifiedStylingManuallyDisabled(!checked);
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={selectedCards.length < 2 || generating}
                className="shrink-0 h-6 w-11 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-600"
              />
            </div>
          </div>

          {/* Aspect Ratio (collapsible) */}
          {(() => {
            const ASPECT_RATIOS: Array<{ value: string; label: string; usage: string }> = [
              { value: '3:4', label: '3:4 вертикаль', usage: 'Wildberries, Ozon — карточка товара' },
              { value: '1:1', label: '1:1 квадрат', usage: 'Avito, Instagram, превью' },
              { value: '4:5', label: '4:5 портрет', usage: 'Instagram пост, Pinterest' },
              { value: '9:16', label: '9:16 вертикаль', usage: 'Stories, Reels, TikTok, VK Клипы' },
              { value: '16:9', label: '16:9 горизонталь', usage: 'Баннеры, обложки каналов' },
              { value: '4:3', label: '4:3 классика', usage: 'Доски объявлений, посты и прочее' },
              { value: '2:3', label: '2:3 портрет', usage: 'Постеры, Pinterest' },
              { value: '3:2', label: '3:2 альбом', usage: 'Фото, обложки' },
            ];
            const parseRatio = (v: string) => {
              const [w, h] = v.split(':').map(Number);
              return w && h ? `${w} / ${h}` : '3 / 4';
            };
            return (
              <div className={`mt-4 border border-border/60 bg-card rounded-lg transition-colors ${generating ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => !generating && setAspectRatioOpen((v) => !v)}
                  disabled={generating}
                  className="w-full flex items-center justify-between gap-3 p-3 sm:p-4 text-left"
                  aria-expanded={aspectRatioOpen}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Images className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      <h4 className="font-medium text-sm sm:text-base">Формат изображения</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Нажмите, чтобы выбрать соотношение сторон под маркетплейс или площадку
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[11px] px-2 py-0 h-5 bg-violet-500/10 text-violet-700 dark:text-violet-300 border-none">
                      {aspectRatio}
                    </Badge>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${aspectRatioOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {aspectRatioOpen && (
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {ASPECT_RATIOS.map((r) => {
                        const selected = aspectRatio === r.value;
                        return (
                          <button
                            type="button"
                            key={r.value}
                            disabled={generating}
                            onClick={() => setAspectRatio(r.value)}
                            className={`border rounded-lg p-2.5 sm:p-3 transition-colors flex items-start justify-start gap-2.5 text-left sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:text-center lg:flex-row lg:items-start lg:justify-start lg:gap-2.5 lg:text-left ${
                              selected
                                ? 'border-violet-500/50 bg-violet-500/5'
                                : 'border-border/60 hover:border-violet-500/30 hover:bg-violet-500/[0.02] bg-background'
                            } ${generating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div
                              className={`shrink-0 rounded border-2 flex items-center justify-center w-5 sm:w-6 ${
                                selected ? 'border-violet-500 bg-gradient-to-br from-violet-500 to-purple-600' : 'border-muted-foreground/40 bg-muted/30'
                              }`}
                              style={{ aspectRatio: parseRatio(r.value) }}
                            >
                              {selected && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />}
                            </div>
                            <div className="flex-1 min-w-0 text-left sm:text-center lg:text-left">
                              <p className={`text-xs sm:text-sm font-medium leading-tight ${selected ? 'text-violet-700 dark:text-violet-300' : ''}`}>{r.label}</p>
                              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug mt-0.5">
                                {r.usage}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Progress */}
      {generating && <Card className="relative overflow-hidden border-violet-500/30 bg-card rounded-2xl shadow-lg shadow-violet-500/5 animate-fade-in">
          {/* Animated radial gradient background — bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 50% at var(--glow-x, 30%) 100%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
            animation: 'glow-drift 6s ease-in-out infinite alternate',
          }} />
          {/* Animated radial gradient background — top */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 70% 45% at var(--glow-x2, 70%) 0%, hsl(280 80% 70% / 0.10) 0%, transparent 65%)',
            animation: 'glow-drift-top 8s ease-in-out infinite alternate',
          }} />
          <CardContent className="relative z-10 p-4 sm:p-6 space-y-5">
            {/* Header: Spinner + Title + Status */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-md animate-pulse" />
                <div className="relative w-11 h-11 rounded-full border-[3px] border-violet-500/15 border-t-violet-500 border-r-violet-500/70 animate-spin" />
                {isUploading 
                  ? <Upload className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-violet-600 dark:text-violet-300" />
                  : <Images className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-violet-600 dark:text-violet-300" />
                }
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                {isUploading ? (
                  <>
                    <p className="font-semibold text-sm sm:text-base">Подготовка к генерации…</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{jobStatus?.toLowerCase() || 'Загружаем изображения и рассчитываем параметры'}</p>
                  </>
                ) : estimatedTimeRemaining > 0 ? (
                  <>
                    <p className="font-semibold text-sm sm:text-base">Генерация карточек</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{currentStage} из {selectedCards.length} карточек готово</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm sm:text-base">Генерация карточек</p>
                    <p className="text-xs sm:text-sm text-violet-600 dark:text-violet-300">{WAITING_MESSAGES[waitingMessageIndex]}</p>
                  </>
                )}
              </div>
              {!isUploading && estimatedTimeRemaining > 0 && (
                <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/5 border border-violet-500/30 text-violet-700 dark:text-violet-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm font-bold tabular-nums">
                    {estimatedTimeRemaining >= 60 
                      ? `${Math.floor(estimatedTimeRemaining / 60)}:${String(estimatedTimeRemaining % 60).padStart(2, '0')}` 
                      : `0:${String(estimatedTimeRemaining).padStart(2, '0')}`}
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar — full width */}
            <div className="w-full space-y-1.5">
              <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden shadow-inner">
                {isUploading ? (
                  <div
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full shadow-sm shadow-violet-500/40"
                    style={{ animation: 'indeterminate-slide 1.6s ease-in-out infinite' }}
                  />
                ) : (
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-1000 ease-linear shadow-sm shadow-violet-500/40"
                    style={{ width: `${Math.min(smoothProgress, 95)}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>{isUploading ? 'Подготовка…' : `${currentStage} из ${selectedCards.length} карточек`}</span>
                <span className="tabular-nums">{isUploading ? '' : estimatedTimeRemaining <= 0 ? 'Финализация…' : `${Math.round(smoothProgress)}%`}</span>
              </div>
            </div>

            {/* Card stages grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedCards.map(cardIndex => {
                const stage = CARD_STAGES[cardIndex];
                const completedCount = Math.min(currentStage, selectedCards.length);
                const currentCardPosition = selectedCards.indexOf(cardIndex);
                const isCompleted = currentCardPosition < completedCount;
                const isCurrent = currentCardPosition === completedCount;
                return <div key={cardIndex} className={`flex items-center gap-2 text-xs p-2.5 rounded-lg transition-all duration-300 ${isCompleted ? 'bg-violet-500/10 border border-violet-500/30 text-violet-700 dark:text-violet-300' : isCurrent ? 'bg-violet-500/15 border border-violet-500/40 text-violet-700 dark:text-violet-200 shadow-sm shadow-violet-500/10' : 'bg-muted/40 border border-border/60 text-muted-foreground'}`}
                    style={isCurrent ? { animation: 'border-pulse 2s ease-in-out infinite' } : undefined}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : isCurrent ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" /> : <Clock className="w-3.5 h-3.5 shrink-0 opacity-40" />}
                    <span className="truncate font-medium">{stage.name}</span>
                  </div>;
              })}
            </div>

            {/* Info hint */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50">
              <AlertTriangle className="h-4 w-4 text-violet-500/70 shrink-0 mt-0.5" />
              <span className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Генерация проходит в фоновом режиме. Если результат не понравится или будут ошибки — вы сможете перегенерировать карточку за 1 токен
              </span>
            </div>
          </CardContent>
        </Card>}

      {/* Image Preview Dialog — same style as History */}
      <Dialog open={!!fullscreenImage} onOpenChange={(open) => { if (!open) setFullscreenImage(null); }}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-white/10 [&>button]:bg-white/20 [&>button]:rounded-lg [&>button]:w-7 [&>button]:h-7 [&>button]:text-white [&>button]:hover:bg-white/30">
          <DialogTitle className="sr-only">Просмотр изображения</DialogTitle>
          {fullscreenImage && (
            <img 
              src={fullscreenImage.url} 
              alt="Превью карточки" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Generated Images */}
      {generatedImages.length > 0 && <Card className="border-border/60 bg-card rounded-2xl animate-scale-in">
          <CardHeader>
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Images className="w-4 h-4 shrink-0" />
                  <span className="truncate">Готовые карточки ({generatedImages.length}/{generatedImages.length + Object.values(imageVariants).reduce((sum, variants) => sum + Math.max(0, variants.length - 1), 0)})</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Ваши сгенерированные карточки готовы к скачиванию
                </CardDescription>
              </div>
              <Button onClick={downloadAll} variant="ghost" className="shrink-0 w-full sm:w-auto rounded-md h-10 px-3 text-sm font-medium bg-muted/60 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors" size="sm" disabled={downloadingAll}>
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
          <CardContent>
            <div className="grid gap-2 sm:gap-3 w-full">
              {generatedImages.map((image, index) => {
            const cardKey = `${image.id}_${index}`;
            const isRegenerating = regeneratingCards.has(cardKey);
            const isEditingCard = editingCards.has(`edit_${image.id}_${index}`);
            const isProcessingCard = isRegenerating || isEditingCard;
            const variants = imageVariants[index] || [];
            const currentVariantIdx = selectedVariant[index] ?? (variants.length - 1);
            const displayedImageUrl = variants[currentVariantIdx]?.url || image.url;
            const isCoverCard = image.stageIndex === 0;
            return <div key={image.id} className={`group/row relative flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl bg-card w-full overflow-hidden animate-fade-in transition-colors ${isProcessingCard ? 'border-violet-500/40 bg-violet-500/[0.02]' : 'border-border/60'}`} style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}>
                    {isProcessingCard && <>
                      <div className="absolute inset-0 pointer-events-none" style={{
                        background: 'radial-gradient(ellipse 80% 50% at var(--glow-x, 30%) 100%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
                        animation: 'glow-drift 6s ease-in-out infinite alternate',
                      }} />
                      <div className="absolute inset-0 pointer-events-none" style={{
                        background: 'radial-gradient(ellipse 70% 45% at var(--glow-x2, 70%) 0%, hsl(280 80% 70% / 0.10) 0%, transparent 65%)',
                        animation: 'glow-drift-top 8s ease-in-out infinite alternate',
                      }} />
                    </>}

                    {/* Mobile header: image + title side by side */}
                    <div className="flex lg:contents items-start gap-3 w-full">
                      <div className="relative group/img shrink-0">
                        <img src={displayedImageUrl} alt={`Generated card ${index + 1}`} className="w-20 h-24 sm:w-[72px] sm:h-[88px] object-cover rounded-lg border border-border/60 cursor-pointer transition-all duration-200 group-hover/row:border-violet-500/40" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 bg-black/50 rounded-lg pointer-events-none">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute inset-0 cursor-pointer rounded-lg" onClick={() => setFullscreenImage({ ...image, url: displayedImageUrl })} />
                        {isCoverCard && (
                          <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm">
                            Главная
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">{image.stage}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
                          {CARD_STAGES[image.stageIndex]?.description}
                        </p>
                        {variants.length > 1 && (
                          <div className="mt-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 text-xs rounded-md bg-muted/40 border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground justify-between gap-2 px-2 max-w-[220px]">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img src={variants[currentVariantIdx]?.url} alt="" className="w-5 h-5 rounded-sm object-cover shrink-0" />
                                    <span className="truncate">{variants[currentVariantIdx]?.label}</span>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-muted text-muted-foreground border-none font-normal">{variants.length}</Badge>
                                  </div>
                                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] sm:w-auto min-w-[180px] p-1.5 rounded-xl" align="start">
                                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                                  {variants.map((v, vIdx) => (
                                    <button
                                      key={vIdx}
                                      onClick={() => {
                                        setSelectedVariant(prev => ({ ...prev, [index]: vIdx }));
                                        setGeneratedImages(prev => prev.map((img, i) => i === index ? { ...img, url: v.url } : img));
                                      }}
                                      className={`flex items-center gap-2.5 w-full rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-violet-500/10 group ${currentVariantIdx === vIdx ? 'bg-violet-500/10 font-medium text-violet-700 dark:text-violet-300' : ''}`}
                                    >
                                      <img src={v.url} alt={v.label} className="w-8 h-10 rounded-md object-cover shrink-0 border border-border/40" />
                                      <span className="truncate">{v.label}</span>
                                      {currentVariantIdx === vIdx && (
                                        <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0 ml-auto" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 w-full lg:w-auto shrink-0 lg:ml-auto">
                      {/* Cover card extras */}
                      {isCoverCard && onNavigateToVideo && (
                        <>
                          <Button size="sm" variant="outline" onClick={e => {
                            e.stopPropagation();
                            onNavigateToVideo(displayedImageUrl);
                          }} className="flex-1 lg:flex-initial h-8 px-2.5 rounded-md text-xs whitespace-nowrap border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 hover:text-violet-700 hover:border-violet-500/50 transition-colors" title="Сделать видеообложку">
                            <Video className="w-3.5 h-3.5" />
                            <span className="ml-1 lg:hidden">Видео</span>
                          </Button>
                          <Button size="sm" variant="outline" onClick={e => {
                            e.stopPropagation();
                            openStyleDialog(image);
                          }} disabled={!jobData || generating || styleGenerating} className="flex-1 lg:flex-initial h-8 px-2.5 rounded-md text-xs whitespace-nowrap border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 hover:text-violet-700 hover:border-violet-500/50 transition-colors" title="В таком же стиле">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="ml-1 lg:hidden">Стиль</span>
                          </Button>
                        </>
                      )}

                      {!isCoverCard && (
                        <Button size="sm" variant="outline" onClick={e => {
                          e.stopPropagation();
                          openStyleDialog(image);
                        }} disabled={!jobData || generating || styleGenerating} className="flex-1 lg:flex-initial h-8 px-2.5 rounded-md text-xs whitespace-nowrap border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 hover:text-violet-700 hover:border-violet-500/50 transition-colors" title="Создать в таком же стиле">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="ml-1 lg:hidden">Стиль</span>
                        </Button>
                      )}

                      <Button size="sm" variant="outline" onClick={e => {
                        e.stopPropagation();
                        const currentUrl = displayedImageUrl;
                        openEditDialog({ ...image, url: currentUrl }, index);
                      }} disabled={editingCards.has(`edit_${image.id}_${index}`)} className="flex-1 lg:flex-initial h-8 px-2.5 rounded-md text-xs whitespace-nowrap hover:bg-violet-500 hover:border-violet-500 hover:text-white dark:hover:text-white transition-colors" title="Редактировать карточку">
                        {editingCards.has(`edit_${image.id}_${index}`) ? <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="ml-1 lg:hidden">Ред…</span>
                        </> : <>
                          <Edit className="w-3.5 h-3.5" />
                          <span className="ml-1 lg:hidden">Редактировать</span>
                        </>}
                      </Button>

                      <Button size="sm" variant="outline" onClick={e => {
                        e.stopPropagation();
                        regenerateCard(image, index);
                      }} disabled={isRegenerating} className="flex-1 lg:flex-initial h-8 px-2.5 rounded-md text-xs whitespace-nowrap hover:bg-violet-500 hover:border-violet-500 hover:text-white dark:hover:text-white transition-colors" title="Перегенерировать карточку">
                        {isRegenerating ? <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="ml-1 lg:hidden">Перегенерация…</span>
                        </> : <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="ml-1 lg:hidden">Перегенерировать</span>
                        </>}
                      </Button>

                      <Button size="sm" onClick={async e => {
                        e.stopPropagation();
                        await downloadSingle(index);
                      }} className="flex-1 lg:flex-initial h-8 px-3 rounded-md text-xs whitespace-nowrap bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 hover:from-violet-600 hover:to-purple-700 shadow-sm shadow-violet-500/20 transition-all" title="Скачать изображение">
                        <Download className="w-3.5 h-3.5" />
                        <span className="ml-1 lg:hidden">Скачать</span>
                      </Button>
                    </div>
                  </div>;
          })}
            </div>
            <div className="mt-4 pt-4 border-t flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Перегенерация 1 изображения: <strong>{priceLoading ? '...' : photoRegenerationPrice} токена</strong>. Редактирование: <strong>{priceLoading ? '...' : photoEditPrice} токена</strong>.</span>
            </div>
          </CardContent>
        </Card>}

      {/* Generate Button */}
      <Card className="border-border/60 bg-card rounded-2xl">
        <CardContent className="pt-6 space-y-3">
          <Button
            onClick={simulateGeneration}
            disabled={!canGenerate()}
            size="lg"
            className="gap-2 w-full sm:w-auto rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none disabled:cursor-not-allowed"
          >
            {generating ? <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Генерация...
              </> : <>
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">
                  Сгенерировать {selectedCards.length} {selectedCards.length === 1 ? 'изображение' : selectedCards.length < 5 ? 'изображения' : 'изображений'}
                </span>
                <span className="sm:hidden">Сгенерировать</span>
                <Badge className="ml-1 bg-white/20 text-white border-white/30 hover:bg-white/20">
                  {priceLoading ? '...' : selectedCards.length * photoGenerationPrice} ток.
                </Badge>
              </>}
          </Button>

          <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed mt-1">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>Стоимость: <strong>{priceLoading ? '...' : selectedCards.length * photoGenerationPrice} {selectedCards.length * photoGenerationPrice === 1 ? 'токен' : selectedCards.length * photoGenerationPrice % 10 >= 2 && selectedCards.length * photoGenerationPrice % 10 <= 4 && (selectedCards.length * photoGenerationPrice % 100 < 10 || selectedCards.length * photoGenerationPrice % 100 >= 20) ? 'токена' : 'токенов'}</strong> за {selectedCards.length} {selectedCards.length === 1 ? 'изображение' : selectedCards.length < 5 ? 'изображения' : 'изображений'}. Не понравилось либо есть ошибки? Перегенерация в 5 раз дешевле!</p>
          </div>
          
          {!canGenerate() && !generating && (
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-3 py-2 animate-fade-in">
              <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/15">
                <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-amber-800 dark:text-amber-200 font-medium text-xs sm:text-[13px] leading-snug">
                {getGuardMessage()}
              </p>
            </div>
          )}
          
        </CardContent>
      </Card>
      
      {/* Edit Dialog - Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DrawerContent className="bg-card border-border/50">
            <DrawerHeader className="space-y-2 text-left">
              <DrawerTitle className="flex items-center gap-2.5 text-base">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/30 shrink-0">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                Редактировать карточку
              </DrawerTitle>
              <DrawerDescription className="text-xs text-left leading-relaxed">
                Опишите, что нужно изменить — AI внесёт правки, сохранив общий стиль карточки.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-3 px-4 pb-2">
              <div className="space-y-2">
                <Label htmlFor="edit-instructions-mobile" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Что нужно изменить?
                </Label>
                <Textarea id="edit-instructions-mobile" placeholder="Например: изменить цвет фона на синий, добавить больше света, убрать тени..." value={editInstructions} onChange={e => { if (e.target.value.length <= 1200) setEditInstructions(e.target.value); }} maxLength={1200} className="min-h-[130px] bg-background border-border/60 rounded-lg text-sm focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20 resize-none" />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Стоимость: <span className="font-semibold">{photoEditPrice} {photoEditPrice === 1 ? 'токен' : 'токена'}</span></span>
                </div>
                <span className={`text-muted-foreground tabular-nums ${editInstructions.length >= 1200 ? 'text-destructive' : ''}`}>{editInstructions.length}/1200</span>
              </div>
            </div>
            <DrawerFooter className="gap-2">
              <Button onClick={editCard} disabled={!editInstructions.trim() || editInstructions.length > 1200} className="rounded-lg gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none">
                <Sparkles className="w-4 h-4" />
                Начать редактирование
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-lg border-border/60">
                Отмена
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[520px] bg-card border-border/50 rounded-2xl p-0 overflow-hidden">
            <div className="relative px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.04]">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
                    <Edit className="w-4 h-4 text-white" />
                  </div>
                  Редактировать карточку
                </DialogTitle>
                <DialogDescription className="text-sm text-left leading-relaxed">
                  Опишите, что нужно изменить — AI внесёт правки, сохранив общий стиль карточки.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="edit-instructions" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Что нужно изменить?
                </Label>
                <Textarea id="edit-instructions" placeholder="Например: изменить цвет фона на синий, добавить больше света, убрать тени..." value={editInstructions} onChange={e => { if (e.target.value.length <= 1200) setEditInstructions(e.target.value); }} maxLength={1200} className="min-h-[130px] bg-background border-border/60 rounded-lg text-sm focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20 resize-none" />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Стоимость: <span className="font-semibold">{photoEditPrice} {photoEditPrice === 1 ? 'токен' : 'токена'}</span></span>
                </div>
                <span className={`text-muted-foreground tabular-nums ${editInstructions.length >= 1200 ? 'text-destructive' : ''}`}>{editInstructions.length}/1200</span>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-lg border-border/60">
                Отмена
              </Button>
              <Button onClick={editCard} disabled={!editInstructions.trim() || editInstructions.length > 1200} className="rounded-lg gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none">
                <Sparkles className="w-4 h-4" />
                Начать редактирование
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Style Generation Dialog */}
      {isMobile ? (
        <Drawer open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
          <DrawerContent className="bg-card border-border/50">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-violet-500/[0.08] via-purple-500/[0.04] to-transparent pointer-events-none" />
            <DrawerHeader className="space-y-2 relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Генерация по образцу</p>
                  <DrawerTitle className="text-base leading-tight">Создать в таком же стиле</DrawerTitle>
                </div>
              </div>
              <DrawerDescription className="text-xs text-left text-muted-foreground">
                WBGen создаст новые карточки в стилистике выбранного образца
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4 pb-2 max-h-[60dvh] overflow-y-auto relative">
              {/* Source image preview */}
              {styleSourceImage && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-violet-500/[0.08] to-purple-500/[0.04] border border-violet-500/20">
                  <img src={styleSourceImage.url} alt="Исходная карточка" className="w-14 h-[70px] object-cover rounded-lg border border-border/50 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-0.5">Образец стиля</p>
                    <p className="text-sm font-medium truncate">{styleSourceImage.stage}</p>
                  </div>
                </div>
              )}

              {/* Card type selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Типы карточек</Label>
                <div className="space-y-1.5">
                  {CARD_STAGES.filter((_, i) => i !== styleSourceImage?.stageIndex && i !== 6).map((stage, _) => {
                    const realIndex = CARD_STAGES.indexOf(stage);
                    const selected = styleSelectedCards.includes(realIndex);
                    return (
                      <div 
                        key={realIndex}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer active:scale-[0.99] ${
                          selected
                            ? 'border-violet-500/60 bg-violet-500/[0.08] shadow-sm shadow-violet-500/10' 
                            : 'border-border/60 hover:border-violet-500/30 hover:bg-violet-500/[0.03]'
                        }`}
                        onClick={() => handleStyleCardToggle(realIndex)}
                      >
                        <Checkbox checked={selected} className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500" />
                        <span className={`text-sm ${selected ? 'font-medium' : ''}`}>{stage.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description field */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Описание</Label>
                <Textarea 
                  placeholder="Опишите пожелания для новых карточек..."
                  value={styleDescription}
                  onChange={e => setStyleDescription(e.target.value.slice(0, 1200))}
                  maxLength={1200}
                  disabled={styleAutoDescription}
                  className="min-h-[100px] bg-background border-border/60 rounded-lg focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className={`flex items-center space-x-2 rounded-lg px-3 py-2 border transition-colors ${styleAutoDescription ? 'bg-violet-500/10 border-violet-500/30' : 'bg-muted/60 border-transparent'}`}>
                    <Checkbox 
                      id="styleAutoDescMobile"
                      checked={styleAutoDescription} 
                      className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                      onCheckedChange={(checked) => {
                        setStyleAutoDescription(!!checked);
                        if (checked) {
                          setStyleDescription("Самостоятельно придумай и определи наилучшие параметры для достижения результата.");
                        } else {
                          setStyleDescription('');
                        }
                      }}
                    />
                    <Label htmlFor="styleAutoDescMobile" className="text-sm font-normal cursor-pointer">
                      Придумай сам
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {styleDescription.length}/1200
                  </div>
                </div>
              </div>
            </div>
            <DrawerFooter className="gap-2 pt-3 border-t border-border/50 bg-muted/20">
              <Button 
                onClick={generateInStyle} 
                disabled={styleSelectedCards.length === 0 || !styleDescription.trim() || styleGenerating || !activeModel}
                className="rounded-lg gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none h-11"
              >
                {styleGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Создать {styleSelectedCards.length} {styleSelectedCards.length === 1 ? 'карточку' : styleSelectedCards.length < 5 ? 'карточки' : 'карточек'}</span>
                <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0 hover:bg-white/20">
                  {styleSelectedCards.length * photoGenerationPrice} ток.
                </Badge>
              </Button>
              <Button variant="outline" onClick={() => setStyleDialogOpen(false)} className="rounded-lg">
                Отмена
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
          <DialogContent className="sm:max-w-[540px] bg-card border-border/50 rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="relative px-6 py-5 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-purple-500/[0.05] border-b border-border/50">
              <DialogHeader className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Генерация по образцу</p>
                    <DialogTitle className="text-lg leading-tight">Создать в таком же стиле</DialogTitle>
                  </div>
                </div>
                <DialogDescription className="text-sm text-left text-muted-foreground">
                  WBGen создаст новые карточки в стилистике выбранного образца
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
              {/* Source image preview */}
              {styleSourceImage && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-violet-500/[0.08] to-purple-500/[0.04] border border-violet-500/20">
                  <img src={styleSourceImage.url} alt="Исходная карточка" className="w-14 h-[70px] object-cover rounded-lg border border-border/50 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-0.5">Образец стиля</p>
                    <p className="text-sm font-medium truncate">{styleSourceImage.stage}</p>
                  </div>
                </div>
              )}

              {/* Card type selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Типы карточек</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CARD_STAGES.filter((_, i) => i !== styleSourceImage?.stageIndex && i !== 6).map((stage, _) => {
                    const realIndex = CARD_STAGES.indexOf(stage);
                    const selected = styleSelectedCards.includes(realIndex);
                    return (
                      <div 
                        key={realIndex}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          selected
                            ? 'border-violet-500/60 bg-violet-500/[0.08] shadow-sm shadow-violet-500/10' 
                            : 'border-border/60 hover:border-violet-500/30 hover:bg-violet-500/[0.03]'
                        }`}
                        onClick={() => handleStyleCardToggle(realIndex)}
                      >
                        <Checkbox checked={selected} className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500" />
                        <span className={`text-sm leading-tight ${selected ? 'font-medium' : ''}`}>{stage.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description field */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Описание</Label>
                <Textarea 
                  placeholder="Опишите пожелания для новых карточек..."
                  value={styleDescription}
                  onChange={e => setStyleDescription(e.target.value.slice(0, 1200))}
                  maxLength={1200}
                  disabled={styleAutoDescription}
                  className="min-h-[100px] bg-background border-border/60 rounded-lg focus-visible:border-violet-500/60 focus-visible:ring-violet-500/20"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className={`flex items-center space-x-2 rounded-lg px-3 py-2 border transition-colors ${styleAutoDescription ? 'bg-violet-500/10 border-violet-500/30' : 'bg-muted/60 border-transparent'}`}>
                    <Checkbox 
                      id="styleAutoDescDesktop"
                      checked={styleAutoDescription} 
                      className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                      onCheckedChange={(checked) => {
                        setStyleAutoDescription(!!checked);
                        if (checked) {
                          setStyleDescription("Самостоятельно придумай и определи наилучшие параметры для достижения результата.");
                        } else {
                          setStyleDescription('');
                        }
                      }}
                    />
                    <Label htmlFor="styleAutoDescDesktop" className="text-sm font-normal cursor-pointer">
                      Придумай сам
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {styleDescription.length}/1200
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
              <Button variant="outline" onClick={() => setStyleDialogOpen(false)} className="rounded-lg">
                Отмена
              </Button>
              <Button 
                onClick={generateInStyle} 
                disabled={styleSelectedCards.length === 0 || !styleDescription.trim() || styleGenerating || !activeModel}
                className="rounded-lg gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 hover:shadow-violet-500/40 transition-all disabled:opacity-60 disabled:grayscale-[40%] disabled:shadow-none"
              >
                {styleGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Создать {styleSelectedCards.length} {styleSelectedCards.length === 1 ? 'карточку' : styleSelectedCards.length < 5 ? 'карточки' : 'карточек'}
                <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0 hover:bg-white/20">
                  {styleSelectedCards.length * photoGenerationPrice} ток.
                </Badge>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>;
};
