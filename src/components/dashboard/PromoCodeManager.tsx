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
import { Plus, Edit, Trash2, Tag, Calendar, Users, Infinity as InfinityIcon } from "lucide-react";

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
    <Card className="bg-card rounded-2xl border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-violet-500/[0.04] via-transparent to-transparent border-b border-border/50 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25 shrink-0">
              <Tag className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg">Промокоды</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Управление промокодами для пользователей
                {promoCodes.length > 0 && <span className="ml-1.5 text-muted-foreground/70">· {promoCodes.length}</span>}
              </CardDescription>
            </div>
          </div>
          <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button onClick={resetForm} size="sm" className="w-full sm:w-auto gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
                <Plus className="h-4 w-4" />
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
                  <Input id="code" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="WELCOME2024" className="font-mono uppercase focus-visible:ring-violet-500/40" />
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
                    <SelectTrigger className="text-base md:text-sm focus:ring-violet-500/40"><SelectValue /></SelectTrigger>
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
                  <Input id="value" type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder={formData.type === 'discount' ? '10' : '25'} className="focus-visible:ring-violet-500/40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Максимальное количество использований (всего)</Label>
                  <Input id="maxUses" type="number" value={formData.maxUses} onChange={e => setFormData({ ...formData, maxUses: e.target.value })} placeholder="Пустое = неограниченно" className="focus-visible:ring-violet-500/40" />
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
                    className="focus-visible:ring-violet-500/40"
                  />
                  {isInstantType && (
                    <p className="text-xs text-muted-foreground">Для мгновенных промокодов всегда 1 раз на аккаунт</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Действует до</Label>
                  <Input id="validUntil" type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} className="w-full min-w-0 focus-visible:ring-violet-500/40" />
                </div>
              </div>
              <ResponsiveDialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                <Button onClick={handleSubmit} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
                  {editingPromo ? 'Обновить' : 'Создать'}
                </Button>
              </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-4">
        {promoCodes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Tag className="h-7 w-7 text-violet-500" />
            </div>
            <h3 className="font-semibold mb-1">Промокодов пока нет</h3>
            <p className="text-sm text-muted-foreground mb-4">Создайте первый промокод для пользователей</p>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25">
              <Plus className="h-4 w-4" />
              Создать промокод
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground min-w-[120px]">Код</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground min-w-[110px]">Тип</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground min-w-[90px]">Значение</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground min-w-[110px]">Использовано</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground min-w-[90px]">Статус</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground min-w-[120px] hidden lg:table-cell">Действует до</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground min-w-[100px] text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map(promo => (
                    <TableRow key={promo.id} className="transition-colors hover:bg-violet-500/[0.03]">
                      <TableCell className="font-mono text-sm font-semibold tracking-wide">{promo.code}</TableCell>
                      <TableCell>
                        <Badge variant={promo.type === 'tokens_instant' ? 'default' : promo.type === 'tokens' ? 'outline' : 'secondary'} className="text-[10px] font-medium">
                          {TYPE_LABELS[promo.type] || promo.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums font-medium">
                        {promo.value}{promo.type === 'discount' ? '%' : ''}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        <span className="text-foreground font-medium">{promo.current_uses}</span> / {promo.max_uses ?? '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={promo.is_active ? 'default' : 'secondary'}
                          className={`cursor-pointer text-[10px] transition-colors ${promo.is_active ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/30 dark:text-emerald-400' : 'hover:bg-muted'}`}
                          onClick={() => toggleActive(promo.id, promo.is_active)}
                        >
                          {promo.is_active ? 'Активен' : 'Выключен'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : <span className="inline-flex items-center gap-1"><InfinityIcon className="h-3 w-3" /> без срока</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(promo)}
                            className="h-8 w-8 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(promo.id)}
                            className="h-8 w-8 hover:bg-destructive hover:text-white transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {promoCodes.map(promo => (
                <div
                  key={promo.id}
                  className="rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-violet-500/30"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-semibold tracking-wide truncate">{promo.code}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant={promo.type === 'tokens_instant' ? 'default' : promo.type === 'tokens' ? 'outline' : 'secondary'} className="text-[10px] font-medium">
                          {TYPE_LABELS[promo.type] || promo.type}
                        </Badge>
                        <span className="text-sm tabular-nums font-semibold">
                          {promo.value}{promo.type === 'discount' ? '%' : ''}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={promo.is_active ? 'default' : 'secondary'}
                      className={`cursor-pointer text-[10px] shrink-0 transition-colors ${promo.is_active ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/30 dark:text-emerald-400' : 'hover:bg-muted'}`}
                      onClick={() => toggleActive(promo.id, promo.is_active)}
                    >
                      {promo.is_active ? 'Активен' : 'Выкл'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="h-3 w-3 shrink-0" />
                      <span className="tabular-nums truncate">
                        <span className="text-foreground font-medium">{promo.current_uses}</span> / {promo.max_uses ?? '∞'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="tabular-nums truncate">
                        {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'без срока'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(promo)}
                      className="flex-1 h-8 gap-1.5 text-xs hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Изменить
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(promo.id)}
                      className="flex-1 h-8 gap-1.5 text-xs hover:bg-destructive hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

