import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Send, Clock, Eye, EyeOff } from "lucide-react";
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
  'Новости': 'bg-blue-100 text-blue-800',
  'Обновления': 'bg-green-100 text-green-800',
  'Технические работы': 'bg-orange-100 text-orange-800',
  'Исправления': 'bg-red-100 text-red-800',
  'Инструкции': 'bg-purple-100 text-purple-800',
  'Советы': 'bg-yellow-100 text-yellow-800',
  'Аналитика': 'bg-indigo-100 text-indigo-800',
  'Кейсы': 'bg-pink-100 text-pink-800',
};

export const AdminNews = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
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
      // Use any type to bypass TypeScript checks for news table
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
        // Update existing news
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
        // Create new news
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
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const publishNews = async (newsId: string, isPublished: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('news')
        .update({ 
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null
        })
        .eq('id', newsId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: isPublished ? "Новость опубликована" : "Новость снята с публикации",
      });

      loadNews();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
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
        description: error.message,
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
      <div className="text-center py-8">
        <p>Загрузка новостей...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Управление новостями</h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            Создавайте и публикуйте новости для пользователей
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} size="sm" className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Создать новость
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl mx-2">
            <DialogHeader>
              <DialogTitle>
                {editingNews ? 'Редактировать новость' : 'Создать новость'}
              </DialogTitle>
              <DialogDescription>
                Заполните информацию для новости. Максимум 1500 символов.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Заголовок *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите заголовок новости"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="tag">Тег</Label>
                <Select value={formData.tag} onValueChange={(value) => setFormData(prev => ({ ...prev, tag: value }))}>
                  <SelectTrigger>
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
              
              <div>
                <Label htmlFor="content">Содержание * ({formData.content.length}/1500)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Введите содержание новости"
                  rows={8}
                  maxLength={1500}
                  required
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">
                  {editingNews ? 'Обновить' : 'Создать черновик'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {news.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Новостей пока нет</p>
            </CardContent>
          </Card>
        ) : (
          news.map((item) => (
            <Card key={item.id} className={item.is_published ? '' : 'border-orange-200 bg-orange-50/30'}>
              <CardHeader className="pb-3">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={`${tagColors[item.tag] || 'bg-gray-100 text-gray-800'} hover:bg-inherit`}>
                        {item.tag}
                      </Badge>
                      {item.is_published ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <Eye className="w-3 h-3 mr-1" />
                          Опубликовано
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Черновик
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base lg:text-lg break-words">{item.title}</CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Создано: {formatDate(item.created_at)}
                      </span>
                      {item.published_at && (
                        <span className="hidden sm:inline">
                          • Опубликовано: {formatDate(item.published_at)}
                        </span>
                      )}
                      {item.published_at && (
                        <span className="sm:hidden">
                          Опубликовано: {formatDate(item.published_at)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 lg:gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                      className="h-8 w-8 p-0 lg:h-auto lg:w-auto lg:px-4 lg:py-2"
                    >
                      <Edit className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="hidden lg:inline ml-2">Изменить</span>
                    </Button>
                    <Button
                      variant={item.is_published ? "outline" : "default"}
                      size="sm"
                      onClick={() => publishNews(item.id, !item.is_published)}
                      className={`h-8 w-8 p-0 lg:h-auto lg:w-auto lg:px-4 lg:py-2 ${!item.is_published ? "bg-green-600 hover:bg-green-700" : ""}`}
                    >
                      {item.is_published ? <EyeOff className="w-3 h-3 lg:w-4 lg:h-4" /> : <Send className="w-3 h-3 lg:w-4 lg:h-4" />}
                      <span className="hidden lg:inline ml-2">
                        {item.is_published ? "Скрыть" : "Опубликовать"}
                      </span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 h-8 w-8 p-0 lg:h-auto lg:w-auto lg:px-4 lg:py-2">
                          <Trash2 className="w-3 h-3 lg:w-4 lg:h-4" />
                          <span className="hidden lg:inline ml-2">Удалить</span>
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
                            className="bg-red-600 hover:bg-red-700"
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 break-words">
                  {item.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};