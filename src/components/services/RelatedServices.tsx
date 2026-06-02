import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";

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
}

export const RelatedServices = ({ 
  title = "Другие возможности", 
  services,
  currentPath
}: RelatedServicesProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Filter out current page
  const filteredServices = services.filter(s => s.href !== currentPath);

  if (filteredServices.length === 0) return null;

  return (
    <section ref={ref} className="py-16 sm:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {title}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {filteredServices.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                to={service.href}
                className="block glass-card rounded-2xl p-6 group hover:border-white/20 transition-all duration-300 h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <service.icon className="w-6 h-6 text-white" />
                  </div>
                  {service.isComingSoon && (
                    <span className="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-xs text-amber-400">
                      Скоро
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[hsl(268,83%,65%)] transition-colors">
                  {service.title}
                </h3>
                <p className="text-white/50 text-sm mb-4">{service.description}</p>
                <div className="flex items-center text-[hsl(268,83%,65%)] text-sm font-medium group-hover:gap-2 transition-all">
                  Подробнее
                  <ArrowRight className="ml-1 w-4 h-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
