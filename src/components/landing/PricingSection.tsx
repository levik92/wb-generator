import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePaymentPackages } from "@/hooks/usePaymentPackages";
import { useGenerationPricing } from "@/hooks/useGenerationPricing";

export function PricingSection() {
  const navigate = useNavigate();
  const { data: packages, isLoading: packagesLoading } = usePaymentPackages();
  const { data: generationPrices, isLoading: pricesLoading } = useGenerationPricing();

  // Get pricing for calculations
  const photoPrice = generationPrices?.find(p => p.price_type === 'photo_generation')?.tokens_cost || 1;
  const descriptionPrice = generationPrices?.find(p => p.price_type === 'description_generation')?.tokens_cost || 2;

  if (packagesLoading || pricesLoading) {
    return (
      <section id="pricing" className="py-16 md:py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-wb-purple" />
          </div>
        </div>
      </section>
    );
  }

  if (!packages || packages.length === 0) {
    return null;
  }

  return (
    <section id="pricing" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-wb-purple/5 to-transparent" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-wb-purple/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-wb-purple/10 to-purple-500/10 text-wb-purple px-4 py-2 rounded-full text-xs sm:text-sm mb-6 border border-wb-purple/20">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">Без скрытых платежей</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Прозрачные тарифы</h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            <span className="sm:hidden">Платите за генерацию</span>
            <span className="hidden sm:inline">Платите только за то, что генерируете. Без абонентской платы.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {packages.map((plan, index) => {
            const isPopular = index === 1;
            const pricePerToken = plan.price / plan.tokens;
            const photoCount = Math.floor(plan.tokens / photoPrice);
            const descCount = Math.floor(plan.tokens / descriptionPrice);

            return (
              <Card 
                key={plan.id}
                className={`border-none shadow-xl hover:shadow-2xl transition-all overflow-hidden rounded-t-lg ${
                  isPopular 
                    ? 'bg-white overflow-visible relative' 
                    : index === 2 
                      ? 'bg-gradient-to-br from-white via-wb-purple/5 to-purple-50'
                      : 'bg-white'
                }`}
              >
                {isPopular && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wb-purple via-purple-500 to-pink-500 rounded-t-lg"></div>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-wb-purple to-purple-600 text-white border-none px-4 py-1 text-xs font-bold shadow-lg">
                        ПОПУЛЯРНЫЙ
                      </Badge>
                    </div>
                  </>
                )}
                
                <CardHeader className={`relative ${isPopular ? 'pt-8' : ''}`}>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-foreground mt-2">
                    {plan.price.toLocaleString('ru-RU')}₽
                  </div>
                  <CardDescription className="text-base">{plan.tokens} токенов</CardDescription>
                  <div className="text-sm text-muted-foreground mt-2">
                    <strong>{pricePerToken.toFixed(2)}₽</strong> за токен
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                      1 описание = {(pricePerToken * descriptionPrice).toFixed(2)}₽
                    </div>
                    <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                      1 изображение = {(pricePerToken * photoPrice).toFixed(2)}₽
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs sm:text-sm">1 описание =</span>
                      <span className="text-xs sm:text-sm font-medium">
                        {(pricePerToken * descriptionPrice).toFixed(2)}₽
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs sm:text-sm">1 изображение карточки =</span>
                      <span className="text-xs sm:text-sm font-medium">
                        {(pricePerToken * photoPrice).toFixed(2)}₽
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex items-center">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{photoCount} изображений карточек</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{descCount} описаний товаров</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">
                          {index === 1 ? 'Приоритетная поддержка' : 'Поддержка в чате'}
                        </span>
                      </div>
                      {index === 2 && (
                        <>
                          <div className="flex items-center">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">Персональный менеджер</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">API доступ</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-wb-purple hover:bg-wb-purple-dark" 
                    onClick={() => navigate('/auth')}
                  >
                    Выбрать план
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
