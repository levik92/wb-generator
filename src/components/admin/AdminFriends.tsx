import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, ExternalLink } from "lucide-react";
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
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.short_description || !form.logo_url || !form.service_url) {
      toast({ title: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("service_friends")
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Друг обновлён" });
      } else {
        const { error } = await supabase.from("service_friends").insert(form);
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
              <Label>URL логотипа *</Label>
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
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
