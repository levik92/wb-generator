import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, FileText, Images } from "lucide-react";
import Pricing from "./Pricing";
import PaymentHistory from "./PaymentHistory";

export default function Balance() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-gradient-to-r from-wb-purple/10 to-wb-purple-dark/10 border-2 border-wb-purple/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-wb-purple/20 p-3 rounded-lg">
              <Coins className="h-6 w-6 text-wb-purple" />
            </div>
            <h2 className="text-xl font-semibold text-wb-purple">Баланс токенов</h2>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-wb-purple mb-2">{balance}</div>
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
            className="bg-wb-purple hover:bg-wb-purple-dark"
          >
            Пополнить
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Стоимость генерации</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-muted/50 border border-border rounded-[10px] p-4 flex items-center gap-3">
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
            <div className="bg-muted/50 border border-border rounded-[10px] p-4 flex items-center gap-3">
              <div className="bg-muted p-2 rounded-lg">
                <Images className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">1 комплект карточек</div>
                <div className="text-xs text-muted-foreground">6 изображений товара</div>
              </div>
              <div className="bg-background border px-3 py-1 rounded-lg font-medium text-sm">
                6 токенов
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
        
        <TabsContent value="pricing" id="pricing-section">
          <Pricing />
        </TabsContent>
        
        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}