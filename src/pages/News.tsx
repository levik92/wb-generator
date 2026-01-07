import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Newspaper, Clock, ChevronLeft, ChevronRight, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
  'Новости': 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400',
  'Обновления': 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400',
  'Технические работы': 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400',
  'Исправления': 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400',
  'Инструкции': 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400',
  'Советы': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400',
  'Аналитика': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400',
  'Кейсы': 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-500/20 dark:text-pink-400',
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

  const markAllAsRead = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Получаем ВСЕ опубликованные новости из БД (не только текущую страницу)
      const { data: allNews } = await (supabase as any)
        .from('news')
        .select('id')
        .eq('is_published', true);

      if (!allNews || allNews.length === 0) return;

      // Фильтруем только непрочитанные
      const unreadNewsIds = allNews
        .map((item: any) => item.id)
        .filter((id: string) => !readNewsIds.has(id));

      if (unreadNewsIds.length === 0) {
        toast({
          title: "Готово",
          description: "Все новости уже прочитаны",
        });
        return;
      }

      // Создаем записи для всех непрочитанных новостей
      const insertData = unreadNewsIds.map((newsId: string) => ({
        news_id: newsId,
        user_id: user.data.user!.id
      }));

      const { error } = await (supabase as any)
        .from('news_read_status')
        .insert(insertData);

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }

      // Обновляем состояние - добавляем все ID в set
      setReadNewsIds(prev => new Set([...prev, ...unreadNewsIds]));

      toast({
        title: "Готово",
        description: `Все новости (${unreadNewsIds.length}) отмечены как прочитанные`,
      });
    } catch (error: any) {
      console.error('Error marking all news as read:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отметить новости как прочитанные",
        variant: "destructive",
      });
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
            <Newspaper className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Новости</h2>
            <p className="text-muted-foreground text-sm">Загрузка новостей...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
            <Newspaper className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Новости</h2>
            <p className="text-muted-foreground text-sm">Последние обновления сервиса</p>
          </div>
        </div>
        {news.length > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="icon"
            className="shrink-0 border-primary/20 hover:bg-primary/10 w-10 h-10"
            title="Прочитать все"
          >
            <CheckCheck className="w-5 h-5" />
          </Button>
        )}
      </div>

      {news.length === 0 ? (
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Newspaper className="w-5 h-5 opacity-50" />
              Новостей пока нет
            </CardTitle>
            <CardDescription className="text-muted-foreground/70">
              Здесь будут появляться обновления сервиса
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {news.map((item, index) => {
              const isRead = readNewsIds.has(item.id);
              const isNew = isNewNews(item.published_at);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-300 bg-card/80 backdrop-blur-xl hover:shadow-lg hover:shadow-primary/5 ${
                      !isRead ? 'border-primary/30 hover:border-primary/50' : 'border-border/50 hover:border-primary/20'
                    }`}
                    onClick={() => markAsRead(item.id)}
                  >
                  <CardHeader>
                    {/* Mobile: Date above tags */}
                    <div className="flex md:hidden items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Clock className="w-4 h-4" />
                      {formatDate(item.published_at)}
                    </div>
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${tagColors[item.tag] || 'bg-gray-100 text-gray-800 border-gray-200'} pointer-events-none`}>
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
                      {/* Desktop: Date on the right */}
                      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground shrink-0">
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
                </motion.div>
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
    </motion.div>
  );
};

export default News;