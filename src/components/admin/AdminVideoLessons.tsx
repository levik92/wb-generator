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
import { Plus, Edit, Trash2, Play, Clock, Eye, EyeOff, GripVertical, GraduationCap, Video, Hash, Link2, Type, AlignLeft, Pencil } from "lucide-react";
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
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Загрузка видеоуроков...</p>
      </div>
    );
  }

  const activeCount = lessons.filter(l => l.is_active).length;
  const hiddenCount = lessons.length - activeCount;

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-5 md:p-6">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Управление видеоуроками</h2>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
                Добавляйте и редактируйте видеоуроки для раздела «Обучение»
              </p>
            </div>
          </div>

          <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                size="sm"
                className="gap-2 w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm shadow-violet-500/25 border-0"
              >
                <Plus className="w-4 h-4" />
                Добавить видео
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="sm:max-w-lg">
              <ResponsiveDialogHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/25">
                    {editingLesson ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <ResponsiveDialogTitle className="text-lg">
                      {editingLesson ? 'Редактировать видеоурок' : 'Добавить видеоурок'}
                    </ResponsiveDialogTitle>
                    <ResponsiveDialogDescription className="text-xs mt-1">
                      Укажите название, длительность и Kinescope ID
                    </ResponsiveDialogDescription>
                  </div>
                </div>
              </ResponsiveDialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vl-title" className="text-xs font-medium flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-violet-500" />
                    Заголовок <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vl-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Название видеоурока"
                    required
                    className="focus-visible:ring-violet-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vl-subtitle" className="text-xs font-medium flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-violet-500" />
                    Подзаголовок
                  </Label>
                  <Input
                    id="vl-subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Краткое описание"
                    className="focus-visible:ring-violet-500/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vl-duration" className="text-xs font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-violet-500" />
                      Длительность
                    </Label>
                    <Input
                      id="vl-duration"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="5 мин."
                      className="focus-visible:ring-violet-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vl-order" className="text-xs font-medium flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-violet-500" />
                      Порядок
                    </Label>
                    <Input
                      id="vl-order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      className="focus-visible:ring-violet-500/40 tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vl-kinescope" className="text-xs font-medium flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-violet-500" />
                    Kinescope ID или ссылка <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vl-kinescope"
                    value={formData.kinescope_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, kinescope_id: e.target.value }))}
                    placeholder="soVNVxif9ePmX7h7Hj5tMm"
                    required
                    className="focus-visible:ring-violet-500/40 font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Вставьте ID видео или полную ссылку на embed — мы извлечём ID автоматически
                  </p>
                </div>
                <ResponsiveDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="sm:w-auto">
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    className="sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm shadow-violet-500/25 border-0"
                  >
                    {editingLesson ? 'Обновить' : 'Добавить'}
                  </Button>
                </ResponsiveDialogFooter>
              </form>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </div>

      {/* Stats strip */}
      {lessons.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="rounded-xl border border-border/50 bg-card/60 p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Video className="w-3.5 h-3.5" /> Всего
            </div>
            <p className="text-xl md:text-2xl font-bold tabular-nums">{lessons.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
              <Eye className="w-3.5 h-3.5" /> Активных
            </div>
            <p className="text-xl md:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-1">
              <EyeOff className="w-3.5 h-3.5" /> Скрытых
            </div>
            <p className="text-xl md:text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{hiddenCount}</p>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {lessons.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border/60">
            <CardContent className="flex flex-col items-center text-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                <Video className="w-7 h-7 text-violet-500" />
              </div>
              <div>
                <p className="font-semibold">Видеоуроков пока нет</p>
                <p className="text-sm text-muted-foreground mt-1">Добавьте первое видео для раздела «Обучение»</p>
              </div>
              <Button
                onClick={openCreateDialog}
                size="sm"
                className="gap-2 mt-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
              >
                <Plus className="w-4 h-4" /> Добавить видео
              </Button>
            </CardContent>
          </Card>
        ) : (
          <SortableList items={lessons} onReorder={handleReorder}>
            <div className="grid gap-3">
              {lessons.map((lesson) => (
                <SortableItem key={lesson.id} id={lesson.id}>
                  <Card
                    className={`group rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                      lesson.is_active
                        ? 'border-border/50 bg-card/80 hover:border-violet-500/30'
                        : 'border-amber-500/20 bg-amber-500/5'
                    }`}
                  >
                    <CardHeader className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <Play className="w-4 h-4 text-violet-600 dark:text-violet-400 fill-current" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5 border-violet-500/30 text-violet-600 dark:text-violet-400">
                                #{lesson.display_order}
                              </Badge>
                              {lesson.duration && (
                                <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {lesson.duration}
                                </Badge>
                              )}
                              {lesson.is_active ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] gap-1 px-1.5 py-0 h-5">
                                  <Eye className="w-2.5 h-2.5" /> Активно
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 text-[10px] gap-1 px-1.5 py-0 h-5">
                                  <EyeOff className="w-2.5 h-2.5" /> Скрыто
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base lg:text-lg break-words leading-snug">{lesson.title}</CardTitle>
                            {lesson.subtitle && (
                              <CardDescription className="text-xs mt-1 line-clamp-2">{lesson.subtitle}</CardDescription>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-1.5 font-mono truncate">
                              ID: {lesson.kinescope_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 sm:pl-2 sm:border-l sm:border-border/50">
                          <Switch
                            checked={lesson.is_active}
                            onCheckedChange={() => toggleActive(lesson)}
                            className="data-[state=checked]:bg-violet-500"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(lesson)}
                            className="h-8 w-8 p-0 border-0 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 border-0 text-destructive hover:bg-destructive hover:text-white transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-2 rounded-2xl">
                              <AlertDialogHeader>
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-5 h-5 text-destructive" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <AlertDialogTitle>Удалить видеоурок?</AlertDialogTitle>
                                    <AlertDialogDescription className="mt-1">
                                      «{lesson.title}» будет удалён без возможности восстановления.
                                    </AlertDialogDescription>
                                  </div>
                                </div>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                <AlertDialogCancel className="sm:w-auto">Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteLesson(lesson.id)}
                                  className="sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
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
