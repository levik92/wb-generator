import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, ExternalLink, Upload, X, ImageIcon } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";

interface ServiceFriend {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  exclusive_conditions: string;
  logo_url: string;
  service_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  short_description: "",
  detailed_description: "",
  exclusive_conditions: "",
  logo_url: "",
  service_url: "",
  display_order: 0,
  is_active: true,
};

export const AdminFriends = () => {
  const { toast } = useToast();
  const [friends, setFriends] = useState<ServiceFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceFriend | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_friends")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить друзей", variant: "destructive" });
    } else {
      setFriends(data || []);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, display_order: friends.length });
    setLogoFile(null);
    setLogoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (friend: ServiceFriend) => {
    setEditing(friend);
    setForm({
      name: friend.name,
      short_description: friend.short_description,
      detailed_description: friend.detailed_description,
      exclusive_conditions: friend.exclusive_conditions,
      logo_url: friend.logo_url,
      service_url: friend.service_url,
      display_order: friend.display_order,
      is_active: friend.is_active,
    });
    setLogoFile(null);
    setLogoPreview(friend.logo_url || null);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Выберите изображение", variant: "destructive" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Максимальный размер 3 МБ", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setForm({ ...form, logo_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `logos/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("service_friends_logos")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw new Error("Ошибка загрузки логотипа: " + error.message);
    const { data } = supabase.storage.from("service_friends_logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    const hasLogo = logoFile || form.logo_url;
    if (!form.name || !form.short_description || !hasLogo || !form.service_url) {
      toast({ title: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let logoUrl = form.logo_url;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const payload = { ...form, logo_url: logoUrl };

      if (editing) {
        const { error } = await supabase
          .from("service_friends")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Друг обновлён" });
      } else {
        const { error } = await supabase.from("service_friends").insert(payload);
        if (error) throw error;
        toast({ title: "Друг добавлен" });
      }
      setDialogOpen(false);
      await loadFriends();
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этого друга?")) return;
    const { error } = await supabase.from("service_friends").delete().eq("id", id);
    if (error) {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    } else {
      toast({ title: "Удалено" });
      await loadFriends();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Друзья сервиса</CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </CardHeader>
      <CardContent>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Нет добавленных друзей</p>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                {friend.logo_url && (
                  <img
                    src={friend.logo_url}
                    alt={friend.name}
                    className="w-10 h-10 rounded-lg object-contain bg-background border border-border/50"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{friend.name}</p>
                    <Badge variant={friend.is_active ? "default" : "secondary"} className="shrink-0 text-[10px]">
                      {friend.is_active ? "Активен" : "Скрыт"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{friend.short_description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(friend)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(friend.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{editing ? "Редактировать" : "Добавить друга"}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название сервиса" />
            </div>
            <div className="space-y-2">
              <Label>Логотип *</Label>
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden group">
                  <img src={logoPreview} alt="Logo" className="w-14 h-14 object-contain" />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Нажмите для загрузки (до 3 МБ)</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <div className="space-y-2">
              <Label>Ссылка на сервис *</Label>
              <Input value={form.service_url} onChange={(e) => setForm({ ...form, service_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Краткое описание *</Label>
              <Textarea value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} placeholder="1-2 предложения" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Детальное описание</Label>
              <Textarea value={form.detailed_description} onChange={(e) => setForm({ ...form, detailed_description: e.target.value })} placeholder="Подробнее о сервисе..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Эксклюзивные условия</Label>
              <Textarea value={form.exclusive_conditions} onChange={(e) => setForm({ ...form, exclusive_conditions: e.target.value })} placeholder="Скидка, бонус при переходе..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Порядок отображения</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Активен</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <div className="pt-4">
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </Card>
  );
};
