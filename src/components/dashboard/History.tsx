import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Image, Calendar, Filter, ChevronLeft, ChevronRight, Loader2, Info } from "lucide-react";
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

export const History = ({ profile, shouldRefresh, onRefreshComplete }: HistoryProps & { shouldRefresh?: boolean; onRefreshComplete?: () => void }) => {
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

  // Handle external refresh requests
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
      
      // Get total count first
      let countQuery = supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);
        
      if (filter !== 'all') {
        countQuery = countQuery.eq('generation_type', filter);
      }
      
      const { count } = await countQuery;
      const totalItems = count || 0;
      const calculatedTotalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      setTotalPages(calculatedTotalPages);
      
      // Get paginated data
      let query = supabase
        .from('generations')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
        
      if (filter !== 'all') {
        query = query.eq('generation_type', filter);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setGenerations(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки истории",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadGeneration = async (generation: Generation) => {
    if (downloadingIds.has(generation.id)) return;
    
    setDownloadingIds(prev => new Set(prev).add(generation.id));
    
    try {
      const zip = new JSZip();
      // Use original product name for individual files, only replace problematic characters
      const safeProductName = (generation.input_data?.productName || 'generation').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      
      if (generation.generation_type === 'cards') {
        // Add images to ZIP
        if (generation.output_data?.images && Array.isArray(generation.output_data.images)) {
          const images = generation.output_data.images;
          
          if (images.length === 0) {
            toast({
              title: "Нет изображений",
              description: "В этой генерации нет сохраненных изображений",
              variant: "destructive",
            });
            return;
          }

          // Add each image to ZIP
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            if (image.image_url) {
              const response = await fetch(image.image_url);
              const blob = await response.blob();
              // Use original type name, only replace problematic characters for file system
              const safeStageName = (image.type || `card_${i+1}`).replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
              const fileName = `${safeProductName}_${safeStageName}.png`;
              zip.file(fileName, blob);
            }
          }
        } else {
          toast({
            title: "Ошибка скачивания",
            description: "Не удалось найти изображения для скачивания",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Add description text file to ZIP
        const description = generation.output_data?.description || 'Описание товара';
        zip.file(`${safeProductName}_description.txt`, description);
      }

      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = url;
      // Use original product name for ZIP archive
      const safeZipName = (generation.input_data?.productName || 'generation').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      link.download = `${safeZipName}_${generation.generation_type === 'cards' ? 'карточки' : 'описание'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Скачивание завершено",
        description: `ZIP-архив успешно скачан`,
      });
    } catch (error) {
      toast({
        title: "Ошибка создания архива",
        description: "Не удалось создать ZIP-архив",
        variant: "destructive",
      });
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
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', generationId)
        .eq('user_id', profile.id);

      if (error) throw error;

      // Remove from local state
      setGenerations(prev => prev.filter(gen => gen.id !== generationId));
      
      toast({
        title: "Удалено",
        description: "Генерация успешно удалена",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
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

  const filteredGenerations = generations;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">История генераций</h2>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 w-full min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-bold mb-2">История генераций</h2>
          <p className="text-muted-foreground">
            Все ваши созданные карточки и описания
          </p>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto lg:w-auto flex-shrink-0">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-full sm:w-40 lg:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="cards">Карточки</SelectItem>
              <SelectItem value="description">Описания</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Alert className="border-muted bg-muted/30 shadow-none">
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <AlertDescription className="text-sm text-muted-foreground leading-relaxed">
          Данные генераций хранятся <span className="font-medium text-foreground/80">1 месяц</span> с момента создания и затем автоматически удаляются.
        </AlertDescription>
      </Alert>

      {filteredGenerations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>История пуста</CardTitle>
            <CardDescription>
              {filter === 'all' 
                ? "История будет доступна после первых генераций"
                : `Нет ${filter === 'cards' ? 'карточек' : 'описаний'} в истории`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-3" />
              <p className="text-sm">
                {filter === 'all' 
                  ? "Начните генерацию, чтобы увидеть историю здесь"
                  : `Создайте ${filter === 'cards' ? 'карточки' : 'описания'}, чтобы увидеть их здесь`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredGenerations.map((generation) => (
            <Card key={generation.id} className="hover:shadow-md transition-shadow bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                  {/* Main content */}
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200 flex-shrink-0">
                      {generation.generation_type === 'cards' ? (
                        <Image className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                      ) : (
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      {/* Title and status */}
                      <div className="flex items-start sm:items-center gap-2 mb-2">
                        <h3 className="font-medium text-sm sm:text-base leading-tight">
                          {generation.generation_type === 'cards' ? 'Карточки товара' : 'Описание товара'}
                        </h3>
                        <Badge variant={generation.status === 'completed' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                          {generation.status === 'completed' ? 'Готово' : 'В процессе'}
                        </Badge>
                      </div>
                      
                      {/* Details */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>{formatDate(generation.created_at)}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{generation.tokens_used} токенов</span>
                          {generation.input_data?.productName && (
                            <span className="truncate">• {generation.input_data.productName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
                    <Button 
                      onClick={() => downloadGeneration(generation)}
                      size="sm"
                      disabled={downloadingIds.has(generation.id)}
                      className="bg-wb-purple hover:bg-wb-purple-dark text-white disabled:opacity-50 flex-1 sm:flex-initial min-w-0"
                    >
                      {downloadingIds.has(generation.id) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin flex-shrink-0" />
                          <span className="truncate">Создаю ZIP</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Скачать</span>
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => deleteGeneration(generation.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 flex-shrink-0 px-3"
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Назад
          </Button>
          
          <div className="flex items-center space-x-1 overflow-x-auto max-w-full">
            {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, totalPages) }, (_, i) => {
              const maxButtons = window.innerWidth < 640 ? 3 : 5;
              const pageNum = Math.max(1, Math.min(totalPages - maxButtons + 1, currentPage - Math.floor(maxButtons / 2))) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] sm:min-w-[40px] ${currentPage === pageNum ? "bg-wb-purple hover:bg-wb-purple/80" : ""}`}
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
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};