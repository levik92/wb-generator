import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MessageCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePaymentPackages } from "@/hooks/usePaymentPackages";
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
interface PricingProps {
  appliedPromo?: PromoCodeInfo | null;
}
export default function Pricing({
  appliedPromo
}: PricingProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const {
    data: packages,
    isLoading: packagesLoading
  } = usePaymentPackages();
  const {
    data: generationPrices,
    isLoading: pricesLoading
  } = useGenerationPricing();

  // Get pricing for calculations
  const photoPrice = generationPrices?.find(p => p.price_type === 'photo_generation')?.tokens_cost || 1;
  const descriptionPrice = generationPrices?.find(p => p.price_type === 'description_generation')?.tokens_cost || 2;
  const handlePayment = async (packageName: string, amount: number, tokens: number) => {
    try {
      setLoading(packageName);
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      // Calculate final amount and tokens with promo
      let finalAmount = amount;
      let finalTokens = tokens;
      if (appliedPromo) {
        if (appliedPromo.type === 'discount') {
          finalAmount = Math.round(amount * (1 - appliedPromo.value / 100));
        } else if (appliedPromo.type === 'tokens') {
          finalTokens = tokens + appliedPromo.value;
        }
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('create-payment', {
        body: {
          packageName,
          amount: finalAmount,
          tokens: finalTokens,
          promoCode: appliedPromo?.code
        }
      });
      if (error) {
        console.error('Payment creation error:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать платеж",
          variant: "destructive"
        });
        return;
      }

      // Redirect to payment URL
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при создании платежа",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };
  if (packagesLoading || pricesLoading) {
    return <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (!packages || packages.length === 0) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">Тарифные планы временно недоступны</p>
      </div>;
  }
  return <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Тарифные планы</h2>
        <p className="text-muted-foreground">
          Выберите подходящий пакет токенов
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" style={{ color: '#9333ea' }} />
            <span className="text-sm leading-relaxed text-muted-foreground">
              Если платёж не создаётся или возникает ошибка — обратитесь в поддержку. Мы создадим платёж для вас вручную и поможем пополнить баланс.
            </span>
          </div>

          <Button
            size="sm"
            className="shrink-0 gap-2 bg-primary/20 hover:bg-primary/30 text-primary border-0 w-full sm:w-auto"
            onClick={() => window.open('https://t.me/wbgen_support', '_blank')}
          >
            <MessageCircle className="h-4 w-4" />
            Поддержка
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {packages.map((plan) => {
        const isPopular = plan.is_popular;
        const pricePerToken = plan.price / plan.tokens;
        const photoCount = Math.floor(plan.tokens / photoPrice);
        const descCount = Math.floor(plan.tokens / descriptionPrice);
        return <Card key={plan.id} className={isPopular ? "border-primary relative" : ""}>
              <CardHeader className="pb-4">
                {isPopular && <Badge className="w-fit mb-2 rounded-sm border-4">Популярный</Badge>}
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="text-2xl lg:text-3xl font-bold">
                  {appliedPromo?.type === 'discount' ? `${Math.round(plan.price * (1 - appliedPromo.value / 100))}₽` : `${plan.price}₽`}
                  {appliedPromo?.type === 'discount' && <span className="text-base text-muted-foreground line-through ml-2">
                      {plan.price}₽
                    </span>}
                </div>
                <CardDescription className="text-sm">
                  {appliedPromo?.type === 'tokens' ? `${plan.tokens + appliedPromo.value} токенов (+${appliedPromo.value} бонусных)` : `${plan.tokens} токенов`}
                </CardDescription>
                <div className="text-xs text-muted-foreground mt-1">
                  <strong>{pricePerToken.toFixed(2)}₽</strong> за токен
                </div>
                <div className="mt-2 space-y-1">
                  <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1.5 rounded-md">
                    1 описание = {(pricePerToken * descriptionPrice).toFixed(2)}₽
                  </div>
                  <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1.5 rounded-md">
                    1 фото = {(pricePerToken * photoPrice).toFixed(2)}₽
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-xs">{photoCount} фото карточек</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-xs">{descCount} описаний</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-xs">Поддержка в чате</span>
                  </div>
                </div>
                <Button className="w-full" size="sm" onClick={() => handlePayment(plan.name, plan.price, plan.tokens)} disabled={loading === plan.name}>
                  {loading === plan.name ? "Создание..." : "Выбрать"}
                </Button>
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Individual tariff block - subtle design */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-6 px-6">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Индивидуальный тариф
              </h3>
              <p className="text-sm text-muted-foreground">
                Нужен большой объём токенов или особые условия сотрудничества? 
                Свяжитесь с нами — подберём оптимальное решение для вашего бизнеса.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                  Персональные условия
                </span>
                <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                  Приоритетная поддержка
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={() => window.open('https://t.me/wbgen_support', '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              Связаться с нами
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
}