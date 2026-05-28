import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { SpotlightCard } from "@/components/landing/effects/SpotlightCard";

interface Step {
  number: string;
  title: string;
  description: string;
  icon?: LucideIcon;
}

interface StepsSectionProps {
  title: string;
  subtitle?: string;
  steps: Step[];
  eyebrow?: string;
}

export const StepsSection = ({ title, subtitle, steps, eyebrow = "Простой процесс" }: StepsSectionProps) => {
  const words = title.split(" ");
  const tail = words.slice(-2).join(" ");
  const head = words.slice(0, -2).join(" ");

  return (
    <section className="section-shell">
      <div className="absolute inset-0 grid-pattern opacity-[0.08]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="section-header">
          <span className="section-eyebrow">{eyebrow}</span>
          <h2 className="section-title">
            {head ? <>{head} <span className="text-aurora">{tail}</span></> : <span className="text-aurora">{title}</span>}
          </h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>

        <div className="relative max-w-6xl mx-auto">
          {steps.length === 4 && (
            <div className="hidden lg:block absolute top-[88px] left-[12.5%] right-[12.5%] h-px animated-beam pointer-events-none" />
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 ${steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3 sm:gap-4 relative`}>
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                >
                  <SpotlightCard className="glass-card rounded-3xl p-6 sm:p-7 h-full overflow-hidden">
                    <div className="absolute top-5 right-5 text-[2.75rem] font-bold leading-none bg-gradient-to-br from-white/15 to-white/[0.02] bg-clip-text text-transparent tracking-tight">
                      {step.number}
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] flex items-center justify-center shadow-lg shadow-[hsl(263,90%,40%)]/25 mb-5 relative z-10">
                      {Icon && <Icon className="w-5 h-5 text-white" />}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/55 leading-relaxed">
                      {step.description}
                    </p>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
