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
        className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-4 sm:p-6"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-violet-700 dark:text-violet-300 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Ваш баланс
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent leading-none tabular-nums">
                  {balance}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">токенов</span>
              </div>

              {/* Capacity hint — conversion-driver */}
              {!pricesLoading && photoPrice > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] sm:text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Images className="h-3 w-3 text-violet-500/80" />
                    ≈ <span className="font-semibold text-foreground">{Math.floor(balance / photoPrice)}</span> изображений
                  </span>
                  {descPrice > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3 w-3 text-violet-500/80" />
                      ≈ <span className="font-semibold text-foreground">{Math.floor(balance / descPrice)}</span> описаний
                    </span>
                  )}
                  {videoPrice > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Video className="h-3 w-3 text-violet-500/80" />
                      ≈ <span className="font-semibold text-foreground">{Math.floor(balance / videoPrice)}</span> видео
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-auto shrink-0">
            <Button
              onClick={() => {
                const pricingElement = document.getElementById('pricing-section');
                if (pricingElement) pricingElement.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-10 rounded-lg px-4 sm:px-5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/30 w-full sm:w-auto gap-2 font-medium"
            >
              <Wallet className="h-4 w-4" />
              Пополнить баланс
            </Button>
            <p className="text-[10px] text-center sm:text-right text-muted-foreground">
              Безопасная оплата · СБП · карта
            </p>
          </div>
        </div>
      </motion.div>


      {/* Generation Costs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-border/60 bg-card w-full overflow-hidden rounded-2xl">
          <CardHeader className="px-4 sm:px-5 pt-4 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
                <Coins className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base font-semibold leading-tight">Стоимость генерации</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Указано в токенах за операцию</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 pt-0">
            {pricesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-7 h-7 rounded-full border-[2.5px] border-violet-500/30 border-t-violet-500 animate-[spin_0.7s_linear_infinite]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {costItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="group bg-muted/30 rounded-xl p-2.5 sm:p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-tight truncate">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.sub}</div>
                      </div>
                      <div className="text-muted-foreground/90 font-semibold text-sm tabular-nums shrink-0 px-1.5">
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
