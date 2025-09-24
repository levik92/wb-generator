import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Tag } from "lucide-react";

interface PromoCode {
  id: string;
  code: string;
  type: 'tokens' | 'discount';
  value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export const PromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'tokens' as 'tokens' | 'discount',
    value: '',
    maxUses: '',
    validUntil: ''
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes((data || []).map(promo => ({
        ...promo,
        type: promo.type as 'tokens' | 'discount'
      })));
    } catch (error) {
      console.error('Error loading promocodes:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить промокоды",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.code || !formData.value) {
        toast({
          title: "Ошибка",
          description: "Заполните все обязательные поля",
          variant: "destructive",
        });
        return;
      }

      const promoData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: parseInt(formData.value),
        max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
        valid_until: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
        is_active: true
      };

      let error;
      if (editingPromo) {
        ({ error } = await supabase
          .from('promocodes')
          .update(promoData)
          .eq('id', editingPromo.id));
      } else {
        ({ error } = await supabase
          .from('promocodes')
          .insert(promoData));
      }

      if (error) throw error;

      toast({
        title: "Успешно",
        description: editingPromo ? "Промокод обновлен" : "Промокод создан",
      });

      setIsDialogOpen(false);
      resetForm();
      loadPromoCodes();
    } catch (error: any) {
      console.error('Error saving promocode:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить промокод",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      type: promo.type,
      value: promo.value.toString(),
      maxUses: promo.max_uses?.toString() || '',
      validUntil: promo.valid_until ? new Date(promo.valid_until).toISOString().split('T')[0] : ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('promocodes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Промокод удален",
      });

      loadPromoCodes();
    } catch (error) {
      console.error('Error deleting promocode:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить промокод",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promocodes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Промокод ${!currentStatus ? 'активирован' : 'деактивирован'}`,
      });

      loadPromoCodes();
    } catch (error) {
      console.error('Error updating promocode:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус промокода",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'tokens',
      value: '',
      maxUses: '',
      validUntil: ''
    });
    setEditingPromo(null);
  };

  if (loading) {
    return <div>Загрузка промокодов...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Промокоды</CardTitle>
              <CardDescription>Управление промокодами для пользователей</CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Создать промокод
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPromo ? 'Редактировать промокод' : 'Создать промокод'}
                </DialogTitle>
                <DialogDescription>
                  Настройте параметры промокода для пользователей
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Код промокода</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="WELCOME2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Тип</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as 'tokens' | 'discount' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tokens">Бонусные токены</SelectItem>
                      <SelectItem value="discount">Скидка (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {formData.type === 'tokens' ? 'Количество токенов' : 'Размер скидки (%)'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === 'tokens' ? '25' : '10'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Максимальное количество использований</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="Оставьте пустым для неограниченного"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Действует до</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSubmit}>
                  {editingPromo ? 'Обновить' : 'Создать'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Код</TableHead>
                  <TableHead className="min-w-[80px]">Тип</TableHead>
                  <TableHead className="min-w-[80px]">Значение</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Использовано</TableHead>
                  <TableHead className="min-w-[80px]">Статус</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">Действует до</TableHead>
                  <TableHead className="min-w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-mono text-sm">{promo.code}</TableCell>
                    <TableCell>
                      <Badge variant={promo.type === 'tokens' ? 'default' : 'secondary'} className="text-xs">
                        {promo.type === 'tokens' ? 'Токены' : 'Скидка'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {promo.value}{promo.type === 'tokens' ? ' токенов' : '%'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {promo.current_uses} / {promo.max_uses || '∞'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={promo.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                      >
                        {promo.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('ru-RU') : 'Без ограничений'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(promo)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(promo.id)}
                          className="h-8 w-8 p-0"
                        >
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