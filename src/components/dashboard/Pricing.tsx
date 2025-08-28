import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Pricing() {
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

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { packageName, amount, tokens }
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
      price: 499,
      tokens: 50,
      description: "Идеально для начинающих",
      features: [
        "50 токенов для генерации",
        "Базовые шаблоны карточек",
        "Техническая поддержка",
      ],
      popular: false,
    },
    {
      name: "Профи",
      price: 1499,
      tokens: 200,
      description: "Для активных продавцов",
      features: [
        "200 токенов для генерации",
        "Расширенные шаблоны",
        "Приоритетная поддержка",
        "Аналитика использования",
      ],
      popular: true,
    },
    {
      name: "Бизнес",
      price: 5999,
      tokens: 1000,
      description: "Для крупного бизнеса",
      features: [
        "1000 токенов для генерации",
        "Все доступные шаблоны",
        "Персональный менеджер",
        "Расширенная аналитика",
        "API доступ",
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
              <div className="text-3xl font-bold">{plan.price}₽</div>
              <CardDescription>{plan.tokens} токенов</CardDescription>
              <div className="text-sm text-muted-foreground mt-2">
                <strong>{(plan.price / plan.tokens).toFixed(2)}₽</strong> за токен
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