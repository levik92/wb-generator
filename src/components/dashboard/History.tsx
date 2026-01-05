import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Image, Calendar, Filter, ChevronLeft, ChevronRight, Loader2, Info, Trash2, History as HistoryIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JSZip from 'jszip';

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
}

export const History = ({ profile, shouldRefresh, onRefreshComplete }: HistoryProps) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cards' | 'description'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
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

  const loadHistory = async () => {
    try {
      setLoading(true);

      let countQuery = supabase.from('generations').select('*', { count: 'exact', head: true }).eq('user_id', profile.id);
      if (filter !== 'all') {
        countQuery = countQuery.eq('generation_type', filter);
      }
      const { count } = await countQuery;
      const totalItems = count || 0;
      const calculatedTotalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      setTotalPages(calculatedTotalPages);

      let query = supabase.from('generations').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      if (filter !== 'all') {
        query = query.eq('generation_type', filter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setGenerations(data || []);
    } catch (error: any) {
      toast({ title: "Ошибка загрузки истории", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadGeneration = async (generation: Generation) => {
    if (downloadingIds.has(generation.id)) return;
    setDownloadingIds(prev => new Set(prev).add(generation.id));
    try {
      const zip = new JSZip();
      const safeProductName = (generation.input_data?.productName || 'generation').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      
      if (generation.generation_type === 'cards') {
        if (generation.output_data?.images && Array.isArray(generation.output_data.images)) {
          const images = generation.output_data.images;
          if (images.length === 0) {
            toast({ title: "Нет изображений", description: "В этой генерации нет сохраненных изображений", variant: "destructive" });
            return;
          }

          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            if (image.image_url) {
              const response = await fetch(image.image_url);
              const blob = await response.blob();
              const safeStageName = (image.type || `card_${i + 1}`).replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
              const fileName = `${safeProductName}_${safeStageName}.png`;
              zip.file(fileName, blob);
            }
          }
        } else {
          toast({ title: "Ошибка скачивания", description: "Не удалось найти изображения", variant: "destructive" });
          return;
        }
      } else {
        const description = generation.output_data?.description || 'Описание товара';
        zip.file(`${safeProductName}_description.txt`, description);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const safeZipName = (generation.input_data?.productName || 'generation').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      link.download = `${safeZipName}_${generation.generation_type === 'cards' ? 'карточки' : 'описание'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Скачивание завершено", description: "ZIP-архив успешно скачан" });
    } catch (error) {
      toast({ title: "Ошибка создания архива", description: "Не удалось создать ZIP-архив", variant: "destructive" });
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(generation.id);
        return newSet;
      });
    }
  };

  const deleteGeneration = async (generationId: string) => {
    try {
      const { error } = await supabase.from('generations').delete().eq('id', generationId).eq('user_id', profile.id);
      if (error) throw error;
      setGenerations(prev => prev.filter(gen => gen.id !== generationId));
      toast({ title: "Удалено", description: "Генерация успешно удалена" });
    } catch (error: any) {
      toast({ title: "Ошибка удаления", description: error.message, variant: "destructive" });
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
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">История генераций</h2>
            <p className="text-muted-foreground text-sm">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
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
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Info Alert */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription>
            Данные хранятся <span className="font-semibold">1 месяц</span> и затем автоматически удаляются.
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Content */}
      {generations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8"
        >
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">История пуста</h3>
            <p className="text-muted-foreground">
              {filter === 'all' ? "Начните генерацию, чтобы увидеть историю здесь" : `Нет ${filter === 'cards' ? 'карточек' : 'описаний'} в истории`}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {generations.map((generation, index) => (
            <motion.div
              key={generation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              className="group rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 sm:p-6 hover:border-primary/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Content */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {generation.generation_type === 'cards' && generation.output_data?.images?.[0]?.image_url ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0 overflow-hidden ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
                      <img 
                        src={generation.output_data.images[0].image_url} 
                        alt="Превью" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center bg-primary/10 flex-shrink-0">
                      {generation.generation_type === 'cards' ? (
                        <Image className="w-6 h-6 text-primary" />
                      ) : (
                        <FileText className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold">
                        {generation.generation_type === 'cards' ? 'Карточки товара' : 'Описание товара'}
                      </h3>
                      <Badge variant={generation.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {generation.status === 'completed' ? 'Готово' : 'В процессе'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(generation.created_at)}
                      </span>
                      <span>{generation.tokens_used} токенов</span>
                      {generation.input_data?.productName && (
                        <span className="truncate max-w-[200px]">• {generation.input_data.productName}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    onClick={() => downloadGeneration(generation)} 
                    size="sm" 
                    disabled={downloadingIds.has(generation.id)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {downloadingIds.has(generation.id) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ZIP
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Скачать
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => deleteGeneration(generation.id)} 
                    size="sm" 
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6"
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
            disabled={currentPage === 1}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              return (
                <Button 
                  key={pageNum} 
                  variant={currentPage === pageNum ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[40px] ${currentPage === pageNum ? "bg-primary" : ""}`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto"
          >
            Вперед
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};
