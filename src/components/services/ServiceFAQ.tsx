import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface ServiceFAQProps {
  title?: string;
  subtitle?: string;
  items: FAQItem[];
  schemaType?: string;
  eyebrow?: string;
}

export const ServiceFAQ = ({
  title = "Часто задаваемые вопросы",
  subtitle,
  items,
  schemaType = "FAQPage",
  eyebrow = "FAQ",
}: ServiceFAQProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": schemaType,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const words = title.split(" ");
  const tail = words.slice(-2).join(" ");
  const head = words.slice(0, -2).join(" ");

  return (
    <section ref={ref} className="section-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 sm:p-6 text-left group"
              >
                <span className="font-semibold text-white pr-4 group-hover:text-[hsl(263,90%,80%)] transition-colors">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-white/50 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180 text-[hsl(263,90%,75%)]" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-white/65 leading-relaxed border-t border-white/10 pt-4">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
