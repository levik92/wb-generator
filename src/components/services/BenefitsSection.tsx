import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Benefit {
  title: string;
  description: string;
}

interface BenefitsSectionProps {
  title: string;
  subtitle: string;
  benefits: Benefit[];
  imageSrc?: string;
  imageAlt?: string;
  reversed?: boolean;
}

export const BenefitsSection = ({
  title,
  subtitle,
  benefits,
  imageSrc,
  imageAlt = "Преимущества",
  reversed = false,
}: BenefitsSectionProps) => {
  return (
    <section className="py-16 sm:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${reversed ? 'lg:flex-row-reverse' : ''}`}>
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: reversed ? 30 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={reversed ? 'lg:order-2' : ''}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              {title}
            </h2>
            <p className="text-white/60 text-lg mb-8">
              {subtitle}
            </p>
            
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(268,70%,50%)] to-[hsl(280,60%,45%)] flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-white/50 text-sm">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
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
      </div>
    </section>
  );
};