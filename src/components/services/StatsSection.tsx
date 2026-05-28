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
    <section className="py-10 sm:py-14 relative">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {title && (
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl sm:text-2xl font-bold text-white text-center mb-8"
          >
            {title}
          </motion.h2>
        )}

        <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="text-center sm:text-left"
                >
                  {Icon && (
                    <Icon className="w-4 h-4 text-[hsl(263,90%,75%)] mb-2.5 mx-auto sm:mx-0" />
                  )}
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-none mb-1.5 bg-gradient-to-br from-white to-[hsl(263,90%,80%)] bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-white/55 leading-snug">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <div className="text-white/40 text-xs mt-1">{stat.description}</div>
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
