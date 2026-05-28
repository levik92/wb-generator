import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";
import { SpotlightCard } from "@/components/landing/effects/SpotlightCard";

interface RelatedService {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  isComingSoon?: boolean;
}

interface RelatedServicesProps {
  title?: string;
  services: RelatedService[];
  currentPath?: string;
  eyebrow?: string;
}

export const RelatedServices = ({
  title = "Другие возможности",
  services,
  currentPath,
  eyebrow = "Ещё в WBGen",
}: RelatedServicesProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const filtered = services.filter((s) => s.href !== currentPath);
  if (filtered.length === 0) return null;

  const words = title.split(" ");
  const tail = words.slice(-2).join(" ");
  const head = words.slice(0, -2).join(" ");

  return (
    <section ref={ref} className="section-shell">
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
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {filtered.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <Link to={service.href} className="block h-full group">
                <SpotlightCard className="glass-card rounded-3xl p-6 sm:p-7 h-full overflow-hidden">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] flex items-center justify-center shadow-lg shadow-[hsl(263,90%,40%)]/25 group-hover:scale-105 transition-transform duration-300">
                      <service.icon className="w-5 h-5 text-white" />
                    </div>
                    {service.isComingSoon && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300">
                        Скоро
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight">
                    {service.title}
                  </h3>
                  <p className="text-[13px] sm:text-sm text-white/55 mb-5 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="flex items-center text-[hsl(263,90%,80%)] text-sm font-medium gap-1.5 group-hover:gap-2.5 transition-all">
                    Подробнее
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </SpotlightCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
