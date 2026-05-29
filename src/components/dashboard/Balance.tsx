import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, FileText, Images, Pencil, Video, RefreshCw, Zap, AlertCircle, MessageCircle, Sparkles, Wallet } from "lucide-react";
import Pricing from "./Pricing";
import PaymentHistory from "./PaymentHistory";
import { PromoCodeInput } from "./PromoCodeInput";
import { useGenerationPricing } from "@/hooks/useGenerationPricing";
import { motion } from "framer-motion";

interface PromoCodeInfo {
  id: string;
  code: string;
  type: 'discount' | 'tokens' | 'tokens_instant';
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
  const videoPrice = generationPrices?.find(p => p.price_type === 'video_generation')?.tokens_cost ?? 0;
  const videoRegenPrice = generationPrices?.find(p => p.price_type === 'video_regeneration')?.tokens_cost ?? 0;

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
      if (error) console.error('Error loading balance:', error);
      else if (data) setBalance(data.tokens_balance || 0);
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const costItems = [
    { icon: FileText, label: "Описание товара", sub: "SEO-описание", value: descPrice },
    { icon: Images, label: "Изображение", sub: "Генерация", value: photoPrice },
    { icon: RefreshCw, label: "Перегенерация", sub: "Изображения", value: regenPrice },
    { icon: Pencil, label: "Редактирование", sub: "Карточки", value: editPrice },
    { icon: Video, label: "Видеообложка", sub: "Генерация", value: videoPrice },
    { icon: RefreshCw, label: "Перегенерация", sub: "Видеообложки", value: videoRegenPrice },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 sm:space-y-6 w-full min-w-0"
    >
      {/* Support hint */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/50 px-3 py-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-violet-500" />
        <span className="flex-1 min-w-0 text-xs leading-relaxed text-muted-foreground">
          Если платёж не создаётся или возникает ошибка — обратитесь в поддержку. Поможем пополнить баланс.
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 h-9 w-9 p-0 sm:h-8 sm:w-auto sm:px-3 sm:gap-1.5 rounded-lg text-xs bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 hover:text-violet-700"
          onClick={() => window.open('https://t.me/wbgen_support', '_blank')}
        >
          <MessageCircle className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">Поддержка</span>
        </Button>
      </div>

      {/* Balance Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-card p-5 sm:p-7"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Ваш баланс
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent leading-none">
                  {balance}
                </div>
                <span className="text-sm sm:text-base text-muted-foreground">токенов</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Используйте токены для генерации карточек, описаний и видео
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              const pricingElement = document.getElementById('pricing-section');
              if (pricingElement) pricingElement.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-11 rounded-xl px-5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 w-full sm:w-auto gap-2"
          >
            <Wallet className="h-4 w-4" />
            Пополнить
          </Button>
        </div>
      </motion.div>

      {/* Generation Costs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-border/60 bg-card w-full overflow-hidden rounded-2xl">
          <CardHeader className="p-5 sm:p-6 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                <Coins className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold">Стоимость генерации</CardTitle>
                <CardDescription className="text-xs mt-0.5">Стоимость указана в токенах</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 pt-0">
            {pricesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-7 h-7 rounded-full border-[2.5px] border-violet-500/30 border-t-violet-500 animate-[spin_0.7s_linear_infinite]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {costItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="group bg-background/40 border border-border/50 rounded-xl p-3 sm:p-3.5 flex items-center gap-3 hover:border-violet-500/40 hover:bg-violet-500/[0.03] transition-all duration-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 text-violet-600 dark:text-violet-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-tight">{item.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>
                      </div>
                      <div className="bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-lg font-semibold text-sm shrink-0">
                        {item.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Tabs defaultValue="pricing" className="space-y-4 w-full overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-card p-1 rounded-xl border border-border/60 h-11">
            <TabsTrigger
              value="pricing"
              className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-500/20 transition-all"
            >
              Пополнить баланс
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-500/20 transition-all"
            >
              История пополнений
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" id="pricing-section" className="space-y-5 sm:space-y-6 mt-4">
            <Pricing appliedPromo={appliedPromo} />
            <PromoCodeInput onPromoApplied={setAppliedPromo} />
          </TabsContent>

          <TabsContent value="history" className="mt-4 w-full min-w-0">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
