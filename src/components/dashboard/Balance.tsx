import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, FileText, Images, Loader2, Pencil } from "lucide-react";
import Pricing from "./Pricing";
import PaymentHistory from "./PaymentHistory";
import { PromoCodeInput } from "./PromoCodeInput";
import { useGenerationPricing } from "@/hooks/useGenerationPricing";

interface PromoCodeInfo {
  id: string;
  code: string;
  type: 'discount' | 'tokens';
  value: number;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  is_active: boolean;
}

export default function Balance() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeInfo | null>(null);
  const { data: generationPrices, isLoading: pricesLoading } = useGenerationPricing();
  
  const photoPrice = generationPrices?.find(p => p.price_type === 'photo_generation')?.tokens_cost ?? 0;
  const regenPrice = generationPrices?.find(p => p.price_type === 'photo_regeneration')?.tokens_cost ?? 0;
  const descPrice = generationPrices?.find(p => p.price_type === 'description_generation')?.tokens_cost ?? 0;
  const editPrice = generationPrices?.find(p => p.price_type === 'photo_edit')?.tokens_cost ?? 0;

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('tokens_balance')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading balance:', error);
      } else if (data) {
        setBalance(data.tokens_balance || 0);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 w-full min-w-0">
      <div className="bg-gradient-to-br from-wb-purple/5 via-wb-purple/10 to-wb-purple-dark/15 border border-wb-purple/20 rounded-xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-wb-purple/20 to-wb-purple-dark/20 p-2 sm:p-3 rounded-lg shadow-lg">
                <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-wb-purple" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-wb-purple to-wb-purple-dark bg-clip-text text-transparent">Баланс токенов</h2>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-wb-purple to-wb-purple-dark bg-clip-text text-transparent mb-2">{balance}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                токенов доступно для генерации
              </p>
            </div>
            <Button 
              onClick={() => {
                const pricingElement = document.getElementById('pricing-section');
                if (pricingElement) {
                  pricingElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-gradient-to-r from-wb-purple to-wb-purple-dark hover:from-wb-purple-dark hover:to-wb-purple shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              Пополнить
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-muted/30 w-full overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-semibold">Стоимость генерации</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {pricesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-muted/30 border border-border rounded-[10px] p-3 sm:p-4 flex items-center gap-3">
                <div className="bg-muted p-2 rounded-lg flex-shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">1 описание товара</div>
                  <div className="text-xs text-muted-foreground">Генерация описания</div>
                </div>
                <div className="bg-background border px-2 sm:px-3 py-1 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0">
                  {descPrice} {descPrice === 1 ? 'токен' : 'токенов'}
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-[10px] p-3 sm:p-4 flex items-center gap-3">
                <div className="bg-muted p-2 rounded-lg flex-shrink-0">
                  <Images className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">1 перегенерация изображения</div>
                  <div className="text-xs text-muted-foreground">Повторная генерация существующего изображения</div>
                </div>
                <div className="bg-background border px-2 sm:px-3 py-1 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0">
                  {regenPrice} {regenPrice === 1 ? 'токен' : 'токенов'}
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-[10px] p-3 sm:p-4 flex items-center gap-3">
                <div className="bg-muted p-2 rounded-lg flex-shrink-0">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">1 редактирование карточки</div>
                  <div className="text-xs text-muted-foreground">Изменение существующего изображения по вашим инструкциям</div>
                </div>
                <div className="bg-background border px-2 sm:px-3 py-1 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0">
                  {editPrice} {editPrice === 1 ? 'токен' : 'токенов'}
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-[10px] p-3 sm:p-4 flex items-center gap-3">
                <div className="bg-muted p-2 rounded-lg flex-shrink-0">
                  <Images className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">1 изображение карточки</div>
                  <div className="text-xs text-muted-foreground">Генерация</div>
                </div>
                <div className="bg-background border px-2 sm:px-3 py-1 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0">
                  {photoPrice} {photoPrice === 1 ? 'токен' : 'токенов'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="pricing" className="space-y-4 w-full overflow-hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pricing" className="text-xs sm:text-sm">Пополнить баланс</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">История пополнений</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pricing" id="pricing-section" className="space-y-4 sm:space-y-6 mt-4">
          <Pricing appliedPromo={appliedPromo} />
          <PromoCodeInput onPromoApplied={setAppliedPromo} />
        </TabsContent>
        
        <TabsContent value="history" className="mt-4 w-full min-w-0">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}