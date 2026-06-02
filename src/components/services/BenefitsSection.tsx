import { motion } from "framer-motion";
import {
  TrendingUp,
  Zap,
  Target,
  Shield,
  Award,
  Clock,
  DollarSign,
  Sparkles,
  Users,
  BarChart,
  Rocket,
  LucideIcon,
} from "lucide-react";
import { SpotlightCard } from "@/components/landing/effects/SpotlightCard";

interface Benefit {
  title: string;
  description: string;
  icon?: LucideIcon;
}

interface BenefitsSectionProps {
  title: string;
  subtitle: string;
  benefits: Benefit[];
  eyebrow?: string;
}

const getIconForBenefit = (title: string): LucideIcon => {
  const t = title.toLowerCase();
  if (t.includes("экономия") || t.includes("₽") || t.includes("стоим")) return DollarSign;
  if (t.includes("ctr") || t.includes("конверсия") || t.includes("рост")) return TrendingUp;
  if (t.includes("времени") || t.includes("минут") || t.includes("быстр") || t.includes("час")) return Clock;
  if (t.includes("качеств") || t.includes("профессиональ")) return Award;
  if (t.includes("уникальн") || t.includes("бренд")) return Sparkles;
  if (t.includes("безопас") || t.includes("гарант")) return Shield;
  if (t.includes("клиент") || t.includes("покупател")) return Users;
  if (t.includes("аналитик") || t.includes("статистик")) return BarChart;
  if (t.includes("запуск") || t.includes("sku")) return Rocket;
  if (t.includes("выдел") || t.includes("конкурент")) return Target;
  return Zap;
};

export const BenefitsSection = ({ title, subtitle, benefits, eyebrow = "Преимущества" }: BenefitsSectionProps) => {
  const words = title.split(" ");
  const tail = words.slice(-2).join(" ");
  const head = words.slice(0, -2).join(" ");

  return (
    <section className="section-shell">
      <div className="spotlight-violet" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-header"
        >
          <span className="section-eyebrow">{eyebrow}</span>
          <h2 className="section-title">
            {head ? <>{head} <span className="text-aurora">{tail}</span></> : <span className="text-aurora">{title}</span>}
          </h2>
          <p className="section-subtitle">{subtitle}</p>
        </motion.div>

        <div className={`grid gap-3 sm:gap-4 max-w-6xl mx-auto ${
          benefits.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"
        }`}>
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon || getIconForBenefit(benefit.title);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
              >
                <SpotlightCard
                  magnetic
                  spotlightColor="hsl(263 90% 60% / 0.13)"
                  className="glass-card rounded-3xl p-6 sm:p-7 h-full overflow-hidden"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[hsl(263,90%,75%)]" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight">
                    {benefit.title}
                  </h3>
                  <p className="text-[13px] sm:text-sm text-white/55 leading-relaxed">
                    {benefit.description}
                  </p>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
