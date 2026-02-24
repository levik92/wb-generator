import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Loader2, ExternalLink, Upload, X } from "lucide-react";
import { motion } from "framer-motion";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  tag: string;
  slug: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  views: number;
  image_url: string | null;
}

const TAGS = ["Гайд", "Новости", "Советы", "Кейс", "Обновление"];

const tagColors: Record<string, string> = {
  "Гайд": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Новости": "bg-green-500/20 text-green-400 border-green-500/30",
  "Советы": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Кейс": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Обновление": "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

export const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    tag: "Гайд",
    slug: "",
    is_published: false,
    image_url: "",
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить статьи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[а-яё]/gi, (char) => {
        const map: Record<string, string> = {
          а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
          з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
          п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
          ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
        };
        return map[char.toLowerCase()] || char;
      })
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : generateSlug(title),
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      excerpt: "",
      tag: "Гайд",
      slug: "",
      is_published: false,
      image_url: "",
    });
    setEditingPost(null);
    setImagePreview(null);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Выберите изображение",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5 МБ",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      setImagePreview(publicUrl);
      toast({ title: "Изображение загружено" });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: "" }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      tag: post.tag,
      slug: post.slug,
      is_published: post.is_published,
      image_url: post.image_url || "",
    });
    setImagePreview(post.image_url || null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content || !formData.excerpt || !formData.slug) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const postData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        tag: formData.tag,
        slug: formData.slug,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        author_id: user?.id,
        image_url: formData.image_url || null,
      };

      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", editingPost.id);

        if (error) throw error;
        toast({ title: "Статья обновлена" });
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert(postData);

        if (error) throw error;
        toast({ title: "Статья создана" });
      }

      setDialogOpen(false);
      resetForm();
      loadPosts();
    } catch (error: any) {
      console.error("Error saving post:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить статью",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить статью?")) return;

    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Статья удалена" });
      loadPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить статью",
        variant: "destructive",
      });
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          is_published: !post.is_published,
          published_at: !post.is_published ? new Date().toISOString() : null,
        })
        .eq("id", post.id);

      if (error) throw error;
      toast({
        title: post.is_published ? "Статья снята с публикации" : "Статья опубликована",
      });
      loadPosts();
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус публикации",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold">Управление блогом</h2>
          <p className="text-sm text-muted-foreground">Создавайте и редактируйте статьи для SEO</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Новая статья
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto mx-2">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "Редактирование статьи" : "Новая статья"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Как создать продающую карточку товара"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">URL-адрес (slug) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="kak-sozdat-kartochku"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag">Категория</Label>
                  <Select
                    value={formData.tag}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, tag: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Изображение статьи (опционально)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                {imagePreview || formData.image_url ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-primary/20 bg-muted/30">
                    <img 
                      src={imagePreview || formData.image_url} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 shadow-lg"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-3 left-3 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">
                      Изображение загружено
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`w-full h-40 border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      uploading 
                        ? 'border-muted-foreground/30 bg-muted/20 cursor-wait' 
                        : 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/50 hover:bg-primary/15'
                    }`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Загрузка...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">
                            Нажмите для загрузки
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, WEBP · Макс. 5 МБ
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Краткое описание (для превью) *</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Разбираем ключевые элементы успешной карточки..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Содержание статьи *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Полный текст статьи... Поддерживается Markdown"
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Поддерживается Markdown разметка
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Опубликовать сразу</Label>
                  <p className="text-xs text-muted-foreground">
                    Статья будет видна на сайте
                  </p>
                </div>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_published: checked }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPost ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle>Статьи блога</CardTitle>
          <CardDescription>
            Всего статей: {posts.length} | Опубликовано: {posts.filter(p => p.is_published).length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground mb-4">Статей пока нет</p>
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Создать первую статью
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Статья</TableHead>
                    <TableHead className="min-w-[100px]">Категория</TableHead>
                    <TableHead className="min-w-[100px]">Статус</TableHead>
                    <TableHead className="text-center min-w-[80px]">Просмотры</TableHead>
                    <TableHead className="min-w-[100px] hidden md:table-cell">Дата</TableHead>
                    <TableHead className="text-right min-w-[120px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-medium truncate text-sm">{post.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            /blog/{post.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tagColors[post.tag]}>
                          {post.tag}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={post.is_published ? "default" : "secondary"}
                          className={post.is_published ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10" : ""}
                        >
                          {post.is_published ? "Опубликовано" : "Черновик"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          {post.views}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                        {formatDate(post.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5 md:gap-1">
                          {post.is_published && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                              title="Открыть статью"
                              className="h-7 w-7 md:h-8 md:w-8 p-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePublish(post)}
                            title={post.is_published ? "Снять с публикации" : "Опубликовать"}
                            className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-500"
                          >
                            <Eye className={`w-3 h-3 ${post.is_published ? "text-emerald-500" : ""}`} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(post)}
                            title="Редактировать"
                            className="h-7 w-7 md:h-8 md:w-8 p-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(post.id)}
                            title="Удалить"
                            className="h-7 w-7 md:h-8 md:w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};