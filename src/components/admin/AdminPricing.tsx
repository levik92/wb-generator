import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";

interface PaymentPackage {
  id: string;
  name: string;
  price: number;
  tokens: number;
  currency: string;
  is_active: boolean;
}

interface GenerationPrice {
  id: string;
  price_type: string;
  tokens_cost: number;
  description: string;
}

export function AdminPricing() {
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [generationPrices, setGenerationPrices] = useState<GenerationPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadPackages(), loadGenerationPrices()]);
  };

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_packages')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тарифы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGenerationPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('generation_pricing')
        .select('*')
        .order('price_type');

      if (error) throw error;
      setGenerationPrices(data || []);
    } catch (error) {
      console.error('Error loading generation prices:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить цены генерации",
        variant: "destructive",
      });
    }
  };

  const handlePackageUpdate = async (pkg: PaymentPackage) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_packages')
        .update({
          name: pkg.name,
          price: pkg.price,
          tokens: pkg.tokens,
          is_active: pkg.is_active,
        })
        .eq('id', pkg.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Тариф обновлен",
      });
      
      await loadPackages();
    } catch (error) {
      console.error('Error updating package:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить тариф",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePackageCreate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_packages')
        .insert({
          name: 'Новый тариф',
          price: 100,
          tokens: 10,
          currency: 'RUB',
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Тариф создан",
      });
      
      await loadPackages();
    } catch (error) {
      console.error('Error creating package:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать тариф",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePackageDelete = async (id: string) => {
    if (!confirm('Удалить этот тариф?')) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Тариф удален",
      });
      
      await loadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить тариф",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerationPriceUpdate = async (price: GenerationPrice) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('generation_pricing')
        .update({ tokens_cost: price.tokens_cost })
        .eq('id', price.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Цена обновлена",
      });

      // Invalidate the cache to refresh prices everywhere
      queryClient.invalidateQueries({ queryKey: ['generation-pricing'] });
      
      await loadGenerationPrices();
    } catch (error) {
      console.error('Error updating generation price:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить цену",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-wb-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Тарифы */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Тарифные планы</CardTitle>
              <CardDescription>Управление пакетами токенов и ценами</CardDescription>
            </div>
            <Button onClick={handlePackageCreate} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить тариф
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Цена (₽)</TableHead>
                  <TableHead>Токены</TableHead>
                  <TableHead>Активен</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <Input
                        value={pkg.name}
                        onChange={(e) => {
                          const updated = packages.map(p => 
                            p.id === pkg.id ? { ...p, name: e.target.value } : p
                          );
                          setPackages(updated);
                        }}
                        className="max-w-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={pkg.price}
                        onChange={(e) => {
                          const updated = packages.map(p => 
                            p.id === pkg.id ? { ...p, price: parseInt(e.target.value) || 0 } : p
                          );
                          setPackages(updated);
                        }}
                        className="max-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={pkg.tokens}
                        onChange={(e) => {
                          const updated = packages.map(p => 
                            p.id === pkg.id ? { ...p, tokens: parseInt(e.target.value) || 0 } : p
                          );
                          setPackages(updated);
                        }}
                        className="max-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={pkg.is_active}
                        onCheckedChange={(checked) => {
                          const updated = packages.map(p => 
                            p.id === pkg.id ? { ...p, is_active: checked } : p
                          );
                          setPackages(updated);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handlePackageUpdate(pkg)}
                        disabled={saving}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePackageDelete(pkg.id)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Цены генерации */}
      <Card>
        <CardHeader>
          <CardTitle>Стоимость генерации</CardTitle>
          <CardDescription>Цены в токенах за каждый тип операции</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {generationPrices.map((price) => (
              <div key={price.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>{price.description}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={price.tokens_cost}
                    onChange={(e) => {
                      const updated = generationPrices.map(p =>
                        p.id === price.id
                          ? { ...p, tokens_cost: parseInt(e.target.value) || 0 }
                          : p
                      );
                      setGenerationPrices(updated);
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">токенов</span>
                  <Button
                    size="sm"
                    onClick={() => handleGenerationPriceUpdate(price)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              * Изменения цен применяются автоматически во всех разделах портала
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
