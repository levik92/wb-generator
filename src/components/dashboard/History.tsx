import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Image, Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

export const History = ({ profile }: HistoryProps) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cards' | 'description'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadHistory();
  }, [currentPage, filter]);

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

  const downloadGeneration = (generation: Generation) => {
    if (generation.generation_type === 'cards') {
      // Create mock ZIP file download
      const link = document.createElement('a');
      link.href = 'data:application/zip;base64,UEsDBAoAAAAAAKRGBjMAAAAAAAAAAAAAAAAJAAAAY2FyZHMuemlwUEsBAhQACgAAAAAAkEYGMwAAAAAAAAAAAAAAAAkAAAAIACAAAAAAAAAAQAAAAAAAAABjYXJkcy56aXBVVAkAA3qHEFl6hxBZdXgLAAEE9QEAAAQUAAAAUEsFBgAAAAABAAEANgAAADIAAAAAAA==';
      link.download = `cards_${generation.id.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Скачивание началось",
        description: "ZIP архив с карточками скачивается",
      });
    } else {
      // Create text file download
      const element = document.createElement('a');
      const file = new Blob([generation.output_data?.description || 'Описание товара'], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `description_${generation.id.slice(0, 8)}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast({
        title: "Скачивание началось", 
        description: "Текстовый файл с описанием скачивается",
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
    <div className="space-y-6 px-2 sm:px-0 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-2">История генераций</h2>
          <p className="text-sm text-muted-foreground">
            Все ваши созданные карточки и описания
          </p>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
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
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <p>
                {filter === 'all' 
                  ? "Начните генерацию, чтобы увидеть историю здесь"
                  : `Создайте ${filter === 'cards' ? 'карточки' : 'описания'}, чтобы увидеть их здесь`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredGenerations.map((generation) => (
            <Card key={generation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
                      {generation.generation_type === 'cards' ? (
                        <Image className="w-6 h-6 text-purple-600" />
                      ) : (
                        <FileText className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">
                          {generation.generation_type === 'cards' ? 'Карточки товара' : 'Описание товара'}
                        </h3>
                        <Badge variant={generation.status === 'completed' ? 'default' : 'secondary'}>
                          {generation.status === 'completed' ? 'Готово' : 'В процессе'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(generation.created_at)}</span>
                        </div>
                        <span className="hidden sm:inline">{generation.tokens_used} токенов</span>
                        {generation.input_data?.productName && (
                          <span>• {generation.input_data.productName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => downloadGeneration(generation)}
                      size="sm"
                      className="bg-wb-purple hover:bg-wb-purple-dark text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Скачать
                    </Button>
                    <Button 
                      onClick={() => deleteGeneration(generation.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500"
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
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={currentPage === pageNum ? "bg-wb-purple hover:bg-wb-purple/80" : ""}
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
          >
            Вперед
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};