import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { LucideIcon } from "lucide-react";
import { SpotlightCard } from "@/components/landing/effects/SpotlightCard";

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
  eyebrow?: string;
}

export const ServiceFeatures = ({ title, subtitle, features, eyebrow = "Возможности" }: ServiceFeaturesProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Split title on last 2-3 words to apply aurora gradient
  const words = title.split(" ");
  const tail = words.slice(-2).join(" ");
  const head = words.slice(0, -2).join(" ");

  return (
    <section ref={ref} className="section-shell">
      <div className="spotlight-violet" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <span className="section-eyebrow">{eyebrow}</span>
          <h2 className="section-title">
            {head ? <>{head} <span className="text-aurora">{tail}</span></> : <span className="text-aurora">{title}</span>}
          </h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.05 }}
            >
              <SpotlightCard
                magnetic
                spotlightColor="hsl(263 90% 60% / 0.13)"
                className="glass-card rounded-3xl p-6 sm:p-7 h-full overflow-hidden"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-[hsl(263,90%,40%)]/30">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[13px] sm:text-sm text-white/55 leading-relaxed">
                  {feature.description}
                </p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
