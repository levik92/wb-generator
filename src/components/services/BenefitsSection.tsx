import { motion } from "framer-motion";
import { 
  Check, 
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
  LucideIcon
} from "lucide-react";

interface Benefit {
  title: string;
  description: string;
  icon?: LucideIcon;
}

interface BenefitsSectionProps {
  title: string;
  subtitle: string;
  benefits: Benefit[];
  imageSrc?: string;
  imageAlt?: string;
  reversed?: boolean;
  variant?: "cards" | "list" | "grid";
}

// Map of title keywords to icons
const getIconForBenefit = (title: string): LucideIcon => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('экономия') || lowerTitle.includes('₽') || lowerTitle.includes('стоим')) return DollarSign;
  if (lowerTitle.includes('ctr') || lowerTitle.includes('конверсия') || lowerTitle.includes('рост')) return TrendingUp;
  if (lowerTitle.includes('времени') || lowerTitle.includes('минут') || lowerTitle.includes('быстр') || lowerTitle.includes('час')) return Clock;
  if (lowerTitle.includes('качеств') || lowerTitle.includes('профессиональ')) return Award;
  if (lowerTitle.includes('уникальн') || lowerTitle.includes('бренд')) return Sparkles;
  if (lowerTitle.includes('безопас') || lowerTitle.includes('гарант')) return Shield;
  if (lowerTitle.includes('клиент') || lowerTitle.includes('покупател')) return Users;
  if (lowerTitle.includes('аналитик') || lowerTitle.includes('статистик')) return BarChart;
  if (lowerTitle.includes('запуск') || lowerTitle.includes('sku')) return Rocket;
  if (lowerTitle.includes('выдел') || lowerTitle.includes('конкурент')) return Target;
  return Zap;
};

// Color schemes for icons
const iconColors = [
  "from-purple-500 to-violet-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-green-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-purple-600",
];

export const BenefitsSection = ({
  title,
  subtitle,
  benefits,
  imageSrc,
  imageAlt = "Преимущества",
  reversed = false,
  variant = "cards",
}: BenefitsSectionProps) => {
  // Determine layout based on benefits count and variant
  const useGridLayout = variant === "grid" || (variant === "cards" && benefits.length >= 4);
  const useCardLayout = variant === "cards" || benefits.length >= 3;

  return (
    <section className="py-20 sm:py-28 relative">
      {/* Transparent background to show page animation */}
      <div className="absolute inset-0 bg-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-[hsl(268,83%,55%)]/10 text-[hsl(268,83%,65%)] text-sm font-medium mb-4">
            Преимущества
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            {title}
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Grid of benefit cards */}
        {useCardLayout && (
          <div className={`grid gap-6 ${
            benefits.length === 3 ? 'md:grid-cols-3' : 
            benefits.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
            benefits.length === 5 ? 'md:grid-cols-2 lg:grid-cols-3' :
            'md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon || getIconForBenefit(benefit.title);
              const colorClass = iconColors[index % iconColors.length];
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="glass-card rounded-2xl p-8 h-full border border-white/5 hover:border-[hsl(268,83%,55%)]/30 transition-all duration-300 hover:bg-white/[0.02]">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[hsl(268,83%,75%)] transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-white/60 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* List layout (fallback for small benefit sets with image) */}
        {!useCardLayout && (
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${reversed ? 'lg:flex-row-reverse' : ''}`}>
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: reversed ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className={reversed ? 'lg:order-2' : ''}
            >
              <div className="space-y-6">
                {benefits.map((benefit, index) => {
                  const IconComponent = benefit.icon || getIconForBenefit(benefit.title);
                  const colorClass = iconColors[index % iconColors.length];
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex gap-5 group"
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-2">{benefit.title}</h3>
                        <p className="text-white/60">{benefit.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
            
            {/* Image/Visual */}
            {imageSrc && (
              <motion.div
                initial={{ opacity: 0, x: reversed ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className={`relative ${reversed ? 'lg:order-1' : ''}`}
              >
                <div className="relative rounded-2xl overflow-hidden border border-white/10">
                  <img 
                    src={imageSrc} 
                    alt={imageAlt}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240,10%,4%)/40] to-transparent" />
                </div>
                <div className="absolute -inset-4 bg-gradient-to-br from-[hsl(268,50%,40%)/10] to-transparent rounded-3xl blur-2xl -z-10" />
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};