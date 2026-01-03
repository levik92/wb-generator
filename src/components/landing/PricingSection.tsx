import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePaymentPackages } from "@/hooks/usePaymentPackages";
import { useGenerationPricing } from "@/hooks/useGenerationPricing";

export function PricingSection() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { data: packages, isLoading: packagesLoading } = usePaymentPackages();
  const { data: generationPrices, isLoading: pricesLoading } = useGenerationPricing();

  const photoPrice = generationPrices?.find(p => p.price_type === 'photo_generation')?.tokens_cost || 1;
  const descriptionPrice = generationPrices?.find(p => p.price_type === 'description_generation')?.tokens_cost || 2;

  if (packagesLoading || pricesLoading) {
    return (
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240,10%,4%)] via-[hsl(268,50%,8%)] to-[hsl(240,10%,4%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(268,83%,58%)]" />
          </div>
        </div>
      </section>
    );
  }

  if (!packages || packages.length === 0) {
    return null;
  }

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240,10%,4%)] via-[hsl(268,50%,8%)] to-[hsl(240,10%,4%)]" />
      
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-[hsl(268,83%,58%)]/10 rounded-full blur-[150px] -translate-y-1/2" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-[hsl(280,83%,58%)]/10 rounded-full blur-[100px] -translate-y-1/2" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
            <Sparkles className="w-4 h-4 text-[hsl(268,83%,58%)]" />
            Прозрачные цены
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Тарифы без скрытых платежей
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Платите только за то, что генерируете. Без абонентской платы.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((plan, index) => {
            const isPopular = index === 1;
            const isPremium = index === 2;
            const pricePerToken = plan.price / plan.tokens;
            const photoCount = Math.floor(plan.tokens / photoPrice);
            const descCount = Math.floor(plan.tokens / descriptionPrice);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className={`relative group ${isPopular ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] text-white text-xs font-bold shadow-lg shadow-[hsl(268,83%,58%)]/30">
                      <Zap className="w-3 h-3" />
                      ПОПУЛЯРНЫЙ
                    </div>
                  </div>
                )}

                <div
                  className={`relative h-full rounded-2xl overflow-hidden transition-all duration-500 ${
                    isPopular
                      ? 'bg-gradient-to-b from-[hsl(268,83%,58%)]/20 to-[hsl(268,50%,15%)] border-2 border-[hsl(268,83%,58%)]/50 shadow-2xl shadow-[hsl(268,83%,58%)]/20'
                      : isPremium
                        ? 'glass-card border border-white/10 hover:border-[hsl(268,83%,58%)]/30'
                        : 'glass-card border border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-b from-[hsl(268,83%,58%)]/5 to-transparent" />
                  </div>

                  <div className="relative p-6 sm:p-8">
                    {/* Plan name */}
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    
                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-bold text-white">
                          {plan.price.toLocaleString('ru-RU')}
                        </span>
                        <span className="text-xl text-white/50">₽</span>
                      </div>
                      <div className="text-sm text-white/40 mt-1">
                        {plan.tokens.toLocaleString('ru-RU')} токенов
                      </div>
                    </div>

                    {/* Cost per item */}
                    <div className="space-y-2 mb-6 pb-6 border-b border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">1 фото карточки</span>
                        <span className="text-white font-medium">
                          {(pricePerToken * photoPrice).toFixed(0)}₽
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">1 описание</span>
                        <span className="text-white font-medium">
                          {(pricePerToken * descriptionPrice).toFixed(0)}₽
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-sm text-white/70">
                          ~{photoCount} карточек с инфографикой
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-sm text-white/70">
                          ~{descCount} SEO-описаний
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-sm text-white/70">
                          {index === 0 ? 'Поддержка в чате' : index === 1 ? 'Приоритетная поддержка' : 'Персональный менеджер'}
                        </span>
                      </li>
                      {isPremium && (
                        <>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-[hsl(268,83%,58%)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-[hsl(268,83%,58%)]" />
                            </div>
                            <span className="text-sm text-white/70">
                              API доступ
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-[hsl(268,83%,58%)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-[hsl(268,83%,58%)]" />
                            </div>
                            <span className="text-sm text-white/70">
                              Пакетная обработка
                            </span>
                          </li>
                        </>
                      )}
                    </ul>

                    {/* CTA button */}
                    <button
                      onClick={() => navigate('/auth')}
                      className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        isPopular
                          ? 'bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] text-white hover:shadow-lg hover:shadow-[hsl(268,83%,58%)]/30 hover:-translate-y-0.5'
                          : 'bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:border-white/20'
                      }`}
                    >
                      Выбрать план
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-sm text-white/40 mt-12"
        >
          Все цены указаны без НДС. Токены не сгорают и доступны бессрочно.
        </motion.p>
      </div>
    </section>
  );
}
