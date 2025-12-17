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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {packages.map((plan, index) => {
        const isPopular = index === 1; // Mark middle plan as popular
        const pricePerToken = plan.price / plan.tokens;
        const photoCount = Math.floor(plan.tokens / photoPrice);
        const descCount = Math.floor(plan.tokens / descriptionPrice);
        return <Card key={plan.id} className={isPopular ? "border-primary" : ""}>
              <CardHeader>
                {isPopular && <Badge className="w-fit mb-2 rounded-sm border-4">Популярный</Badge>}
                <CardTitle>{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {appliedPromo?.type === 'discount' ? `${Math.round(plan.price * (1 - appliedPromo.value / 100))}₽` : `${plan.price}₽`}
                  {appliedPromo?.type === 'discount' && <span className="text-lg text-muted-foreground line-through ml-2">
                      {plan.price}₽
                    </span>}
                </div>
                <CardDescription>
                  {appliedPromo?.type === 'tokens' ? `${plan.tokens + appliedPromo.value} токенов (+${appliedPromo.value} бонусных)` : `${plan.tokens} токенов`}
                </CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>{pricePerToken.toFixed(2)}₽</strong> за токен
                </div>
                <div className="mt-3 space-y-2">
                  <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-md">
                    1 описание = {(pricePerToken * descriptionPrice).toFixed(2)}₽
                  </div>
                  <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-md">
                    1 изображение = {(pricePerToken * photoPrice).toFixed(2)}₽
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-sm">{plan.tokens} токенов ({pricePerToken.toFixed(2)}₽ за токен)</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-sm">{photoCount} изображений карточек товаров</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-sm">{descCount} описаний товаров</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-sm">Поддержка в чате</span>
                  </div>
                  {index === 2 && <>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                        <span className="text-sm">Персональный менеджер</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                        <span className="text-sm">API доступ</span>
                      </div>
                    </>}
                  {index === 1 && <div className="flex items-center">
                      <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                      <span className="text-sm">Приоритетная поддержка</span>
                    </div>}
                </div>
                <Button className="w-full" onClick={() => handlePayment(plan.name, plan.price, plan.tokens)} disabled={loading === plan.name}>
                  {loading === plan.name ? "Создание платежа..." : "Выбрать план"}
                </Button>
              </CardContent>
            </Card>;
      })}
      </div>
    </div>;
}