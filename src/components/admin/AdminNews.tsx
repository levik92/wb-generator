import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Plus, Edit, Trash2, Send, Clock, Eye, EyeOff, Loader2, Newspaper, FileText, Tag as TagIcon, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  tag: string;
  is_published: boolean;
  created_at: string;
  published_at: string | null;
}

const availableTags = [
  'Новости',
  'Обновления', 
  'Технические работы',
  'Исправления',
  'Инструкции',
  'Советы',
  'Аналитика',
  'Кейсы'
];

const tagColors: Record<string, string> = {
  'Новости': 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  'Обновления': 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  'Технические работы': 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  'Исправления': 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  'Инструкции': 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  'Советы': 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
  'Аналитика': 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  'Кейсы': 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
};

export const AdminNews = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tag: 'Новости'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    if (formData.content.length > 1500) {
      toast({
        title: "Ошибка",
        description: "Содержание не должно превышать 1500 символов",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingNews) {
        const { error } = await (supabase as any)
          .from('news')
          .update({
            title: formData.title.trim(),
            content: formData.content.trim(),
            tag: formData.tag
          })
          .eq('id', editingNews.id);

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "Новость обновлена",
        });
      } else {
        const { error } = await (supabase as any)
          .from('news')
          .insert({
            title: formData.title.trim(),
            content: formData.content.trim(),
            tag: formData.tag,
            is_published: false
          });

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "Новость создана (черновик)",
        });
      }

      setFormData({ title: '', content: '', tag: 'Новости' });
      setEditingNews(null);
      setIsDialogOpen(false);
      loadNews();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить новость",
        variant: "destructive",
      });
    }
  };

  const sendToTelegram = async (newsItem: NewsItem) => {
    try {
      const response = await supabase.functions.invoke('telegram-bot', {
        body: {
          action: 'send_news',
          news: {
            title: newsItem.title,
            content: newsItem.content,
            tag: newsItem.tag
          }
        }
      });

      if (response.error) throw response.error;
      return true;
    } catch (error) {
      console.error('Error sending to Telegram:', error);
      return false;
    }
  };

  const publishNews = async (newsId: string, isPublished: boolean) => {
    if (publishingIds.has(newsId)) return;
    setPublishingIds(prev => new Set(prev).add(newsId));
    try {
      const { error } = await (supabase as any)
        .from('news')
        .update({ 
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null
        })
        .eq('id', newsId);

      if (error) throw error;

      if (isPublished) {
        const newsItem = news.find(n => n.id === newsId);
        if (newsItem) {
          const telegramSent = await sendToTelegram(newsItem);
          toast({
            title: "Успешно",
            description: telegramSent 
              ? "Новость опубликована и отправлена в Telegram" 
              : "Новость опубликована (отправка в Telegram не удалась)",
          });
        }
      } else {
        toast({
          title: "Успешно",
          description: "Новость снята с публикации",
        });
      }

      loadNews();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось опубликовать новость",
        variant: "destructive",
      });
    } finally {
      setPublishingIds(prev => { const s = new Set(prev); s.delete(newsId); return s; });
    }
  };

  const deleteNews = async (newsId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('news')
        .delete()
        .eq('id', newsId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Новость удалена",
      });

      loadNews();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить новость",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      tag: newsItem.tag
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingNews(null);
    setFormData({ title: '', content: '', tag: 'Новости' });
    setIsDialogOpen(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 rounded-full border-[2.5px] border-violet-500/30 border-t-violet-500 animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">


        <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <ResponsiveDialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2 w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
              <Plus className="w-4 h-4" />
              Создать новость
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className="sm:max-w-2xl">
            <ResponsiveDialogHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25 shrink-0">
                  {editingNews ? <Edit className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                </div>
                <div className="min-w-0">
                  <ResponsiveDialogTitle className="text-lg">
                    {editingNews ? 'Редактировать новость' : 'Создать новость'}
                  </ResponsiveDialogTitle>
                  <ResponsiveDialogDescription className="text-xs mt-0.5">
                    Заполните информацию. После сохранения новость попадёт в черновики.
                  </ResponsiveDialogDescription>
                </div>
              </div>
            </ResponsiveDialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-violet-500" />
                  Заголовок <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите заголовок новости"
                  required
                  className="focus-visible:ring-violet-500/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag" className="text-sm font-medium flex items-center gap-2">
                  <TagIcon className="h-3.5 w-3.5 text-violet-500" />
                  Тег
                </Label>
                <Select value={formData.tag} onValueChange={(value) => setFormData(prev => ({ ...prev, tag: value }))}>
                  <SelectTrigger className="focus:ring-violet-500/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content" className="text-sm font-medium">
                    Содержание <span className="text-destructive">*</span>
                  </Label>
                  <span className={`text-xs tabular-nums ${formData.content.length >= 1400 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {formData.content.length}/1500
                  </span>
                </div>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Введите содержание новости"
                  rows={8}
                  maxLength={1500}
                  required
                  className="resize-none focus-visible:ring-violet-500/40"
                />
              </div>

              <ResponsiveDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
                  {editingNews ? 'Обновить' : 'Создать черновик'}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>


      <div className="grid gap-3">
        {news.length === 0 ? (
          <Card className="bg-card border-border/60 border-dashed rounded-2xl">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <Newspaper className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-sm font-medium mb-1">Новостей пока нет</p>
              <p className="text-xs text-muted-foreground mb-4">Создайте первую новость для пользователей сервиса</p>
              <Button onClick={openCreateDialog} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
                <Plus className="w-4 h-4" />
                Создать первую новость
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {(() => {
              const totalPages = Math.ceil(news.length / ITEMS_PER_PAGE);
              const paginatedNews = news.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
              return (
                <>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-muted-foreground">
                      Показано <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, news.length)}</span> из <span className="font-medium text-foreground">{news.length}</span>
                    </p>
                  </div>
                  {paginatedNews.map((item) => (
            <Card key={item.id} className={`group rounded-2xl border-border/60 bg-card shadow-sm transition-all hover:border-violet-500/30 hover:shadow-md ${!item.is_published ? 'border-amber-500/30 bg-amber-500/[0.03]' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={`${tagColors[item.tag] || 'bg-gray-100 text-gray-800'} border-0 hover:bg-inherit`}>
                        {item.tag}
                      </Badge>
                      {item.is_published ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10">
                          <Eye className="w-3 h-3 mr-1" />
                          Опубликовано
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/10">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Черновик
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base lg:text-lg break-words leading-snug">{item.title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Создано: {formatDate(item.created_at)}
                      </span>
                      {item.published_at && (
                        <span className="flex items-center gap-1">
                          <span className="hidden sm:inline">•</span>
                          <Send className="w-3 h-3" />
                          {formatDate(item.published_at)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 md:pt-1 flex-wrap md:flex-nowrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                      className="h-8 w-8 p-0 lg:h-9 lg:w-auto lg:px-3 hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30 dark:hover:text-violet-400"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline ml-1.5">Изменить</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => publishNews(item.id, !item.is_published)}
                      disabled={publishingIds.has(item.id)}
                      className={`h-8 w-8 p-0 lg:h-9 lg:w-auto lg:px-3 ${
                        item.is_published
                          ? "bg-card border border-border text-foreground hover:bg-muted"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 text-white shadow-sm shadow-emerald-500/25"
                      }`}
                    >
                      {publishingIds.has(item.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : item.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      <span className="hidden lg:inline ml-1.5">
                        {publishingIds.has(item.id) ? "Ждите..." : item.is_published ? "Скрыть" : "Опубликовать"}
                      </span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive border-border hover:bg-destructive hover:text-white hover:border-transparent h-8 w-8 p-0 lg:h-9 lg:w-auto lg:px-3 [&_svg]:hover:text-white">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline ml-1.5">Удалить</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="mx-2">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить новость?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Новость будет удалена навсегда.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteNews(item.id)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {(() => {
                  const isExpanded = expandedIds.has(item.id);
                  const isLong = item.content.length > 200;
                  return (
                    <div className="space-y-2">
                      <div className={`bg-muted/40 border border-border/40 rounded-xl p-3.5 text-sm relative overflow-hidden transition-all ${isExpanded ? '' : 'max-h-28'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>
                        {isLong && !isExpanded && (
                          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                        )}
                      </div>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(item.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                        >
                          {isExpanded ? (
                            <>Свернуть <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Развернуть <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

                  ))}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center flex-wrap gap-1.5 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-9 px-3"
                      >
                        Назад
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          size="sm"
                          className={`w-9 h-9 p-0 ${
                            page === currentPage
                              ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25"
                              : "bg-card border border-border hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30 text-foreground dark:hover:text-violet-400"
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-9 px-3"
                      >
                        Вперед
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}

          </>
        )}
      </div>
    </div>
  );
};
