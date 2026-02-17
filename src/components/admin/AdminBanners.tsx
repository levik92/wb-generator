import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Loader2 } from "lucide-react";

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold">Баннеры дашборда</h2>
          <p className="text-sm text-muted-foreground">
            Управление баннерами, отображаемыми в личном кабинете пользователей
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Добавить баннер</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Редактировать баннер" : "Новый баннер"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Preview */}
              <div
                className="rounded-xl p-4 text-white"
                style={{
                  background: `linear-gradient(135deg, ${formData.gradient_start} 0%, ${formData.gradient_end} 100%)`,
                }}
              >
                <h4 className="font-semibold text-sm mb-1">
                  {formData.title || "Заголовок баннера"}
                </h4>
                <p className="text-xs opacity-90">
                  {formData.description || "Описание баннера..."}
                </p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Заголовок <span className="text-muted-foreground">({formData.title.length}/100)</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value.slice(0, 100) }))}
                  placeholder="Введите заголовок"
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Описание <span className="text-muted-foreground">({formData.description.length}/200)</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value.slice(0, 200) }))}
                  placeholder="Введите описание"
                  maxLength={200}
                  rows={3}
                />
              </div>

              {/* Gradient presets */}
              <div className="space-y-2">
                <Label>Цвет градиента</Label>
                <div className="flex flex-wrap gap-2">
                  {presetGradients.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className={`h-8 w-8 rounded-lg border-2 transition-all ${
                        formData.gradient_start === preset.start && formData.gradient_end === preset.end
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
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
                  ))}
                </div>
              </div>

              {/* Custom colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gradient_start">Цвет начала</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="gradient_start"
                      value={formData.gradient_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradient_start: e.target.value }))}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.gradient_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradient_start: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradient_end">Цвет конца</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="gradient_end"
                      value={formData.gradient_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradient_end: e.target.value }))}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.gradient_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradient_end: e.target.value }))}
                      className="flex-1"
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
          </DialogContent>
        </Dialog>
      </div>

      {/* Banners list */}
      {banners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Баннеры пока не созданы</p>
            <Button variant="link" onClick={openCreateDialog}>
              Создать первый баннер
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <Card 
              key={banner.id}
              className={`transition-opacity ${!banner.is_active ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Color preview */}
                  <div
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${banner.gradient_start}, ${banner.gradient_end})`,
                    }}
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{banner.title}</h3>
                          <Badge variant={banner.is_active ? "default" : "secondary"}>
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
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить баннер?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Баннер будет удален навсегда.
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
