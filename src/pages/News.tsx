import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Newspaper, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  tag: string;
  created_at: string;
  published_at: string;
  is_new?: boolean;
}

interface Profile {
  id: string;
}

const NEWS_PER_PAGE = 10;

const tagColors: Record<string, string> = {
  'Новости': 'bg-blue-100 text-blue-800 border-blue-200',
  'Обновления': 'bg-green-100 text-green-800 border-green-200',
  'Технические работы': 'bg-orange-100 text-orange-800 border-orange-200',
  'Исправления': 'bg-red-100 text-red-800 border-red-200',
  'Инструкции': 'bg-purple-100 text-purple-800 border-purple-200',
  'Советы': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Аналитика': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Кейсы': 'bg-pink-100 text-pink-800 border-pink-200',
};

const News = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  const [expandedNewsIds, setExpandedNewsIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadNews();
    loadReadNews();
  }, [currentPage]);

  const loadNews = async () => {
    try {
      setLoading(true);
      
      // Get total count
      const { count } = await (supabase as any)
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      setTotalPages(Math.ceil((count || 0) / NEWS_PER_PAGE));

      // Get news for current page
      const { data, error } = await (supabase as any)
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range((currentPage - 1) * NEWS_PER_PAGE, currentPage * NEWS_PER_PAGE - 1);

      if (error) throw error;

      setNews(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить новости",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReadNews = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('news_read_status')
        .select('news_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setReadNewsIds(new Set(data?.map((item: any) => item.news_id) || []));
    } catch (error: any) {
      console.error('Error loading read news:', error);
    }
  };

  const markAsRead = async (newsId: string) => {
    if (readNewsIds.has(newsId)) return;

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { error } = await (supabase as any)
        .from('news_read_status')
        .insert({
          news_id: newsId,
          user_id: user.data.user.id
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }

      setReadNewsIds(prev => new Set([...prev, newsId]));
    } catch (error: any) {
      console.error('Error marking news as read:', error);
    }
  };

  const toggleExpanded = (newsId: string) => {
    setExpandedNewsIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(newsId)) {
        newSet.delete(newsId);
      } else {
        newSet.add(newsId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isNewNews = (publishedAt: string) => {
    const publishedDate = new Date(publishedAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return publishedDate > threeDaysAgo;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Новости</h2>
          <p className="text-muted-foreground">Загрузка новостей...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Новости</h2>
        <p className="text-muted-foreground">
          Последние обновления и важная информация о сервисе
        </p>
      </div>

      {news.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Newspaper className="w-5 h-5 opacity-50" />
              Новостей пока нет
            </CardTitle>
            <CardDescription className="text-muted-foreground/70">
              Здесь будут появляться последние обновления и важная информация о сервисе
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {news.map((item) => {
              const isRead = readNewsIds.has(item.id);
              const isNew = isNewNews(item.published_at);
              
              return (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all hover:shadow-md bg-muted/50 ${
                    !isRead ? 'border-wb-purple/20' : ''
                  }`}
                  onClick={() => markAsRead(item.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={tagColors[item.tag] || 'bg-gray-100 text-gray-800 border-gray-200'}>
                            {item.tag}
                          </Badge>
                          {isNew && !isRead && (
                            <Badge className="bg-wb-purple text-white">
                              Новое
                            </Badge>
                          )}
                          {!isRead && (
                            <div className="w-2 h-2 bg-wb-purple rounded-full"></div>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Clock className="w-4 h-4" />
                        {formatDate(item.published_at)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const isExpanded = expandedNewsIds.has(item.id);
                      const shouldTruncate = item.content.length > 150;
                      const displayContent = shouldTruncate && !isExpanded 
                        ? item.content.substring(0, 150) + '...'
                        : item.content;
                      
                      return (
                        <div>
                          <div 
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${
                              isExpanded ? 'max-h-none opacity-100' : shouldTruncate ? 'max-h-20 opacity-90' : 'max-h-none opacity-100'
                            }`}
                          >
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {displayContent}
                            </p>
                          </div>
                          {shouldTruncate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(item.id);
                              }}
                              className="text-wb-purple hover:text-wb-purple/80 text-sm font-medium mt-3 transition-all duration-200 hover:translate-x-1"
                            >
                              {isExpanded ? 'Свернуть' : 'Читать полностью'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default News;