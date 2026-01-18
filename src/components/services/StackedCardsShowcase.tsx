import { motion } from "framer-motion";

interface StackedCardsShowcaseProps {
  images?: string[];
  className?: string;
}

export const StackedCardsShowcase = ({ 
  images = [],
  className = "" 
}: StackedCardsShowcaseProps) => {
  // Default placeholder images if none provided
  const cardImages = images.length >= 3 ? images : [
    "/lovable-uploads/case-after-01.jpg",
    "/lovable-uploads/case-after-02.jpg",
    "/lovable-uploads/case-after-03.jpg",
  ];

  return (
    <div className={`relative w-full h-[500px] sm:h-[600px] ${className}`}>
      {/* Back card (leftmost, darkest) */}
      <motion.div
        initial={{ opacity: 0, x: -50, rotate: -15 }}
        whileInView={{ opacity: 1, x: 0, rotate: -12 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.1 }}
        whileHover={{ rotate: -15, scale: 1.02 }}
        className="absolute left-[5%] sm:left-[10%] top-[10%] w-[220px] sm:w-[280px] h-[300px] sm:h-[380px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer z-10"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
        <img 
          src={cardImages[0]} 
          alt="Card example 1"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/30" />
      </motion.div>

      {/* Middle card */}
      <motion.div
        initial={{ opacity: 0, x: -30, rotate: -8 }}
        whileInView={{ opacity: 1, x: 0, rotate: -5 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.25 }}
        whileHover={{ rotate: -8, scale: 1.02, y: -5 }}
        className="absolute left-[15%] sm:left-[22%] top-[5%] w-[220px] sm:w-[280px] h-[300px] sm:h-[380px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer z-20"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-700" />
        <img 
          src={cardImages[1]} 
          alt="Card example 2"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-black/20" />
      </motion.div>

      {/* Front card (rightmost, brightest) */}
      <motion.div
        initial={{ opacity: 0, x: -10, rotate: 0 }}
        whileInView={{ opacity: 1, x: 0, rotate: 3 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4 }}
        whileHover={{ rotate: 6, scale: 1.05, y: -10 }}
        className="absolute left-[25%] sm:left-[35%] top-0 w-[220px] sm:w-[280px] h-[300px] sm:h-[380px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer z-30"
        style={{
          boxShadow: "0 30px 60px -15px rgba(139, 92, 246, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <img 
          src={cardImages[2]} 
          alt="Card example 3"
          className="w-full h-full object-cover"
        />
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        
        {/* Subtle shine effect */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "easeInOut"
          }}
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute -bottom-10 left-1/4 w-64 h-64 bg-[hsl(268,83%,55%)]/10 rounded-full blur-3xl -z-10" />
      <div className="absolute -top-10 right-1/4 w-48 h-48 bg-[hsl(280,90%,55%)]/10 rounded-full blur-3xl -z-10" />
    </div>
  );
};