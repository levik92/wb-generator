import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Save, Trash2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQueryClient } from "@tanstack/react-query";
import { SortableList, SortableItem } from "./SortableList";
interface PaymentPackage {
  id: string;
  name: string;
  price: number;
  tokens: number;
  currency: string;
  is_active: boolean;
  is_popular: boolean;
  is_trial: boolean;
  invoice_enabled: boolean;
  display_order: number;
}
interface GenerationPrice {
  id: string;
  price_type: string;
  tokens_cost: number;
  description: string;
  display_order: number;
}
export function AdminPricing() {
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [generationPrices, setGenerationPrices] = useState<GenerationPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string>('yookassa');
  const [cloudpaymentsPublicId, setCloudpaymentsPublicId] = useState('');
  const [providerSettingsId, setProviderSettingsId] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    await Promise.all([loadPackages(), loadGenerationPrices(), loadProviderSettings()]);
  };
  const loadProviderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_provider_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setActiveProvider(data.active_provider);
        setCloudpaymentsPublicId(data.cloudpayments_public_id || '');
        setProviderSettingsId(data.id);
      }
    } catch (error) {
      console.error('Error loading provider settings:', error);
    }
  };
  const handleSaveProviderSettings = async () => {
    setSavingProvider(true);
    try {
      if (activeProvider === 'cloudpayments' && !cloudpaymentsPublicId.trim()) {
        toast({ title: "Ошибка", description: "Укажите Public ID для CloudPayments", variant: "destructive" });
        return;
      }
      const updateData = {
        active_provider: activeProvider,
        cloudpayments_public_id: cloudpaymentsPublicId.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (providerSettingsId) {
        const { error } = await supabase
          .from('payment_provider_settings')
          .update(updateData)
          .eq('id', providerSettingsId);
        if (error) throw error;
      }
      toast({ title: "Успешно", description: "Настройки платёжной системы сохранены" });
    } catch (error) {
      console.error('Error saving provider settings:', error);
      toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
    } finally {
      setSavingProvider(false);
    }
  };
  const loadPackages = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('payment_packages').select('*').order('display_order', {
        ascending: true
      }).order('price', {
        ascending: true
      });
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тарифы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadGenerationPrices = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('generation_pricing').select('*').order('display_order', { ascending: true }).order('price_type');
      if (error) throw error;
      setGenerationPrices(data || []);
    } catch (error) {
      console.error('Error loading generation prices:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить цены генерации",
        variant: "destructive"
      });
    }
  };
  const handlePackageUpdate = async (pkg: PaymentPackage) => {
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('payment_packages').update({
        name: pkg.name,
        price: pkg.price,
        tokens: pkg.tokens,
        is_active: pkg.is_active,
        is_popular: pkg.is_popular,
        is_trial: pkg.is_trial,
        invoice_enabled: pkg.invoice_enabled,
      }).eq('id', pkg.id);
      if (error) throw error;
      toast({
        title: "Успешно",
        description: "Тариф обновлен"
      });

      // Invalidate cache to refresh prices everywhere
      queryClient.invalidateQueries({
        queryKey: ['payment-packages']
      });
    } catch (error) {
      console.error('Error updating package:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить тариф",
        variant: "destructive"
      });
      // Reload on error to revert changes
      await loadPackages();
    } finally {
      setSaving(false);
    }
  };
  const handlePackageCreate = async () => {
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('payment_packages').insert({
        name: 'Новый тариф',
        price: 100,
        tokens: 10,
        currency: 'RUB',
        is_active: true,
        is_popular: false
      });
      if (error) throw error;
      toast({
        title: "Успешно",
        description: "Тариф создан"
      });

      // Invalidate cache to refresh prices everywhere
      queryClient.invalidateQueries({
        queryKey: ['payment-packages']
      });

      // Reload to show new package
      await loadPackages();
    } catch (error) {
      console.error('Error creating package:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать тариф",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handlePackageDelete = async (id: string) => {
    if (!confirm('Удалить этот тариф?')) return;
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('payment_packages').delete().eq('id', id);
      if (error) throw error;
      toast({
        title: "Успешно",
        description: "Тариф удален"
      });

      // Invalidate cache to refresh prices everywhere
      queryClient.invalidateQueries({
        queryKey: ['payment-packages']
      });
      await loadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить тариф",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handleGenerationPriceUpdate = async (price: GenerationPrice) => {
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('generation_pricing').update({
        tokens_cost: price.tokens_cost
      }).eq('id', price.id);
      if (error) throw error;
      toast({
        title: "Успешно",
        description: "Цена обновлена"
      });

      // Invalidate the cache to refresh prices everywhere
      queryClient.invalidateQueries({
        queryKey: ['generation-pricing']
      });
    } catch (error) {
      console.error('Error updating generation price:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить цену",
        variant: "destructive"
      });
      // Reload on error to revert changes
      await loadGenerationPrices();
    } finally {
      setSaving(false);
    }
  };
  const handleReorderPackages = async (newItems: PaymentPackage[]) => {
    const reordered = newItems.map((item, idx) => ({ ...item, display_order: idx + 1 }));
    setPackages(reordered);
    try {
      const updates = reordered.map((item) =>
        supabase.from('payment_packages').update({ display_order: item.display_order }).eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      queryClient.invalidateQueries({ queryKey: ['payment-packages'] });
    } catch {
      toast({ title: "Ошибка", description: "Не удалось сохранить порядок", variant: "destructive" });
      await loadPackages();
    }
  };
  const handleReorderGenerationPrices = async (newItems: GenerationPrice[]) => {
    const reordered = newItems.map((item, idx) => ({ ...item, display_order: idx + 1 }));
    setGenerationPrices(reordered);
    try {
      const updates = reordered.map((item) =>
        supabase.from('generation_pricing').update({ display_order: item.display_order }).eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      queryClient.invalidateQueries({ queryKey: ['generation-pricing'] });
    } catch {
      toast({ title: "Ошибка", description: "Не удалось сохранить порядок", variant: "destructive" });
      await loadGenerationPrices();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 w-full min-w-0">
      {/* Тарифы */}
      <Card className="overflow-hidden bg-card border-border/50 rounded-2xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl">Тарифные планы</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Управление пакетами токенов и ценами
              </CardDescription>
            </div>
            <Button onClick={handlePackageCreate} disabled={saving} size="sm" className="w-full sm:w-auto flex-shrink-0">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="ml-2 sm:ml-0">Добавить тариф</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                     <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Название</TableHead>
                     <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Цена (₽)</TableHead>
                     <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Токены</TableHead>
                     <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Популярный</TableHead>
                     <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Триал</TableHead>
                     <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Безнал</TableHead>
                     <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Активен</TableHead>
                     <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap px-2 sm:px-4">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map(pkg => <TableRow key={pkg.id}>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <Input value={pkg.name} onChange={e => {
                      const updated = packages.map(p => p.id === pkg.id ? {
                        ...p,
                        name: e.target.value
                      } : p);
                      setPackages(updated);
                    }} className="w-28 sm:w-32 md:max-w-xs text-xs sm:text-sm h-8 sm:h-9" />
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <Input type="number" value={pkg.price} onChange={e => {
                      const updated = packages.map(p => p.id === pkg.id ? {
                        ...p,
                        price: parseInt(e.target.value) || 0
                      } : p);
                      setPackages(updated);
                    }} className="w-20 sm:w-24 text-xs sm:text-sm h-8 sm:h-9" />
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <Input type="number" value={pkg.tokens} onChange={e => {
                      const updated = packages.map(p => p.id === pkg.id ? {
                        ...p,
                        tokens: parseInt(e.target.value) || 0
                      } : p);
                      setPackages(updated);
                    }} className="w-20 sm:w-24 text-xs sm:text-sm h-8 sm:h-9" />
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <Switch 
                          checked={pkg.is_popular} 
                          onCheckedChange={checked => {
                            // When setting popular, unset all others (DB trigger handles this too)
                            const updated = packages.map(p => ({
                              ...p,
                              is_popular: p.id === pkg.id ? checked : (checked ? false : p.is_popular)
                            }));
                            setPackages(updated);
                          }} 
                        />
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <Switch checked={pkg.is_trial} onCheckedChange={checked => {
                      const updated = packages.map(p => p.id === pkg.id ? {
                        ...p,
                        is_trial: checked
                      } : p);
                      setPackages(updated);
                    }} />
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <Switch checked={pkg.invoice_enabled} onCheckedChange={checked => {
                      const updated = packages.map(p => p.id === pkg.id ? {
                        ...p,
                        invoice_enabled: checked
                      } : p);
                      setPackages(updated);
                    }} />
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <Switch checked={pkg.is_active} onCheckedChange={checked => {
                      const updated = packages.map(p => p.id === pkg.id ? {
                        ...p,
                        is_active: checked
                      } : p);
                      setPackages(updated);
                    }} />
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button size="sm" onClick={() => handlePackageUpdate(pkg)} disabled={saving} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                            <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handlePackageDelete(pkg.id)} disabled={saving} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Цены генерации */}
      <Card className="bg-card border-border/50 rounded-2xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Стоимость генерации</CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-1">
            Цены в токенах за каждый тип операции
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 sm:pt-0">
          <div className="space-y-3 sm:space-y-4">
            {generationPrices.map(price => <div key={price.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-0 rounded-lg bg-muted/30 sm:bg-transparent">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs sm:text-sm font-medium break-words">
                    {price.description}
                  </Label>
                </div>
                <div className="flex items-center gap-2 sm:gap-2 flex-wrap sm:flex-nowrap">
                  <Input type="number" min="0" value={price.tokens_cost} onChange={e => {
                const updated = generationPrices.map(p => p.id === price.id ? {
                  ...p,
                  tokens_cost: parseInt(e.target.value) || 0
                } : p);
                setGenerationPrices(updated);
              }} className="w-16 sm:w-20 text-xs sm:text-sm h-8 sm:h-9 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    токенов
                  </span>
                  <Button size="sm" onClick={() => handleGenerationPriceUpdate(price)} disabled={saving} className="h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0">
                    <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline text-xs">Сохранить</span>
                  </Button>
                </div>
              </div>)}
            <p className="text-[10px] sm:text-xs text-muted-foreground pt-2 leading-relaxed">
              * Изменения цен применяются автоматически во всех разделах портала
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Платёжная система */}
      <Card className="bg-card border-border/50 rounded-2xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg sm:text-xl">Платёжная система</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm mt-1">
            Выберите активную платёжную систему для приёма оплат
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 sm:pt-0">
          <div className="space-y-4">
            <RadioGroup value={activeProvider} onValueChange={setActiveProvider} className="space-y-3">
              <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${activeProvider === 'yookassa' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="yookassa" id="yookassa" />
                <Label htmlFor="yookassa" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">ЮKassa</div>
                  <div className="text-xs text-muted-foreground">Текущая платёжная система</div>
                </Label>
                {activeProvider === 'yookassa' && (
                  <Badge variant="secondary" className="text-xs">Активна</Badge>
                )}
              </div>
              <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${activeProvider === 'cloudpayments' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="cloudpayments" id="cloudpayments" />
                <Label htmlFor="cloudpayments" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">CloudPayments</div>
                  <div className="text-xs text-muted-foreground">Альтернативная платёжная система</div>
                </Label>
                {activeProvider === 'cloudpayments' && (
                  <Badge variant="secondary" className="text-xs">Активна</Badge>
                )}
              </div>
            </RadioGroup>

            {activeProvider === 'cloudpayments' && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                <Label htmlFor="cp-public-id" className="text-sm font-medium">Public ID</Label>
                <Input
                  id="cp-public-id"
                  value={cloudpaymentsPublicId}
                  onChange={(e) => setCloudpaymentsPublicId(e.target.value)}
                  placeholder="pk_..."
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Публичный идентификатор из личного кабинета CloudPayments
                </p>
              </div>
            )}

            <Button onClick={handleSaveProviderSettings} disabled={savingProvider} className="w-full sm:w-auto">
              {savingProvider ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Сохранить настройки
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
}