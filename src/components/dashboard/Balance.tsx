import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, FileText, Images } from "lucide-react";
import Pricing from "./Pricing";
import PaymentHistory from "./PaymentHistory";
import { PromoCodeInput } from "./PromoCodeInput";

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
        .single();

      if (error) {
        console.error('Error loading balance:', error);
      } else {
        setBalance(data?.tokens_balance || 0);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-wb-purple/5 via-wb-purple/10 to-wb-purple-dark/15 border border-wb-purple/20 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-wb-purple/20 to-wb-purple-dark/20 p-3 rounded-lg shadow-lg">
                <Coins className="h-6 w-6 text-wb-purple" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-wb-purple to-wb-purple-dark bg-clip-text text-transparent">Баланс токенов</h2>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-wb-purple to-wb-purple-dark bg-clip-text text-transparent mb-2">{balance}</div>
              <p className="text-sm text-muted-foreground">
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
              className="bg-gradient-to-r from-wb-purple to-wb-purple-dark hover:from-wb-purple-dark hover:to-wb-purple shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Пополнить
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Стоимость генерации</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-muted/30 border border-border rounded-[10px] p-4 flex items-center gap-3">
              <div className="bg-muted p-2 rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">1 описание товара</div>
                <div className="text-xs text-muted-foreground">Генерация описания</div>
              </div>
               <div className="bg-background border px-3 py-1 rounded-lg font-medium text-sm">
                 1 токен
               </div>
            </div>
            <div className="bg-muted/30 border border-border rounded-[10px] p-4 flex items-center gap-3">
              <div className="bg-muted p-2 rounded-lg">
                <Images className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">1 изображение карточки</div>
                <div className="text-xs text-muted-foreground">Генерация</div>
              </div>
              <div className="bg-background border px-3 py-1 rounded-lg font-medium text-sm">
                10 токенов
              </div>
            </div>
            <div className="bg-muted/30 border border-border rounded-[10px] p-4 flex items-center gap-3">
              <div className="bg-muted p-2 rounded-lg">
                <Images className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">1 перегенерация изображения</div>
                <div className="text-xs text-muted-foreground">Повторная генерация существующего изображения</div>
              </div>
              <div className="bg-background border px-3 py-1 rounded-lg font-medium text-sm">
                5 токенов
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pricing">Пополнить баланс</TabsTrigger>
          <TabsTrigger value="history">История пополнений</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pricing" id="pricing-section" className="space-y-6">
          <Pricing appliedPromo={appliedPromo} />
          <PromoCodeInput onPromoApplied={setAppliedPromo} />
        </TabsContent>
        
        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}