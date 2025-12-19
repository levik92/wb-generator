import { useState } from "react";
import { useSubscriptionPackages, SubscriptionPackage } from "@/hooks/useSubscription";
import { useGenerationPricing } from "@/hooks/useGenerationPricing";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Crown, Download, Zap, MessageCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SubscriptionPlansProps {
  onSuccess?: () => void;
}

export function SubscriptionPlans({ onSuccess }: SubscriptionPlansProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { data: packages, isLoading: packagesLoading } = useSubscriptionPackages();
  const { data: generationPrices, isLoading: pricesLoading } = useGenerationPricing();

  const photoPrice = generationPrices?.find(p => p.price_type === 'photo_generation')?.tokens_cost || 1;
  const descriptionPrice = generationPrices?.find(p => p.price_type === 'description_generation')?.tokens_cost || 2;

  const handleSubscribe = async (packageId: string, packageName: string, price: number) => {
    try {
      setLoading(packageId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
        body: {
          packageId,
          packageName,
          amount: price
        }
      });

      if (error) {
        console.error('Subscription payment error:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать платеж за подписку",
          variant: "destructive"
        });
        return;
      }

      if (data?.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при оформлении подписки",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  if (packagesLoading || pricesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Тарифные планы временно недоступны</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Тарифы подписки</h2>
        <p className="text-muted-foreground">
          Выберите подходящий план подписки
        </p>
      </div>

      {/* Support notice */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm leading-relaxed text-muted-foreground">
              Если возникла проблема с оплатой — обратитесь в поддержку
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-2 w-full sm:w-auto"
            onClick={() => window.open('https://t.me/wbgen_support', '_blank')}
          >
            <MessageCircle className="h-4 w-4" />
            Поддержка
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {packages.map((plan: SubscriptionPackage, index: number) => {
          const isPopular = index === 1;
          const features = plan.features || {};
          const photoCount = Math.floor(plan.tokens_per_month / photoPrice);
          const descCount = Math.floor(plan.tokens_per_month / descriptionPrice);
          const pricePerToken = plan.price / plan.tokens_per_month;

          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                isPopular ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border'
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
              )}
              
              <CardHeader className={isPopular ? 'pt-6' : ''}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {isPopular && (
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="h-3 w-3 mr-1" />
                      Популярный
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price.toLocaleString('ru-RU')}</span>
                    <span className="text-xl text-muted-foreground">₽</span>
                  </div>
                  <CardDescription className="mt-1">
                    {plan.duration_days === 30 ? 'в месяц' : `на ${plan.duration_days} дней`}
                  </CardDescription>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <div className="text-sm font-medium">{plan.tokens_per_month} токенов</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {pricePerToken.toFixed(2)}₽ за токен
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>~{photoCount} изображений карточек</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>~{descCount} описаний товаров</span>
                  </div>
                  {plan.can_download && (
                    <div className="flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Скачивание без водяного знака</span>
                    </div>
                  )}
                  {(features as any).priority_support && (
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>Приоритетная поддержка</span>
                    </div>
                  )}
                  {(features as any).personal_manager && (
                    <div className="flex items-center gap-2 text-sm">
                      <Crown className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Персональный менеджер</span>
                    </div>
                  )}
                  {(features as any).api_access && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>API доступ</span>
                    </div>
                  )}
                </div>

                <Button 
                  className={`w-full ${isPopular ? 'bg-primary hover:bg-primary/90' : ''}`}
                  variant={isPopular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.id, plan.name, plan.price)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Оформление...
                    </>
                  ) : (
                    'Оформить подписку'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
