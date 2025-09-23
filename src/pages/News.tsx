import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { formatDate } from "date-fns";
import { ru } from "date-fns/locale";

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  tag: string;
  published_at: string;
  created_at: string;
}

interface NewsReadStatus {
  news_id: string;
  read_at: string;
}

const TAG_COLORS = {
  'Новости': 'bg-blue-100 text-blue-800',
  'Обновления': 'bg-green-100 text-green-800',
  'Технические работы': 'bg-orange-100 text-orange-800',
  'Исправления': 'bg-red-100 text-red-800',
  'Инструкции': 'bg-purple-100 text-purple-800',
  'Советы': 'bg-yellow-100 text-yellow-800',
  'Аналитика': 'bg-indigo-100 text-indigo-800',
  'Кейсы': 'bg-pink-100 text-pink-800'
};

const ITEMS_PER_PAGE = 10;

export default function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [readStatus, setReadStatus] = useState<NewsReadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadNews();
    loadReadStatus();
    markSectionAsVisited();
  }, [currentPage]);

  const loadNews = async () => {
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('news')
        .select('*', { count: 'exact' })
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setNews(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить новости",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReadStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('news_read_status')
        .select('news_id, read_at');

      if (error) throw error;
      setReadStatus(data || []);
    } catch (error) {
      console.error('Ошибка загрузки статуса прочтения:', error);
    }
  };

  const markSectionAsVisited = async () => {
    // Mark all current news as read when user visits the section
    try {
      for (const article of news) {
        const isRead = readStatus.some(status => status.news_id === article.id);
        if (!isRead) {
          await supabase
            .from('news_read_status')
            .insert({ 
              news_id: article.id,
              user_id: (await supabase.auth.getUser()).data.user?.id 
            })
            .select()
            .single();
        }
      }
      // Reload read status after marking
      setTimeout(loadReadStatus, 100);
    } catch (error) {
      console.error('Ошибка отметки прочтения:', error);
    }
  };

  const isArticleNew = (article: NewsArticle) => {
    return !readStatus.some(status => status.news_id === article.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Newspaper className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Новости</h1>
          </div>
          <p className="text-muted-foreground">
            Последние обновления и важная информация о сервисе
          </p>
        </div>

        <div className="space-y-6">
          {news.map((article) => (
            <Card key={article.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-semibold">{article.title}</h2>
                      {isArticleNew(article) && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          Новое
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge className={TAG_COLORS[article.tag as keyof typeof TAG_COLORS]}>
                        {article.tag}
                      </Badge>
                      <span>•</span>
                      <span>
                        {formatDate(new Date(article.published_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-foreground whitespace-pre-wrap">{article.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {news.length === 0 && (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Новостей пока нет</h3>
              <p className="text-muted-foreground">
                Здесь будут появляться последние обновления и важная информация о сервисе
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Предыдущая
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Следующая
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}