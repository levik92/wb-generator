import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color?: string;
}

interface ServiceFeaturesProps {
  title: string;
  subtitle?: string;
  features: Feature[];
}

export const ServiceFeatures = ({ title, subtitle, features }: ServiceFeaturesProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 sm:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-white/50 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="group relative"
            >
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[hsl(268,83%,60%)]/40 via-transparent to-[hsl(290,83%,60%)]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
              <div className="relative glass-card rounded-2xl p-6 sm:p-8 border border-white/10 group-hover:border-white/20 transition-colors duration-300 h-full">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color || 'from-[hsl(268,83%,58%)] to-[hsl(280,83%,52%)]'} flex items-center justify-center mb-5 shadow-lg shadow-[hsl(268,83%,40%)]/20 group-hover:shadow-[hsl(268,83%,60%)]/40 group-hover:scale-105 transition-all duration-300`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/50">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
