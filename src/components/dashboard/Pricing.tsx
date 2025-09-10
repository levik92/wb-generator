import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

export default function Pricing({ appliedPromo }: PricingProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePayment = async (packageName: string, amount: number, tokens: number) => {
    try {
      setLoading(packageName);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive",
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

      const { data, error } = await supabase.functions.invoke('create-payment', {
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
          variant: "destructive",
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
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: "Стартовый",
      price: 990,
      tokens: 80,
      description: "Для начинающих",
      features: [
        "80 токенов (12,38₽ за токен)",
        "8 изображений карточек товаров",
        "80 описаний товаров",
        "1 описание = 12,38₽",
        "1 изображение карточки = 123,80₽",
        "Поддержка в чате"
      ],
      popular: false,
    },
    {
      name: "Профи",
      price: 2990,
      tokens: 250,
      description: "Для активных продавцов",
      features: [
        "250 токенов (11,96₽ за токен)",
        "25 изображений карточек товаров",
        "250 описаний товаров",
        "1 описание = 11,96₽",
        "1 изображение карточки = 119,60₽",
        "Приоритетная поддержка"
      ],
      popular: true,
    },
    {
      name: "Бизнес",
      price: 9990,
      tokens: 850,
      description: "Для крупного бизнеса",
      features: [
        "850 токенов (11,75₽ за токен)",
        "85 изображений карточек товаров",
        "850 описаний товаров",
        "1 описание = 11,75₽",
        "1 изображение карточки = 117,50₽",
        "Персональный менеджер",
        "API доступ"
      ],
      popular: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Тарифные планы</h2>
        <p className="text-muted-foreground">
          Выберите подходящий пакет токенов
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.popular ? "border-primary" : ""}>
            <CardHeader>
              {plan.popular && (
                <Badge className="w-fit mb-2">Популярный</Badge>
              )}
              <CardTitle>{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                {appliedPromo?.type === 'discount' 
                  ? `${Math.round(plan.price * (1 - appliedPromo.value / 100))}₽` 
                  : `${plan.price}₽`
                }
                {appliedPromo?.type === 'discount' && (
                  <span className="text-lg text-muted-foreground line-through ml-2">
                    {plan.price}₽
                  </span>
                )}
              </div>
              <CardDescription>
                {appliedPromo?.type === 'tokens' 
                  ? `${plan.tokens + appliedPromo.value} токенов (+${appliedPromo.value} бонусных)`
                  : `${plan.tokens} токенов`
                }
              </CardDescription>
              <div className="text-sm text-muted-foreground mt-2">
                <strong>{(plan.price / plan.tokens).toFixed(2)}₽</strong> за токен
              </div>
              <div className="mt-3 space-y-2">
                <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-lg">
                  1 описание = {(plan.price / plan.tokens * 1).toFixed(2)}₽
                </div>
                <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-lg">
                  1 изображение = {(plan.price / plan.tokens * 10).toFixed(2)}₽
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <Button 
                className="w-full" 
                onClick={() => handlePayment(plan.name, plan.price, plan.tokens)}
                disabled={loading === plan.name}
              >
                {loading === plan.name ? "Создание платежа..." : "Выбрать план"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}