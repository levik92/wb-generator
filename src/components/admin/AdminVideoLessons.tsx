import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Edit, Trash2, Play, Clock, Eye, EyeOff, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SortableList, SortableItem } from "./SortableList";

interface VideoLesson {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  display_order: number;
  kinescope_id: string;
  is_active: boolean;
  created_at: string;
}

export const AdminVideoLessons = () => {
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<VideoLesson | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    duration: '',
    display_order: 0,
    kinescope_id: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('video_lessons')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (error: any) {
      toast({ title: "Ошибка", description: "Не удалось загрузить видеоуроки", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.kinescope_id.trim()) {
      toast({ title: "Ошибка", description: "Заполните заголовок и ID видео", variant: "destructive" });
      return;
    }

    // Extract kinescope ID from URL if full URL pasted
    let kinescopeId = formData.kinescope_id.trim();
    const match = kinescopeId.match(/kinescope\.io\/embed\/([a-zA-Z0-9]+)/);
    if (match) kinescopeId = match[1];

    try {
      if (editingLesson) {
        const { error } = await (supabase as any)
          .from('video_lessons')
          .update({
            title: formData.title.trim(),
            subtitle: formData.subtitle.trim(),
            duration: formData.duration.trim(),
            display_order: formData.display_order,
            kinescope_id: kinescopeId,
          })
          .eq('id', editingLesson.id);
        if (error) throw error;
        toast({ title: "Успешно", description: "Видеоурок обновлен" });
      } else {
        const { error } = await (supabase as any)
          .from('video_lessons')
          .insert({
            title: formData.title.trim(),
            subtitle: formData.subtitle.trim(),
            duration: formData.duration.trim(),
            display_order: formData.display_order,
            kinescope_id: kinescopeId,
          });
        if (error) throw error;
        toast({ title: "Успешно", description: "Видеоурок добавлен" });
      }

      setFormData({ title: '', subtitle: '', duration: '', display_order: 0, kinescope_id: '' });
      setEditingLesson(null);
      setIsDialogOpen(false);
      loadLessons();
    } catch (error: any) {
      toast({ title: "Ошибка", description: "Не удалось сохранить видеоурок", variant: "destructive" });
    }
  };

  const toggleActive = async (lesson: VideoLesson) => {
    try {
      const { error } = await (supabase as any)
        .from('video_lessons')
        .update({ is_active: !lesson.is_active })
        .eq('id', lesson.id);
      if (error) throw error;
      toast({ title: "Успешно", description: lesson.is_active ? "Видеоурок скрыт" : "Видеоурок активирован" });
      loadLessons();
    } catch {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    }
  };

  const deleteLesson = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('video_lessons')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Успешно", description: "Видеоурок удален" });
      loadLessons();
    } catch {
      toast({ title: "Ошибка", description: "Не удалось удалить видеоурок", variant: "destructive" });
    }
  };

  const handleReorder = async (newItems: VideoLesson[]) => {
    const reordered = newItems.map((item, idx) => ({ ...item, display_order: idx + 1 }));
    setLessons(reordered);
    try {
      const updates = reordered.map((item) =>
        (supabase as any).from('video_lessons').update({ display_order: item.display_order }).eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r: any) => r.error)?.error;
      if (firstError) throw firstError;
    } catch {
      toast({ title: "Ошибка", description: "Не удалось сохранить порядок", variant: "destructive" });
      loadLessons();
    }
  };

  const openEditDialog = (lesson: VideoLesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      subtitle: lesson.subtitle,
      duration: lesson.duration,
      display_order: lesson.display_order,
      kinescope_id: lesson.kinescope_id,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingLesson(null);
    const maxOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.display_order)) : 0;
    setFormData({ title: '', subtitle: '', duration: '', display_order: maxOrder + 1, kinescope_id: '' });
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8"><p>Загрузка видеоуроков...</p></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Управление видеоуроками</h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            Добавляйте и редактируйте видеоуроки для раздела «Обучение»
          </p>
        </div>

        <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <ResponsiveDialogTrigger asChild>
            <Button onClick={openCreateDialog} size="sm" className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Добавить видео
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className="sm:max-w-lg">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                {editingLesson ? 'Редактировать видеоурок' : 'Добавить видеоурок'}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Укажите информацию о видеоуроке
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="vl-title">Заголовок *</Label>
                <Input
                  id="vl-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Название видеоурока"
                  required
                />
              </div>
              <div>
                <Label htmlFor="vl-subtitle">Подзаголовок</Label>
                <Input
                  id="vl-subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Краткое описание"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="vl-duration">Длительность</Label>
                  <Input
                    id="vl-duration"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="5:30"
                  />
                </div>
                <div>
                  <Label htmlFor="vl-order">Порядок</Label>
                  <Input
                    id="vl-order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vl-kinescope">Kinescope ID или ссылка *</Label>
                <Input
                  id="vl-kinescope"
                  value={formData.kinescope_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, kinescope_id: e.target.value }))}
                  placeholder="soVNVxif9ePmX7h7Hj5tMm"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Вставьте ID видео или полную ссылку на embed
                </p>
              </div>
              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                <Button type="submit">{editingLesson ? 'Обновить' : 'Добавить'}</Button>
              </ResponsiveDialogFooter>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>

      <div className="grid gap-3">
        {lessons.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Видеоуроков пока нет</p>
            </CardContent>
          </Card>
        ) : (
          <SortableList items={lessons} onReorder={handleReorder}>
            <div className="grid gap-3">
              {lessons.map((lesson) => (
                <SortableItem key={lesson.id} id={lesson.id}>
                  <Card className={`rounded-2xl border-border/50 ${lesson.is_active ? 'bg-card/80' : 'border-amber-500/20 bg-amber-500/5'}`}>
                    <CardHeader className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Play className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">#{lesson.display_order}</Badge>
                              {lesson.duration && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration}
                                </Badge>
                              )}
                              {lesson.is_active ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10">
                                  <Eye className="w-3 h-3 mr-1" /> Активно
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10">
                                  <EyeOff className="w-3 h-3 mr-1" /> Скрыто
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base lg:text-lg break-words">{lesson.title}</CardTitle>
                            {lesson.subtitle && (
                              <CardDescription className="text-xs mt-1">{lesson.subtitle}</CardDescription>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {lesson.kinescope_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <Switch checked={lesson.is_active} onCheckedChange={() => toggleActive(lesson)} />
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(lesson)} className="h-8 w-8 p-0">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-white h-8 w-8 p-0">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-2">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить видеоурок?</AlertDialogTitle>
                                <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteLesson(lesson.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </SortableItem>
              ))}
            </div>
          </SortableList>
        )}
      </div>
    </div>
  );
};
