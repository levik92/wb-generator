import { motion } from "framer-motion";
import { ArrowRight, Coins, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CasesPromoBlockProps {
  onNavigateToBalance: () => void;
}

export const CasesPromoBlock = ({ onNavigateToBalance }: CasesPromoBlockProps) => {
  const handleViewCases = () => {
    window.open("/cases", "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <CardContent className="p-0">
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Content */}
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Вдохновляйтесь</span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                      Посмотрите, что создают в WBGen
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                      Реальные примеры карточек товаров: до и после обработки. Узнайте, как наши клиенты 
                      увеличивают конверсию на Wildberries.
                    </p>
                  </div>

                  {/* Stats preview */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">+200%</div>
                        <div className="text-xs text-muted-foreground">Рост конверсии</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">5 000₽</div>
                        <div className="text-xs text-muted-foreground">Экономия</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[180px]">
                  <Button 
                    onClick={handleViewCases}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group"
                  >
                    Смотреть кейсы
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={onNavigateToBalance}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Пополнить токены
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
