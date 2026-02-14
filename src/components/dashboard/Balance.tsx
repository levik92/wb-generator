import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, FileText, Images, Loader2, Pencil, Video, RefreshCw, Zap } from "lucide-react";
import Pricing from "./Pricing";
import PaymentHistory from "./PaymentHistory";
import { PromoCodeInput } from "./PromoCodeInput";
import { useGenerationPricing } from "@/hooks/useGenerationPricing";
import { motion } from "framer-motion";
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
  const {
    data: generationPrices,
    isLoading: pricesLoading
  } = useGenerationPricing();
  const photoPrice = generationPrices?.find(p => p.price_type === 'photo_generation')?.tokens_cost ?? 0;
  const regenPrice = generationPrices?.find(p => p.price_type === 'photo_regeneration')?.tokens_cost ?? 0;
  const descPrice = generationPrices?.find(p => p.price_type === 'description_generation')?.tokens_cost ?? 0;
  const editPrice = generationPrices?.find(p => p.price_type === 'photo_edit')?.tokens_cost ?? 0;
  const videoPrice = generationPrices?.find(p => p.price_type === 'video_generation')?.tokens_cost ?? 0;
  const videoRegenPrice = generationPrices?.find(p => p.price_type === 'video_regeneration')?.tokens_cost ?? 0;
  useEffect(() => {
    loadBalance();
  }, []);
  const loadBalance = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      const {
        data,
        error
      } = await supabase.from('profiles').select('tokens_balance').eq('id', session.user.id).maybeSingle();
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
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4
  }} className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Balance Header */}
      <motion.div initial={{
      opacity: 0,
      scale: 0.98
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      duration: 0.4,
      delay: 0.1
    }} className="relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">Баланс токенов</h2>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-1">{balance}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                токенов доступно
              </p>
            </div>
            <Button onClick={() => {
            const pricingElement = document.getElementById('pricing-section');
            if (pricingElement) {
              pricingElement.scrollIntoView({
                behavior: 'smooth'
              });
            }
          }} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto">
              Пополнить
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Generation Costs Card */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.2
    }}>
        <Card className="border-border/50 w-full overflow-hidden bg-card">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-lg sm:text-xl font-semibold">Стоимость генерации</CardTitle>
            <CardDescription>Стоимость указана в токенах</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {pricesLoading ? <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 border border-border/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Описание товара</div>
                    <div className="text-xs text-muted-foreground">SEO-описание</div>
                  </div>
                  <div className="bg-background/80 border border-border/50 px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm">
                    {descPrice}
                  </div>
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Images className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Изображение</div>
                    <div className="text-xs text-muted-foreground">Генерация</div>
                  </div>
                  <div className="bg-background/80 border border-border/50 px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm">
                    {photoPrice}
                  </div>
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Images className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Перегенерация</div>
                    <div className="text-xs text-muted-foreground">Изображения</div>
                  </div>
                  <div className="bg-background/80 border border-border/50 px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm">
                    {regenPrice}
                  </div>
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Pencil className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Редактирование</div>
                    <div className="text-xs text-muted-foreground">Карточки</div>
                  </div>
                  <div className="bg-background/80 border border-border/50 px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm">
                    {editPrice}
                  </div>
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Видеообложка</div>
                    <div className="text-xs text-muted-foreground">Генерация</div>
                  </div>
                  <div className="bg-background/80 border border-border/50 px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm">
                    {videoPrice}
                  </div>
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Перегенерация</div>
                    <div className="text-xs text-muted-foreground">Видеообложки</div>
                  </div>
                  <div className="bg-background/80 border border-border/50 px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm">
                    {videoRegenPrice}
                  </div>
                </div>
              </div>}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Tabs */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.3
    }}>
        <Tabs defaultValue="pricing" className="space-y-4 w-full overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-card p-1 rounded-xl border border-border/50">
            <TabsTrigger value="pricing" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Пополнить баланс</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">История пополнений</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pricing" id="pricing-section" className="space-y-4 sm:space-y-6 mt-4">
            <Pricing appliedPromo={appliedPromo} />
            <PromoCodeInput onPromoApplied={setAppliedPromo} />
          </TabsContent>
          
          <TabsContent value="history" className="mt-4 w-full min-w-0">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>;
}