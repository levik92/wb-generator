import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Image, Calendar, Filter, ChevronLeft, ChevronRight, Loader2, Info, Trash2, History as HistoryIcon, X, ZoomIn, ChevronDown, ChevronUp, Archive, Pencil, Video, Play, Sparkles, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog as EditDialog, DialogContent as EditDialogContent, DialogHeader as EditDialogHeader, DialogTitle as EditDialogTitle, DialogDescription as EditDialogDescription, DialogFooter as EditDialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { isTelegramWebApp, telegramSafeDownload } from "@/lib/telegram";
import { useActiveAiModel, getImageEdgeFunctionName } from "@/hooks/useActiveAiModel";
import { useGenerationPrice } from "@/hooks/useGenerationPricing";
import JSZip from "jszip";
interface Generation {
  id: string;
  generation_type: string;
  input_data: any;
  output_data: any;
  tokens_used: number;
  status: string;
  created_at: string;
  updated_at: string;
}
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}
interface HistoryProps {
  profile: Profile;
  shouldRefresh?: boolean;
  onRefreshComplete?: () => void;
  onTokensUpdate?: () => void;
}
export const History = ({
  profile,
  shouldRefresh,
  onRefreshComplete,
  onTokensUpdate
}: HistoryProps) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cards' | 'description' | 'video'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInstructions, setEditInstructions] = useState("");
  const [editingImageData, setEditingImageData] = useState<{ imageUrl: string; productName: string; cardType: string; cardIndex: number; generationId?: string } | null>(null);
  const [editingInProgress, setEditingInProgress] = useState<Set<string>>(new Set());
  const { data: activeModel } = useActiveAiModel();
  const { price: editPrice } = useGenerationPrice('photo_edit');
  const { price: videoRegenPrice } = useGenerationPrice('video_regeneration');
  const [videoEditDialogOpen, setVideoEditDialogOpen] = useState(false);
  const [videoEditInstructions, setVideoEditInstructions] = useState("");
  const [videoEditingData, setVideoEditingData] = useState<{ originalJobId: string; generationId: string; productImageUrl: string } | null>(null);
  const [videoEditingInProgress, setVideoEditingInProgress] = useState<Set<string>>(new Set());
  const {
    toast
  } = useToast();
  const ITEMS_PER_PAGE = 20;
  useEffect(() => {
    loadHistory();
  }, [currentPage, filter]);
  useEffect(() => {
    if (shouldRefresh) {
      loadHistory().then(() => {
        onRefreshComplete?.();
      });
    }
  }, [shouldRefresh]);
  // Helper: cluster video jobs into generation-like objects
  const clusterVideoJobs = (videoJobs: any[]): Generation[] => {
    const clusterMap = new Map<string, any[]>();

    // First pass: group children by parent_job_id
    for (const vj of videoJobs) {
      if (vj.parent_job_id) {
        if (!clusterMap.has(vj.parent_job_id)) clusterMap.set(vj.parent_job_id, []);
        clusterMap.get(vj.parent_job_id)!.push(vj);
      }
    }

    // Second pass: place roots into their clusters or create standalone
    for (const vj of videoJobs) {
      if (!vj.parent_job_id) {
        if (clusterMap.has(vj.id)) {
          clusterMap.get(vj.id)!.unshift(vj);
        } else {
          // Backward compat: group by product_image_url
          let foundKey: string | null = null;
          if (vj.product_image_url) {
            for (const [key, jobs] of clusterMap) {
              if (jobs[0] && !jobs[0].parent_job_id && jobs[0].product_image_url === vj.product_image_url && key !== vj.id) {
                foundKey = key;
                break;
              }
            }
          }
          if (foundKey) {
            clusterMap.get(foundKey)!.push(vj);
          } else {
            clusterMap.set(vj.id, [vj]);
          }
        }
      }
    }

    const result: Generation[] = [];
    for (const [, jobs] of clusterMap) {
      jobs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const root = jobs[0];
      const totalTokens = jobs.reduce((sum: number, j: any) => sum + (j.tokens_cost || 0), 0);
      const videos = jobs.map((j: any, idx: number) => ({
        id: j.id,
        url: j.result_video_url,
        tokens_cost: j.tokens_cost,
        created_at: j.created_at,
        version_label: idx === 0 ? null : `Ред. (v. ${idx})`,
      }));

      result.push({
        id: root.id,
        generation_type: 'video',
        input_data: { productName: 'Видеообложка', source_image: root.product_image_url },
        output_data: { video_url: root.result_video_url, source_image: root.product_image_url, videos },
        tokens_used: totalTokens,
        status: 'completed',
        created_at: root.created_at,
        updated_at: jobs[jobs.length - 1].updated_at || jobs[jobs.length - 1].created_at,
      });
    }

    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return result;
  };

  const loadHistory = async () => {
    try {
      setLoading(true);

      if (filter === 'video') {
        const { data: vData, error: vError } = await (supabase as any)
          .from('video_generation_jobs')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(200);

        if (vError) throw vError;
        const clustered = clusterVideoJobs(vData || []);
        setTotalPages(Math.ceil(clustered.length / ITEMS_PER_PAGE) || 1);
        const pageItems = clustered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        setGenerations(pageItems);
      } else {
        let countQuery = supabase.from('generations').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', profile.id);
        if (filter !== 'all') {
          countQuery = countQuery.eq('generation_type', filter);
        }
        const { count } = await countQuery;
        const totalItems = count || 0;
        const calculatedTotalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        setTotalPages(calculatedTotalPages || 1);

        let query = supabase.from('generations').select('*').eq('user_id', profile.id).order('created_at', {
          ascending: false
        }).range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
        if (filter !== 'all') {
          query = query.eq('generation_type', filter);
        }
        const { data, error } = await query;
        if (error) throw error;

        let allGenerations: Generation[] = (data || []) as any;

        // For 'all' filter on page 1, also fetch recent video jobs and cluster them
        if (filter === 'all' && currentPage === 1) {
          const { data: vData } = await (supabase as any)
            .from('video_generation_jobs')
            .select('*')
            .eq('user_id', profile.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(100);

          const clusteredVideos = clusterVideoJobs(vData || []);
          allGenerations = [...(allGenerations as Generation[]), ...clusteredVideos].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }

        setGenerations(allGenerations);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки истории",
        description: "Не удалось загрузить историю генераций",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const downloadGeneration = async (generation: Generation) => {
    if (downloadingIds.has(generation.id)) return;
    setDownloadingIds(prev => new Set(prev).add(generation.id));
    try {
      const safeProductName = (generation.input_data?.productName || 'generation').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      
      if (generation.generation_type === 'cards') {
        if (generation.output_data?.images && Array.isArray(generation.output_data.images)) {
          const images = generation.output_data.images;
          if (images.length === 0) {
            toast({
              title: "Нет изображений",
              description: "В этой генерации нет сохраненных изображений",
              variant: "destructive"
            });
            return;
          }
          
          if (isTelegramWebApp()) {
            for (const image of images) {
              if (image.image_url) {
                telegramSafeDownload(image.image_url, `${safeProductName}.png`);
              }
            }
          } else if (images.length === 1) {
            // Single image — download directly
            const image = images[0];
            if (image.image_url) {
              const response = await fetch(image.image_url);
              const blob = await response.blob();
              const fileName = `${safeProductName}_${image.type || 'card'}.png`;
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
          } else {
            // Multiple images — pack into ZIP archive
            const zip = new JSZip();
            for (let i = 0; i < images.length; i++) {
              const image = images[i];
              if (image.image_url) {
                const response = await fetch(image.image_url);
                const blob = await response.blob();
                const safeStageName = (image.type || `card_${i + 1}`).replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
                zip.file(`${safeProductName}_${safeStageName}.png`, blob);
              }
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${safeProductName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        } else {
          toast({
            title: "Ошибка скачивания",
            description: "Не удалось найти изображения",
            variant: "destructive"
          });
          return;
        }
      } else if (generation.generation_type === 'video') {
        const videoUrl = generation.output_data?.video_url;
        if (videoUrl) {
          try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${safeProductName}_video.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch {
            window.open(videoUrl, '_blank');
          }
        }
      } else {
        // For descriptions, download as text file
        const description = generation.output_data?.description || 'Описание товара';
        const blob = new Blob([description], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeProductName}_description.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      const imagesCount = generation.output_data?.images?.length || 0;
      toast({
        title: "Скачивание завершено",
        description: generation.generation_type === 'cards' 
          ? `Скачано ${imagesCount} ${imagesCount === 1 ? 'изображение' : 'изображений'}` 
          : generation.generation_type === 'video'
          ? "Видео скачано"
          : "Описание скачано"
      });
    } catch (error) {
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать файлы",
        variant: "destructive"
      });
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(generation.id);
        return newSet;
      });
    }
  };

  const downloadSingleImage = async (imageUrl: string, fileName: string) => {
    if (isTelegramWebApp()) {
      telegramSafeDownload(imageUrl, fileName);
      return;
    }
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Ошибка скачивания", variant: "destructive" });
    }
  };

  const getCardTypeLabel = (type: string | undefined): string => {
    const labels: Record<string, string> = {
      cover: 'Обложка',
      features: 'Характ.',
      guarantee: 'Гарантия',
      macro: 'Макро',
      usage: 'Примен.',
      mainEdit: 'Ред. фото',
      comparison: 'Сравн.',
      lifestyle: 'Свойства',
      clean: 'Чистый фон',
      beforeAfter: 'До/После',
      bundle: 'Комплект',
    };
    return type ? labels[type] || type : '';
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setPreviewOpen(true);
  };

  const openHistoryEditDialog = (imageUrl: string, productName: string, cardType: string, cardIndex: number, generationId?: string) => {
    setEditingImageData({ imageUrl, productName, cardType, cardIndex, generationId });
    setEditInstructions("");
    setEditDialogOpen(true);
  };

  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRefs.current.forEach(interval => clearInterval(interval));
      pollingRefs.current.clear();
    };
  }, []);

  const startPollingTask = useCallback((taskId: string, generationId: string, editKey: string, tokensCost: number) => {
    let attempts = 0;
    const maxAttempts = 100; // 5 min at 3s interval

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        pollingRefs.current.delete(taskId);
        setEditingInProgress(prev => { const s = new Set(prev); s.delete(editKey); return s; });
        return;
      }

      try {
        const { data: taskData, error } = await supabase
          .from('generation_tasks')
          .select('status, image_url, card_type, card_index')
          .eq('id', taskId)
          .single();

        if (error) return;

        if (taskData?.status === 'completed' && taskData?.image_url) {
          clearInterval(interval);
          pollingRefs.current.delete(taskId);

          // Update local state: append new image to the generation
          setGenerations(prev => prev.map(gen => {
            if (gen.id !== generationId) return gen;
            const currentImages = gen.output_data?.images || [];
            const newImage = {
              index: taskData.card_index,
              type: taskData.card_type,
              image_url: taskData.image_url,
              is_edited: true
            };
            return {
              ...gen,
              output_data: {
                ...gen.output_data,
                images: [...currentImages, newImage]
              },
              tokens_used: gen.tokens_used + tokensCost
            };
          }));

          // Auto-expand if now has multiple images
          setExpandedIds(prev => {
            const next = new Set(prev);
            next.add(generationId);
            return next;
          });

          setEditingInProgress(prev => { const s = new Set(prev); s.delete(editKey); return s; });
          onTokensUpdate?.();
          toast({ title: "Редактирование завершено", description: "Результат добавлен в карточку" });
        } else if (taskData?.status === 'failed') {
          clearInterval(interval);
          pollingRefs.current.delete(taskId);
          setEditingInProgress(prev => { const s = new Set(prev); s.delete(editKey); return s; });
          toast({ title: "Ошибка редактирования", description: "Не удалось обработать изображение", variant: "destructive" });
        }
      } catch {
        // Ignore polling errors, will retry
      }
    }, 3000);

    pollingRefs.current.set(taskId, interval);
  }, [onTokensUpdate, toast]);

  const editHistoryCard = async () => {
    if (!editingImageData || !editInstructions.trim()) return;
    const editKey = editingImageData.imageUrl;
    const generationId = editingImageData.generationId;
    setEditingInProgress(prev => new Set(prev).add(editKey));
    setEditDialogOpen(false);
    try {
      const model = activeModel || 'openai';
      const editFunction = getImageEdgeFunctionName('edit-card', model);
      const { data, error } = await supabase.functions.invoke(editFunction, {
        body: {
          productName: editingImageData.productName,
          userId: profile.id,
          cardIndex: editingImageData.cardIndex,
          cardType: editingImageData.cardType,
          sourceImageUrl: editingImageData.imageUrl,
          editInstructions: editInstructions,
          sourceGenerationId: generationId || undefined
        }
      });
      if (error) throw error;
      if (data?.success) {
        if (generationId && data.taskId) {
          // Start polling for result — will update state reactively
          const tokensCost = data.tokensUsed || 2;
          startPollingTask(data.taskId, generationId, editKey, tokensCost);
          onTokensUpdate?.();
        } else {
          toast({ title: "Редактирование запущено", description: "Обновите страницу, чтобы увидеть результат" });
          onTokensUpdate?.();
          setEditingInProgress(prev => { const s = new Set(prev); s.delete(editKey); return s; });
        }
      } else {
        throw new Error(data?.error || 'Ошибка');
      }
    } catch (error: any) {
      toast({ title: "Ошибка редактирования", description: "Не удалось отредактировать изображение", variant: "destructive" });
      setEditingInProgress(prev => { const s = new Set(prev); s.delete(editKey); return s; });
    }
  };


  const openVideoEditDialog = (originalJobId: string, generationId: string, productImageUrl: string) => {
    setVideoEditingData({ originalJobId, generationId, productImageUrl });
    setVideoEditInstructions("");
    setVideoEditDialogOpen(true);
  };

  const startVideoEditPolling = useCallback((jobId: string, generationId: string) => {
    let attempts = 0;
    const maxAttempts = 48; // 8 min at 10s

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        pollingRefs.current.delete(jobId);
        setVideoEditingInProgress(prev => { const s = new Set(prev); s.delete(generationId); return s; });
        toast({ title: "Таймаут", description: "Генерация видео заняла слишком много времени", variant: "destructive" });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('check-video-status', {
          body: { job_id: jobId }
        });
        if (error) return;

        if (data?.status === 'completed' && data?.video_url) {
          clearInterval(interval);
          pollingRefs.current.delete(jobId);

          setGenerations(prev => prev.map(gen => {
            if (gen.id !== generationId) return gen;
            const currentVideos = gen.output_data?.videos || [];
            const newVideo = {
              id: jobId,
              url: data.video_url,
              tokens_cost: videoRegenPrice || 2,
              created_at: new Date().toISOString(),
              version_label: `Ред. (v. ${currentVideos.length})`,
            };
            return {
              ...gen,
              output_data: { ...gen.output_data, videos: [...currentVideos, newVideo] },
              tokens_used: gen.tokens_used + (videoRegenPrice || 2),
            };
          }));

          setExpandedIds(prev => { const next = new Set(prev); next.add(generationId); return next; });
          setVideoEditingInProgress(prev => { const s = new Set(prev); s.delete(generationId); return s; });
          onTokensUpdate?.();
          toast({ title: "Редактирование завершено", description: "Новая версия видео добавлена" });
        } else if (data?.status === 'failed') {
          clearInterval(interval);
          pollingRefs.current.delete(jobId);
          setVideoEditingInProgress(prev => { const s = new Set(prev); s.delete(generationId); return s; });
          toast({ title: "Ошибка", description: data?.refunded ? "Генерация видео не удалась. Токены возвращены." : "Не удалось создать видео", variant: "destructive" });
        }
      } catch {
        // Ignore polling errors
      }
    }, 10000);

    pollingRefs.current.set(jobId, interval);
  }, [onTokensUpdate, toast, videoRegenPrice]);

  const editVideoCard = async () => {
    if (!videoEditingData || !videoEditInstructions.trim()) return;
    const { originalJobId, generationId } = videoEditingData;
    setVideoEditingInProgress(prev => new Set(prev).add(generationId));
    setVideoEditDialogOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke('regenerate-video-job', {
        body: { original_job_id: originalJobId, user_prompt: videoEditInstructions.trim() }
      });
      if (error) throw error;
      if (data?.job_id) {
        startVideoEditPolling(data.job_id, generationId);
        onTokensUpdate?.();
      } else {
        throw new Error(data?.error || 'Ошибка');
      }
    } catch (error: any) {
      toast({ title: "Ошибка", description: "Не удалось перегенерировать видео. Попробуйте позже", variant: "destructive" });
      setVideoEditingInProgress(prev => { const s = new Set(prev); s.delete(generationId); return s; });
    }
  };

  const deleteVideoGeneration = async (generation: Generation) => {
    try {
      const videoIds = (generation.output_data?.videos || []).map((v: any) => v.id).filter(Boolean);
      if (videoIds.length > 1) {
        const childIds = videoIds.slice(1);
        await (supabase as any).from('video_generation_jobs').delete().in('id', childIds).eq('user_id', profile.id);
      }
      const { error } = await (supabase as any)
        .from('video_generation_jobs')
        .delete()
        .eq('id', generation.id)
        .eq('user_id', profile.id);
      if (error) throw error;
      setGenerations(prev => prev.filter(gen => gen.id !== generation.id));
      toast({ title: "Удалено", description: "Видео успешно удалено" });
    } catch (error: any) {
      toast({ title: "Ошибка удаления", description: "Не удалось удалить видео", variant: "destructive" });
    }
  };

  const deleteGeneration = async (generationId: string) => {
    try {
      const {
        error
      } = await supabase.from('generations').delete().eq('id', generationId).eq('user_id', profile.id);
      if (error) throw error;
      setGenerations(prev => prev.filter(gen => gen.id !== generationId));
      toast({
        title: "Удалено",
        description: "Генерация успешно удалена"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить генерацию",
        variant: "destructive"
      });
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  if (loading) {
    return <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">История генераций</h2>
            <p className="text-muted-foreground text-sm">Загрузка...</p>
          </div>
        </div>
      </div>;
  }
  return <div className="space-y-6 w-full min-w-0">
      {/* Image Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-white/10 [&>button.absolute]:bg-white/20 [&>button.absolute]:text-white [&>button.absolute]:hover:bg-white/30">
          <DialogTitle className="sr-only">Просмотр изображения</DialogTitle>
          <div className="relative">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Превью карточки" 
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={videoPreviewOpen} onOpenChange={setVideoPreviewOpen}>
        <DialogContent className="max-w-lg p-0 bg-black/90 border-white/10 [&>button.absolute]:bg-white/20 [&>button.absolute]:text-white [&>button.absolute]:hover:bg-white/30">
          <DialogTitle className="sr-only">Просмотр видео</DialogTitle>
          <div className="relative">
            {videoPreviewUrl && (
              <video src={videoPreviewUrl} controls autoPlay muted loop className="w-full rounded-t-lg" style={{ aspectRatio: "3/4" }} />
            )}
            {videoPreviewUrl && (
              <div className="p-3">
                <Button className="w-full gap-2" onClick={async () => {
                  try {
                    const response = await fetch(videoPreviewUrl);
                    const blob = await response.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `video-cover-${Date.now()}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                  } catch {
                    window.open(videoPreviewUrl, '_blank');
                  }
                }}>
                  <Download className="h-4 w-4" />
                  Скачать видео
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <EditDialogContent className="sm:max-w-[500px] bg-card border-border/50 rounded-lg">
          <EditDialogHeader className="space-y-2">
            <EditDialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Edit className="w-4 h-4 text-primary" />
              </div>
              Редактировать карточку
            </EditDialogTitle>
            <EditDialogDescription className="text-sm text-left">
              Опишите, что нужно изменить в изображении. AI внесёт изменения, сохраняя общий стиль карточки.
            </EditDialogDescription>
          </EditDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="history-edit-instructions" className="font-semibold">
                Что нужно изменить?
              </Label>
              <Textarea
                id="history-edit-instructions"
                placeholder="Например: изменить цвет фона на синий, добавить больше света, убрать тени..."
                value={editInstructions}
                onChange={e => { if (e.target.value.length <= 1200) setEditInstructions(e.target.value); }}
                maxLength={1200}
                className="min-h-[120px] bg-background/50 border-border/50 rounded-lg focus:border-primary/50"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 w-fit">
                <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>Стоимость: <span className="font-semibold">{editPrice} {editPrice === 1 ? 'токен' : 'токена'}</span></span>
              </div>
              <span className={editInstructions.length >= 1200 ? 'text-destructive' : ''}>{editInstructions.length}/1200</span>
            </div>
          </div>
          <EditDialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-lg">
              Отмена
            </Button>
            <Button onClick={editHistoryCard} disabled={!editInstructions.trim() || editInstructions.length > 1200} className="rounded-lg gap-2">
              <Sparkles className="w-4 h-4" />
              Начать редактирование
            </Button>
          </EditDialogFooter>
        </EditDialogContent>
      </EditDialog>

      {/* Video Edit Dialog */}
      <EditDialog open={videoEditDialogOpen} onOpenChange={setVideoEditDialogOpen}>
        <EditDialogContent className="sm:max-w-[500px] bg-card border-border/50 rounded-lg">
          <EditDialogHeader className="space-y-2">
            <EditDialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Video className="w-4 h-4 text-primary" />
              </div>
              Редактировать видеообложку
            </EditDialogTitle>
            <EditDialogDescription className="text-sm text-left">
              Опишите, какие изменения нужны. AI перегенерирует видео с новым промтом.
            </EditDialogDescription>
          </EditDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="video-edit-instructions" className="font-semibold">
                Что нужно изменить?
              </Label>
              <Textarea
                id="video-edit-instructions"
                placeholder="Например: добавить плавное вращение товара, изменить освещение..."
                value={videoEditInstructions}
                onChange={e => { if (e.target.value.length <= 300) setVideoEditInstructions(e.target.value); }}
                maxLength={300}
                className="min-h-[120px] bg-background/50 border-border/50 rounded-lg focus:border-primary/50"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 w-fit">
                <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>Стоимость: <span className="font-semibold">{videoRegenPrice || 2} {(videoRegenPrice || 2) === 1 ? 'токен' : 'токена'}</span></span>
              </div>
              <span className={videoEditInstructions.length >= 300 ? 'text-destructive' : ''}>{videoEditInstructions.length}/300</span>
            </div>
          </div>
          <EditDialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setVideoEditDialogOpen(false)} className="rounded-lg">
              Отмена
            </Button>
            <Button onClick={editVideoCard} disabled={!videoEditInstructions.trim() || videoEditInstructions.length > 300} className="rounded-lg gap-2">
              <Sparkles className="w-4 h-4" />
              Начать редактирование
            </Button>
          </EditDialogFooter>
        </EditDialogContent>
      </EditDialog>

      {/* Header */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5
    }} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">История генераций</h2>
            <p className="text-muted-foreground text-sm">Все ваши созданные карточки и описания</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-full sm:w-48 bg-background border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все генерации</SelectItem>
              <SelectItem value="cards">Карточки</SelectItem>
              <SelectItem value="description">Описания</SelectItem>
              <SelectItem value="video">Видеообложки</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Info Alert */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5,
      delay: 0.1
    }}>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm leading-relaxed text-muted-foreground">
              Данные хранятся <span className="font-semibold">1 месяц</span> и затем автоматически удаляются.
            </span>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {generations.length === 0 ? <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      duration: 0.5,
      delay: 0.2
    }} className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">История пуста</h3>
            <p className="text-muted-foreground">
              {filter === 'all' ? "Начните генерацию, чтобы увидеть историю здесь" : `Нет ${filter === 'cards' ? 'карточек' : 'описаний'} в истории`}
            </p>
          </div>
        </motion.div> : <div className="grid gap-4">
          {generations.map((generation, index) => {
            const isCardEditing = generation.generation_type === 'cards' && generation.output_data?.images?.some((img: any) => editingInProgress.has(img.image_url));
            const isVideoEditing = generation.generation_type === 'video' && videoEditingInProgress.has(generation.id);
            const isEditing = isCardEditing || isVideoEditing;
            return <motion.div key={generation.id} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.4,
        delay: 0.1 + index * 0.05
      }} className="group rounded-2xl border backdrop-blur-sm p-4 sm:p-6 transition-all relative overflow-hidden border-border/50 hover:border-primary/30 bg-card"
      >
              {isEditing && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    background: 'radial-gradient(ellipse 80% 50% at var(--glow-x, 30%) 100%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
                    animation: 'glow-drift 6s ease-in-out infinite alternate',
                  }} />
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    background: 'radial-gradient(ellipse 70% 45% at var(--glow-x2, 70%) 0%, hsl(280 80% 70% / 0.10) 0%, transparent 65%)',
                    animation: 'glow-drift-top 8s ease-in-out infinite alternate',
                  }} />
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-primary/90 text-primary-foreground px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Редактирование...</span>
                  </div>
                </>
              )}
              <div className={`flex flex-col gap-3 min-w-0 overflow-hidden ${isEditing ? 'relative z-[1]' : ''}`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 min-w-0">
                  {/* Content */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {generation.generation_type === 'video' ? <div 
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0 overflow-hidden border-2 border-border/50 group-hover:border-primary/30 transition-colors cursor-pointer relative group/preview"
                        onClick={() => {
                          if (generation.output_data?.video_url) {
                            setVideoPreviewUrl(generation.output_data.video_url);
                            setVideoPreviewOpen(true);
                          }
                        }}
                      >
                        {generation.output_data?.source_image ? (
                          <img src={generation.output_data.source_image} alt="Превью" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <Video className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                      </div> : generation.generation_type === 'cards' && generation.output_data?.images?.[0]?.image_url ? <div 
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0 overflow-hidden border-2 border-border/50 group-hover:border-primary/30 transition-colors cursor-pointer relative group/preview"
                        onClick={() => openImagePreview(generation.output_data.images[0].image_url)}
                      >
                        <img src={generation.output_data.images[0].image_url} alt="Превью" className="w-full h-full object-cover" onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }} />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </div> : <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center bg-primary/10 flex-shrink-0">
                        {generation.generation_type === 'cards' ? <Image className="w-6 h-6 text-primary" /> : <FileText className="w-6 h-6 text-primary" />}
                      </div>}
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">
                          {generation.generation_type === 'cards' ? 'Карточки товара' : generation.generation_type === 'video' ? 'Видеообложка' : 'Описание товара'}
                        </h3>
                        <Badge variant={generation.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {generation.status === 'completed' ? 'Готово' : 'В процессе'}
                        </Badge>
                        {generation.generation_type === 'cards' && (generation.output_data?.images?.length || 0) > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {generation.output_data.images.length} изобр.
                          </Badge>
                        )}
                        {generation.generation_type === 'video' && (generation.output_data?.videos?.length || 0) > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {generation.output_data.videos.length} видео
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(generation.created_at)}
                        </span>
                        <span>{generation.tokens_used} токенов</span>
                        {generation.input_data?.productName && <span className="truncate max-w-[200px]">• {generation.input_data.productName}</span>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {generation.generation_type === 'cards' && (generation.output_data?.images?.length || 0) > 1 && (
                      <Button 
                        onClick={() => toggleExpanded(generation.id)} 
                        size="sm" 
                        variant="outline"
                      >
                        {expandedIds.has(generation.id) ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        {expandedIds.has(generation.id) ? 'Свернуть' : 'Все фото'}
                      </Button>
                    )}
                    {generation.generation_type === 'cards' && (generation.output_data?.images?.length || 0) === 1 && generation.output_data?.images?.[0]?.image_url && (
                      <Button 
                        onClick={() => {
                          const img = generation.output_data.images[0];
                          openHistoryEditDialog(
                            img.image_url,
                            generation.input_data?.productName || 'Товар',
                            img.type || 'card_0',
                            0,
                            generation.id
                          );
                        }}
                        size="sm" 
                        variant="outline"
                        disabled={editingInProgress.has(generation.output_data.images[0].image_url)}
                        title={`Редактировать (${editPrice} токенов)`}
                      >
                        {editingInProgress.has(generation.output_data.images[0].image_url) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4 sm:mr-1" />}
                        <span className="hidden sm:inline">Ред.</span>
                      </Button>
                    )}
                    {generation.generation_type === 'video' && (generation.output_data?.videos?.length || 0) > 1 && (
                      <Button 
                        onClick={() => toggleExpanded(generation.id)} 
                        size="sm" 
                        variant="outline"
                      >
                        {expandedIds.has(generation.id) ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        {expandedIds.has(generation.id) ? 'Свернуть' : 'Все видео'}
                      </Button>
                    )}
                    {generation.generation_type === 'video' && (
                      <Button 
                        onClick={() => openVideoEditDialog(generation.id, generation.id, generation.output_data?.source_image)}
                        size="sm" 
                        variant="outline"
                        disabled={videoEditingInProgress.has(generation.id)}
                        title={`Редактировать (${videoRegenPrice || 2} токенов)`}
                      >
                        {videoEditingInProgress.has(generation.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4 sm:mr-1" />}
                        <span className="hidden sm:inline">Ред.</span>
                      </Button>
                    )}
                    <Button onClick={() => downloadGeneration(generation)} size="sm" disabled={downloadingIds.has(generation.id)} className="bg-primary hover:bg-primary/90">
                      {downloadingIds.has(generation.id) ? <>
                          <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                        </> : generation.generation_type === 'video' ? <>
                          <Download className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Скачать</span>
                          <span className="sm:hidden">MP4</span>
                        </> : (generation.output_data?.images?.length || 0) > 1 ? <>
                          <Archive className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Скачать ZIP ({generation.output_data.images.length})</span>
                          <span className="sm:hidden">ZIP ({generation.output_data.images.length})</span>
                        </> : <>
                          <Download className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Скачать</span>
                          <span className="sm:hidden">PNG</span>
                        </>}
                    </Button>
                    <Button onClick={() => generation.generation_type === 'video' ? deleteVideoGeneration(generation) : deleteGeneration(generation.id)} size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded images grid */}
                {expandedIds.has(generation.id) && generation.output_data?.images?.length > 1 && (
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 pt-3 border-t border-border/30">
                    {generation.output_data.images.map((img: any, imgIndex: number) => (
                      <div key={imgIndex} className="relative group/img rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/40 transition-colors aspect-[3/4]">
                        <img 
                          src={img.image_url} 
                          alt={`Карточка ${imgIndex + 1}`} 
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => openImagePreview(img.image_url)}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={(e) => { e.stopPropagation(); openImagePreview(img.image_url); }}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-white hover:bg-white/20"
                            disabled={editingInProgress.has(img.image_url)}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openHistoryEditDialog(
                                img.image_url, 
                                generation.input_data?.productName || 'Товар', 
                                img.type || `card_${imgIndex}`, 
                                imgIndex,
                                generation.id
                              );
                            }}
                          >
                            {editingInProgress.has(img.image_url) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const name = (generation.input_data?.productName || 'card').replace(/[<>:"/\\|?*]/g, '').trim();
                              downloadSingleImage(img.image_url, `${name}_${img.type || imgIndex + 1}.png`); 
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        {img.is_edited && (
                          <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-lg font-medium">
                            {(() => {
                              const editedImages = generation.output_data.images.filter((i: any) => i.is_edited);
                              const editIndex = editedImages.indexOf(img);
                              return `Ред. (v. ${editIndex + 1})`;
                            })()}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-xs px-2 py-2 pt-5 text-center truncate">
                          {getCardTypeLabel(img.type) || `Карточка ${imgIndex + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded videos grid */}
                {expandedIds.has(generation.id) && generation.generation_type === 'video' && (generation.output_data?.videos?.length || 0) > 1 && (
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-border/30">
                    {generation.output_data.videos.map((video: any, vidIndex: number) => (
                      <div key={video.id || vidIndex} className="relative group/vid rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/40 transition-colors aspect-[3/4]">
                        {generation.output_data?.source_image ? (
                          <img src={generation.output_data.source_image} alt={`Видео ${vidIndex + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <Video className="w-8 h-8 text-primary" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={() => { if (video.url) { setVideoPreviewUrl(video.url); setVideoPreviewOpen(true); } }}>
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20"
                            disabled={videoEditingInProgress.has(generation.id)}
                            onClick={(e) => { e.stopPropagation(); openVideoEditDialog(video.id || generation.id, generation.id, generation.output_data?.source_image); }}>
                            {videoEditingInProgress.has(generation.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              if (video.url) {
                                try {
                                  const response = await fetch(video.url);
                                  const blob = await response.blob();
                                  const a = document.createElement('a');
                                  a.href = URL.createObjectURL(blob);
                                  a.download = `video-cover-${vidIndex + 1}.mp4`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(a.href);
                                } catch {
                                  window.open(video.url, '_blank');
                                }
                              }
                            }}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        {video.version_label && (
                          <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-lg font-medium">
                            {video.version_label}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-xs px-2 py-2 pt-5 text-center">
                          {video.version_label || 'Оригинал'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>;
          })}
        </div>}

      {/* Pagination */}
      {totalPages > 1 && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      duration: 0.5,
      delay: 0.3
    }} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-full sm:w-auto">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({
          length: Math.min(5, totalPages)
        }, (_, i) => {
          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
          if (pageNum > totalPages) return null;
          return <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className={`min-w-[40px] ${currentPage === pageNum ? "bg-primary" : ""}`}>
                  {pageNum}
                </Button>;
        })}
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-full sm:w-auto">
            Вперед
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>}
    </div>;
};