import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Stat {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface StatsSectionProps {
  stats: Stat[];
  title?: string;
}

export const StatsSection = ({ stats, title }: StatsSectionProps) => {
  return (
    <section className="py-12 sm:py-16 relative">
      <div className="container mx-auto px-4 sm:px-6">
        {title && (
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl sm:text-2xl font-bold text-white text-center mb-10"
          >
            {title}
          </motion.h2>
        )}
        
        <div className="glass-card rounded-2xl border border-white/5 p-8 sm:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="text-center"
                >
                  {Icon && (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,60%,50%)/20] to-[hsl(280,50%,45%)/20] flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-[hsl(268,70%,60%)]" />
                    </div>
                  )}
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-white/60 font-medium text-sm mb-1">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <div className="text-white/40 text-xs">
                      {stat.description}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};