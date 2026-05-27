import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Loader2, Activity, LayoutPanelTop, Image as ImageIcon } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  description: string;
  gradient_start: string;
  gradient_end: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface FormData {
  title: string;
  description: string;
  gradient_start: string;
  gradient_end: string;
  is_active: boolean;
}

const defaultFormData: FormData = {
  title: "",
  description: "",
  gradient_start: "#ec4899",
  gradient_end: "#f43f5e",
  is_active: true,
};

// Preset gradients for easy selection
const presetGradients = [
  { name: "Розовый", start: "#ec4899", end: "#f43f5e" },
  { name: "Фиолетовый", start: "#8b5cf6", end: "#a855f7" },
  { name: "Синий", start: "#3b82f6", end: "#6366f1" },
  { name: "Зеленый", start: "#10b981", end: "#22c55e" },
  { name: "Оранжевый", start: "#f97316", end: "#fb923c" },
  { name: "Красный", start: "#ef4444", end: "#f43f5e" },
];

const DEFAULT_MESSAGES: Record<string, string> = {
  none: '',
  green: 'Все системы работают нормально',
  yellow: 'Сервера загружены, возможны задержки при генерации',
  red: 'Сервера перегружены, генерация может не работать',
};

const STATUS_OPTIONS = [
  { value: 'none', label: 'Выключен', color: 'bg-muted text-muted-foreground border-border' },
  { value: 'green', label: 'Всё работает', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'yellow', label: 'Возможны сбои', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  { value: 'red', label: 'Нестабильная работа', color: 'bg-destructive/10 text-destructive border-destructive/30' },
];

const SystemStatusControl = () => {
  const [status, setStatus] = useState('none');
  const [message, setMessage] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast: statusToast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from('system_status')
        .select('status, message, subtitle')
        .limit(1)
        .single();
      if (!error && data) {
        setStatus(data.status);
        setMessage(data.message || '');
        setSubtitle(data.subtitle || '');
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    const newMessage = newStatus === status ? message : (DEFAULT_MESSAGES[newStatus] || '');
    const newSubtitle = newStatus === status ? subtitle : '';
    
    const { error } = await (supabase as any)
      .from('system_status')
      .update({ status: newStatus, message: newMessage, subtitle: newSubtitle, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      statusToast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' });
    } else {
      setStatus(newStatus);
      setMessage(newMessage);
      setSubtitle(newSubtitle);
      statusToast({ title: 'Статус обновлён' });
    }
    setSaving(false);
  };

  const handleMessageSave = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from('system_status')
      .update({ message, subtitle, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      statusToast({ title: 'Ошибка', variant: 'destructive' });
    } else {
      statusToast({ title: 'Сохранено' });
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card className="bg-card border-border/60 rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-violet-500/[0.04] via-transparent to-transparent border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Статус системы</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Глобальное уведомление о работоспособности сервиса</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = status === opt.value;
            return (
              <button
                key={opt.value}
                disabled={saving}
                onClick={() => handleStatusChange(opt.value)}
                className={`relative px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? `${opt.color} border-current shadow-sm`
                    : 'bg-card text-muted-foreground border-border/40 opacity-50 hover:opacity-90 hover:border-border'
                }`}
              >
                {isActive && (
                  <span className="absolute top-1/2 -translate-y-1/2 right-1.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
        {status !== 'none' && (
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Сообщение статуса..."
              className="flex-1 text-xs h-9"
            />
            <Button size="sm" onClick={handleMessageSave} disabled={saving} className="h-9 text-xs bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Сохранить'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error loading banners:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить баннеры",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Ошибка",
        description: "Заголовок обязателен",
        variant: "destructive",
      });
      return;
    }

    if (formData.title.length > 100) {
      toast({
        title: "Ошибка",
        description: "Заголовок не должен превышать 100 символов",
        variant: "destructive",
      });
      return;
    }

    if (formData.description.length > 200) {
      toast({
        title: "Ошибка",
        description: "Описание не должно превышать 200 символов",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingBanner) {
        // Update existing banner
        const { error } = await supabase
          .from('dashboard_banners')
          .update({
            title: formData.title,
            description: formData.description,
            gradient_start: formData.gradient_start,
            gradient_end: formData.gradient_end,
            is_active: formData.is_active,
          })
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast({ title: "Баннер обновлен" });
      } else {
        // Create new banner
        const maxOrder = banners.reduce((max, b) => Math.max(max, b.display_order), -1);
        const { error } = await supabase
          .from('dashboard_banners')
          .insert({
            title: formData.title,
            description: formData.description,
            gradient_start: formData.gradient_start,
            gradient_end: formData.gradient_end,
            is_active: formData.is_active,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast({ title: "Баннер создан" });
      }

      setIsDialogOpen(false);
      setEditingBanner(null);
      setFormData(defaultFormData);
      loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить баннер",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('dashboard_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      
      setBanners(prev => prev.map(b => 
        b.id === banner.id ? { ...b, is_active: !b.is_active } : b
      ));
      
      toast({ 
        title: banner.is_active ? "Баннер скрыт" : "Баннер активирован" 
      });
    } catch (error) {
      console.error('Error toggling banner:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус баннера",
        variant: "destructive",
      });
    }
  };

  const deleteBanner = async (bannerId: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;
      
      setBanners(prev => prev.filter(b => b.id !== bannerId));
      toast({ title: "Баннер удален" });
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить баннер",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      gradient_start: banner.gradient_start,
      gradient_end: banner.gradient_end,
      is_active: banner.is_active,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBanner(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25">
          <LayoutPanelTop className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Баннеры и статус
          </h1>
          <p className="text-sm text-muted-foreground">Управление статусом системы и баннерами личного кабинета</p>
        </div>
      </div>

      {/* System Status Control */}
      <SystemStatusControl />

      {/* Banners section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <ImageIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold">Баннеры дашборда</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Отображаются в личном кабинете пользователей
            </p>
          </div>
        </div>
        <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <ResponsiveDialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
              <Plus className="h-4 w-4" />
              <span>Добавить баннер</span>
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className="sm:max-w-lg">
            <ResponsiveDialogHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25 shrink-0">
                  {editingBanner ? <Pencil className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                </div>
                <div className="min-w-0">
                  <ResponsiveDialogTitle className="text-lg">
                    {editingBanner ? "Редактировать баннер" : "Новый баннер"}
                  </ResponsiveDialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Заполните поля — превью обновляется в реальном времени
                  </p>
                </div>
              </div>
            </ResponsiveDialogHeader>

            <div className="space-y-5 py-2">
              {/* Live Preview */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Превью</Label>
                <div
                  className="relative rounded-2xl p-5 text-white shadow-lg overflow-hidden ring-1 ring-border/40"
                  style={{
                    background: `linear-gradient(135deg, ${formData.gradient_start} 0%, ${formData.gradient_end} 100%)`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative">
                    <h4 className="font-semibold text-base mb-1 line-clamp-2">
                      {formData.title || "Заголовок баннера"}
                    </h4>
                    <p className="text-sm opacity-90 line-clamp-3">
                      {formData.description || "Описание баннера появится здесь..."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title" className="text-sm font-medium">Заголовок</Label>
                  <span className={`text-xs tabular-nums ${formData.title.length >= 90 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {formData.title.length}/100
                  </span>
                </div>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value.slice(0, 100) }))}
                  placeholder="Введите заголовок"
                  maxLength={100}
                  className="focus-visible:ring-violet-500/40"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-medium">Описание</Label>
                  <span className={`text-xs tabular-nums ${formData.description.length >= 180 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {formData.description.length}/200
                  </span>
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value.slice(0, 200) }))}
                  placeholder="Введите описание"
                  maxLength={200}
                  rows={3}
                  className="resize-none focus-visible:ring-violet-500/40"
                />
              </div>

              {/* Gradient presets */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Цвет градиента</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/40 border border-border/50">
                  {presetGradients.map((preset) => {
                    const isActive = formData.gradient_start === preset.start && formData.gradient_end === preset.end;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        className={`relative h-10 w-10 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-background scale-105 shadow-md'
                            : 'ring-1 ring-border/40 hover:scale-105 hover:ring-border'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                        }}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          gradient_start: preset.start,
                          gradient_end: preset.end,
                        }))}
                        title={preset.name}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Custom colors */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Свои цвета</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gradient_start" className="text-xs text-muted-foreground">Начало</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="gradient_start"
                        value={formData.gradient_start}
                        onChange={(e) => setFormData(prev => ({ ...prev, gradient_start: e.target.value }))}
                        className="h-10 w-12 rounded-lg border border-border/50 cursor-pointer bg-transparent shrink-0"
                      />
                      <Input
                        value={formData.gradient_start}
                        onChange={(e) => setFormData(prev => ({ ...prev, gradient_start: e.target.value }))}
                        className="flex-1 font-mono text-xs uppercase focus-visible:ring-violet-500/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gradient_end" className="text-xs text-muted-foreground">Конец</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="gradient_end"
                        value={formData.gradient_end}
                        onChange={(e) => setFormData(prev => ({ ...prev, gradient_end: e.target.value }))}
                        className="h-10 w-12 rounded-lg border border-border/50 cursor-pointer bg-transparent shrink-0"
                      />
                      <Input
                        value={formData.gradient_end}
                        onChange={(e) => setFormData(prev => ({ ...prev, gradient_end: e.target.value }))}
                        className="flex-1 font-mono text-xs uppercase focus-visible:ring-violet-500/40"
                      />
                    </div>

                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Активный баннер</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingBanner ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>

      {/* Banners list */}
      {banners.length === 0 ? (
        <Card className="bg-card border-border/60 border-dashed rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-medium mb-1">Баннеры пока не созданы</p>
            <p className="text-xs text-muted-foreground mb-4">Создайте первый баннер для дашборда пользователей</p>
            <Button onClick={openCreateDialog} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
              <Plus className="h-4 w-4" />
              Создать первый баннер
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <Card 
              key={banner.id}
              className={`group bg-card border-border/60 rounded-2xl shadow-sm transition-all hover:border-violet-500/30 hover:shadow-md ${!banner.is_active ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Color preview */}
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0 shadow-sm ring-1 ring-border/40"
                    style={{
                      background: `linear-gradient(135deg, ${banner.gradient_start}, ${banner.gradient_end})`,
                    }}
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">{banner.title}</h3>
                          <Badge
                            className={
                              banner.is_active
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10"
                                : "bg-muted text-muted-foreground border border-border hover:bg-muted"
                            }
                          >
                            {banner.is_active ? "Активен" : "Скрыт"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {banner.description}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(banner)}
                          title={banner.is_active ? "Скрыть" : "Показать"}
                          className="hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg"
                        >
                          {banner.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(banner)}
                          className="hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive hover:text-white rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить баннер?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteBanner(banner.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
