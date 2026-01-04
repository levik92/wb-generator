import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface LightningLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const LightningLoader = ({ size = "md", text }: LightningLoaderProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        {/* Outer glow ring */}
        <motion.div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 absolute inset-0`}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Inner rotating ring */}
        <motion.div
          className={`${sizeClasses[size]} rounded-full border-2 border-transparent`}
          style={{
            background: "linear-gradient(135deg, transparent 0%, transparent 100%)",
            borderImage: "linear-gradient(135deg, hsl(268, 83%, 65%), hsl(280, 90%, 70%), hsl(220, 100%, 60%)) 1",
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div 
            className={`${sizeClasses[size]} rounded-full`}
            style={{
              background: "conic-gradient(from 0deg, transparent, hsl(268, 83%, 65%), transparent)",
            }}
          />
        </motion.div>

        {/* Center lightning icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{
              filter: [
                "drop-shadow(0 0 4px hsl(268, 83%, 65%))",
                "drop-shadow(0 0 12px hsl(268, 83%, 65%))",
                "drop-shadow(0 0 4px hsl(268, 83%, 65%))",
              ],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Zap className={`${iconSizes[size]} text-purple-400 fill-purple-400`} />
          </motion.div>
        </motion.div>
      </div>

      {text && (
        <motion.p
          className="text-sm text-white/60"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

// Progress bar with lightning animation
interface LightningProgressProps {
  progress: number;
  showPercentage?: boolean;
  text?: string;
}

export const LightningProgress = ({ progress, showPercentage = true, text }: LightningProgressProps) => {
  return (
    <div className="w-full space-y-2">
      {(text || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {text && <span className="text-white/70">{text}</span>}
          {showPercentage && (
            <span className="text-purple-400 font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      
      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
        {/* Background glow */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Progress fill */}
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-400 rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.5,
            }}
          />
          
          {/* Lightning icon at the end */}
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
            animate={{
              scale: [1, 1.2, 1],
              filter: [
                "drop-shadow(0 0 2px hsl(268, 83%, 65%))",
                "drop-shadow(0 0 8px hsl(268, 83%, 65%))",
                "drop-shadow(0 0 2px hsl(268, 83%, 65%))",
              ],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Zap className="w-4 h-4 text-white fill-white" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

// Description generation loading bar
interface DescriptionLoadingBarProps {
  isLoading: boolean;
}

export const DescriptionLoadingBar = ({ isLoading }: DescriptionLoadingBarProps) => {
  if (!isLoading) return null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Zap className="w-5 h-5 text-purple-400 fill-purple-400" />
        </motion.div>
        <motion.span
          className="text-sm text-white/70"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Генерируем описание...
        </motion.span>
      </div>

      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className="absolute inset-0 h-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        
        {/* Multiple lightning bolts moving */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 -translate-y-1/2"
            animate={{ x: ["-10%", "110%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5,
            }}
          >
            <Zap className="w-3 h-3 text-purple-300 fill-purple-300" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
