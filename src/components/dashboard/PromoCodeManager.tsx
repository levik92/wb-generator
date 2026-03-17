import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogTrigger } from "@/components/ui/responsive-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Tag } from "lucide-react";

type PromoType = 'tokens' | 'discount' | 'tokens_instant';

interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_user: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<PromoType, string> = {
  tokens: 'После оплаты',
  discount: 'Скидка',
  tokens_instant: 'Сразу',
};

const TYPE_OPTIONS: { value: PromoType; label: string }[] = [
  { value: 'tokens', label: 'Бонусные токены (после оплаты)' },
  { value: 'discount', label: 'Скидка (%)' },
  { value: 'tokens_instant', label: 'Бонусные токены (сразу)' },
];

export const PromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'tokens' as PromoType,
    value: '',
    maxUses: '',
    maxUsesPerUser: '',
    validUntil: ''
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const isInstantType = formData.type === 'tokens_instant';

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPromoCodes((data || []).map(promo => ({
        ...promo,
        type: promo.type as PromoType,
        max_uses_per_user: (promo as any).max_uses_per_user ?? null,
      })));
    } catch (error) {
      console.error('Error loading promocodes:', error);
      toast({ title: "Ошибка", description: "Не удалось загрузить промокоды", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.code || !formData.value) {
        toast({ title: "Ошибка", description: "Заполните все обязательные поля", variant: "destructive" });
        return;
      }
      const effectiveMaxPerUser = isInstantType ? 1 : (formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser) : null);
      const promoData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: parseInt(formData.value),
        max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
        max_uses_per_user: effectiveMaxPerUser,
        valid_until: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
        is_active: true
      };

      let error;
      if (editingPromo) {
        ({ error } = await supabase.from('promocodes').update(promoData).eq('id', editingPromo.id));
      } else {
        ({ error } = await supabase.from('promocodes').insert(promoData));
      }
      if (error) throw error;

      toast({ title: "Успешно", description: editingPromo ? "Промокод обновлен" : "Промокод создан" });
      setIsDialogOpen(false);
      resetForm();
      loadPromoCodes();
    } catch (error: any) {
      console.error('Error saving promocode:', error);
      toast({ title: "Ошибка", description: "Не удалось сохранить промокод", variant: "destructive" });
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      type: promo.type,
      value: promo.value.toString(),
      maxUses: promo.max_uses?.toString() || '',
      maxUsesPerUser: promo.max_uses_per_user?.toString() || '',
      validUntil: promo.valid_until ? new Date(promo.valid_until).toISOString().split('T')[0] : ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('promocodes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Успешно", description: "Промокод удален" });
      loadPromoCodes();
    } catch (error) {
      console.error('Error deleting promocode:', error);
      toast({ title: "Ошибка", description: "Не удалось удалить промокод", variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('promocodes').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      toast({ title: "Успешно", description: `Промокод ${!currentStatus ? 'активирован' : 'деактивирован'}` });
      loadPromoCodes();
    } catch (error) {
      console.error('Error updating promocode:', error);
      toast({ title: "Ошибка", description: "Не удалось обновить статус промокода", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ code: '', type: 'tokens', value: '', maxUses: '', maxUsesPerUser: '', validUntil: '' });
    setEditingPromo(null);
  };

  if (loading) return <div>Загрузка промокодов...</div>;

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg">Промокоды</CardTitle>
              <CardDescription className="text-xs md:text-sm">Управление промокодами для пользователей</CardDescription>
            </div>
          </div>
          <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button onClick={resetForm} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Создать промокод
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="sm:max-w-md">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{editingPromo ? 'Редактировать промокод' : 'Создать промокод'}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>Настройте параметры промокода для пользователей</ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Код промокода</Label>
                  <Input id="code" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="WELCOME2024" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Тип</Label>
                  <Select value={formData.type} onValueChange={value => {
                    const newType = value as PromoType;
                    setFormData({
                      ...formData,
                      type: newType,
                      maxUsesPerUser: newType === 'tokens_instant' ? '1' : formData.maxUsesPerUser
                    });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {formData.type === 'discount' ? 'Размер скидки (%)' : 'Количество токенов'}
                  </Label>
                  <Input id="value" type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder={formData.type === 'discount' ? '10' : '25'} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Максимальное количество использований (всего)</Label>
                  <Input id="maxUses" type="number" value={formData.maxUses} onChange={e => setFormData({ ...formData, maxUses: e.target.value })} placeholder="Пустое = неограниченно" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsesPerUser">Макс. использований на аккаунт</Label>
                  <Input
                    id="maxUsesPerUser"
                    type="number"
                    value={isInstantType ? '1' : formData.maxUsesPerUser}
                    onChange={e => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                    placeholder="Пустое = неограниченно"
                    disabled={isInstantType}
                  />
                  {isInstantType && (
                    <p className="text-xs text-muted-foreground">Для мгновенных промокодов всегда 1 раз на аккаунт</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Действует до</Label>
                  <Input id="validUntil" type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} />
                </div>
              </div>
              <ResponsiveDialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                <Button onClick={handleSubmit}>{editingPromo ? 'Обновить' : 'Создать'}</Button>
              </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[90px]">Код</TableHead>
                <TableHead className="min-w-[70px]">Тип</TableHead>
                <TableHead className="min-w-[80px]">Значение</TableHead>
                <TableHead className="min-w-[90px] hidden md:table-cell">Использовано</TableHead>
                <TableHead className="min-w-[70px]">Статус</TableHead>
                <TableHead className="min-w-[110px] hidden lg:table-cell">Действует до</TableHead>
                <TableHead className="min-w-[90px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map(promo => (
                <TableRow key={promo.id}>
                  <TableCell className="font-mono text-xs md:text-sm">{promo.code}</TableCell>
                  <TableCell>
                    <Badge variant={promo.type === 'tokens_instant' ? 'default' : promo.type === 'tokens' ? 'outline' : 'secondary'} className="text-xs">
                      {TYPE_LABELS[promo.type] || promo.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    {promo.value}{promo.type === 'discount' ? '%' : ''}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {promo.current_uses} / {promo.max_uses || '∞'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={promo.is_active ? 'default' : 'secondary'} className="cursor-pointer text-xs" onClick={() => toggleActive(promo.id, promo.is_active)}>
                      {promo.is_active ? 'Да' : 'Нет'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">
                    {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '∞'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 md:gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(promo)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(promo.id)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
