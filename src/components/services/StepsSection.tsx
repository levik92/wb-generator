import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

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
}

export const StepsSection = ({ title, subtitle, steps }: StepsSectionProps) => {
  return (
    <section className="py-16 sm:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}
                
                <div className="glass-card rounded-2xl p-6 h-full border border-white/5 hover:border-white/10 transition-colors">
                  {/* Step number */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(268,70%,50%)] to-[hsl(280,60%,45%)] flex items-center justify-center text-white font-bold text-sm">
                      {step.number}
                    </div>
                    {Icon && (
                      <Icon className="w-5 h-5 text-white/40" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};