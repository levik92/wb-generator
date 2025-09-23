import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Eye } from "lucide-react";
import { formatDate } from "date-fns";
import { ru } from "date-fns/locale";

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  tag: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const NEWS_TAGS = [
  'Новости', 
  'Обновления', 
  'Технические работы', 
  'Исправления', 
  'Инструкции', 
  'Советы', 
  'Аналитика', 
  'Кейсы'
];

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

export default function AdminNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tag: "Новости"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update({
            title: formData.title,
            content: formData.content,
            tag: formData.tag
          })
          .eq('id', editingNews.id);

        if (error) throw error;
        toast({
          title: "Успешно",
          description: "Новость обновлена"
        });
      } else {
        const { error } = await supabase
          .from('news')
          .insert({
            title: formData.title,
            content: formData.content,
            tag: formData.tag
          });

        if (error) throw error;
        toast({
          title: "Успешно",
          description: "Новость создана"
        });
      }

      setFormData({ title: "", content: "", tag: "Новости" });
      setShowForm(false);
      setEditingNews(null);
      loadNews();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить новость",
        variant: "destructive"
      });
    }
  };

  const handlePublish = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({ is_published: !isPublished })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: isPublished ? "Новость снята с публикации" : "Новость опубликована"
      });
      
      loadNews();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус публикации",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту новость?")) return;

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: "Новость удалена"
      });
      
      loadNews();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить новость",
        variant: "destructive"
      });
    }
  };

  const startEditing = (article: NewsArticle) => {
    setEditingNews(article);
    setFormData({
      title: article.title,
      content: article.content,
      tag: article.tag
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Управление новостями</h2>
        <Button 
          onClick={() => {
            setShowForm(true);
            setEditingNews(null);
            setFormData({ title: "", content: "", tag: "Новости" });
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать новость
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingNews ? "Редактировать новость" : "Создать новость"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Заголовок новости"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              
              <div>
                <Select value={formData.tag} onValueChange={(value) => setFormData({ ...formData, tag: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEWS_TAGS.map((tag) => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Textarea
                  placeholder="Содержание новости (до 1500 символов)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  maxLength={1500}
                  rows={6}
                />
                <div className="text-sm text-muted-foreground mt-1">
                  {formData.content.length}/1500 символов
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingNews ? "Обновить" : "Создать"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingNews(null);
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {news.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <Badge className={TAG_COLORS[article.tag as keyof typeof TAG_COLORS]}>
                      {article.tag}
                    </Badge>
                    {article.is_published ? (
                      <Badge variant="secondary">
                        <Eye className="w-3 h-3 mr-1" />
                        Опубликовано
                      </Badge>
                    ) : (
                      <Badge variant="outline">Черновик</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Создано: {formatDate(new Date(article.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                    {article.published_at && (
                      <> • Опубликовано: {formatDate(new Date(article.published_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}</>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(article)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={article.is_published ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handlePublish(article.id, article.is_published)}
                  >
                    {article.is_published ? "Снять с публикации" : "Опубликовать"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(article.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {article.content}
              </p>
            </CardContent>
          </Card>
        ))}

        {news.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Новостей пока нет</h3>
            <p className="text-muted-foreground mb-4">Создайте первую новость для пользователей</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать новость
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}