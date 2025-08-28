import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins } from "lucide-react";
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Баланс токенов</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{balance}</div>
          <p className="text-xs text-muted-foreground">
            токенов доступно для генерации
          </p>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pricing">Пополнить баланс</TabsTrigger>
          <TabsTrigger value="history">История пополнений</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pricing">
          <Pricing />
        </TabsContent>
        
        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}