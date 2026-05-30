import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Newspaper, Clock, CheckCheck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
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

const NEWS_PER_PAGE = 10;

const tagColors: Record<string, string> = {
  'Новости': 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300',
  'Обновления': 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/15 dark:text-green-300',
  'Технические работы': 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-300',
  'Исправления': 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-300',
  'Инструкции': 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/15 dark:text-violet-300',
  'Советы': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/15 dark:text-yellow-300',
  'Аналитика': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-300',
  'Кейсы': 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-500/15 dark:text-pink-300',
};

interface NewsProps {
  onMarkAllReadRef?: React.MutableRefObject<(() => void) | null>;
}

const News = ({ onMarkAllReadRef }: NewsProps = {}) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  const [expandedNewsIds, setExpandedNewsIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadNews();
    loadReadNews();
  }, [currentPage]);

  useEffect(() => {
    if (onMarkAllReadRef) onMarkAllReadRef.current = markAllAsRead;
    return () => {
      if (onMarkAllReadRef) onMarkAllReadRef.current = null;
    };
  });

  const loadNews = async () => {
    try {
      setLoading(true);
      const { count } = await (supabase as any)
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / NEWS_PER_PAGE));

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
        .insert({ news_id: newsId, user_id: user.data.user.id });
      if (error && error.code !== '23505') throw error;
      setReadNewsIds(prev => new Set([...prev, newsId]));
    } catch (error: any) {
      console.error('Error marking news as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data: allNews } = await (supabase as any)
        .from('news').select('id').eq('is_published', true);
      if (!allNews || allNews.length === 0) return;

      const unreadNewsIds = allNews
        .map((item: any) => item.id)
        .filter((id: string) => !readNewsIds.has(id));

      if (unreadNewsIds.length === 0) {
        toast({ title: "Готово", description: "Все новости уже прочитаны" });
        return;
      }

      const insertData = unreadNewsIds.map((newsId: string) => ({
        news_id: newsId, user_id: user.data.user!.id
      }));

      const { error } = await (supabase as any)
        .from('news_read_status').insert(insertData);
      if (error && error.code !== '23505') throw error;

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
      if (newSet.has(newsId)) newSet.delete(newsId);
      else newSet.add(newsId);
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isNewNews = (publishedAt: string) => {
    const publishedDate = new Date(publishedAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return publishedDate > threeDaysAgo;
  };

  const unreadCount = news.filter(n => !readNewsIds.has(n.id)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 sm:space-y-6 w-full min-w-0"
    >
      {/* Mark all as read action */}
      <div className="flex justify-end">
        <Button
          onClick={markAllAsRead}
          variant="ghost"
          size="sm"
          className="shrink-0 w-full sm:w-auto rounded-md h-10 px-3 text-sm font-medium bg-background border border-border text-foreground hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 hover:border-violet-500/30 transition-colors"
          disabled={unreadCount === 0 && totalCount > 0 && news.every(n => readNewsIds.has(n.id))}
        >
          <CheckCheck className="w-4 h-4" />
          <span className="hidden xs:inline">Прочитать все</span>
          <span className="xs:hidden">Все прочитано</span>
        </Button>
      </div>


      {news.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-card p-8">
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 flex items-center justify-center">
              <Newspaper className="w-7 h-7 text-violet-600 dark:text-violet-300" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Новостей пока нет</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Здесь будут появляться обновления, инструкции и анонсы новых возможностей сервиса.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4">
            {news.map((item, index) => {
              const isRead = readNewsIds.has(item.id);
              const isNew = isNewNews(item.published_at);
              const isExpanded = expandedNewsIds.has(item.id);
              const shouldTruncate = item.content.length > 150;
              const displayContent = shouldTruncate && !isExpanded
                ? item.content.substring(0, 150) + '...'
                : item.content;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
                >
                  <Card
                    onClick={() => markAsRead(item.id)}
                    className={`group cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden bg-card hover:shadow-lg ${
                      !isRead
                        ? 'border-violet-500/40 hover:border-violet-500/60 hover:shadow-violet-500/10'
                        : 'border-border/60 hover:border-violet-500/30 hover:shadow-violet-500/5'
                    }`}
                  >
                    {!isRead && (
                      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-purple-600" />
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={`${tagColors[item.tag] || 'bg-gray-100 text-gray-800 border-gray-200'} pointer-events-none border font-medium`}>
                              {item.tag}
                            </Badge>
                            {isNew && !isRead && (
                              <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 pointer-events-none gap-1">
                                <Sparkles className="w-3 h-3" />
                                Новое
                              </Badge>
                            )}
                            {!isRead && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                Не прочитано
                              </span>
                            )}
                          </div>
                          <CardTitle className="text-base sm:text-lg leading-tight break-words">
                            {item.title}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:shrink-0 sm:pt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="whitespace-nowrap">{formatDate(item.published_at)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                          isExpanded ? 'max-h-[2000px]' : shouldTruncate ? 'max-h-24' : 'max-h-none'
                        }`}
                      >
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {displayContent}
                        </p>
                      </div>
                      {shouldTruncate && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id); }}
                          className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 text-sm font-medium mt-3 transition-all duration-200 group/btn"
                        >
                          {isExpanded ? 'Свернуть' : 'Читать полностью'}
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 transition-transform" />
                            : <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-y-0.5" />}
                        </button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
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
