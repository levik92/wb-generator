import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface LightningLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export const LightningLoader = ({ size = "md", text, className }: LightningLoaderProps) => {
  const sizeClasses = {
    xs: "w-5 h-5",
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        {/* Outer glow ring */}
        <motion.div
          className={`${sizeClasses[size]} rounded-full absolute inset-0`}
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)"
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Spinning conic gradient */}
        <motion.div
          className={`${sizeClasses[size]} rounded-full`}
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)) 30%, transparent 60%)",
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

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
                "drop-shadow(0 0 4px hsl(var(--primary)))",
                "drop-shadow(0 0 12px hsl(var(--primary)))",
                "drop-shadow(0 0 4px hsl(var(--primary)))",
              ],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Zap className={`${iconSizes[size]} ${className || 'text-primary fill-primary'}`} />
          </motion.div>
        </motion.div>
      </div>

      {text && (
        <motion.p
          className="text-sm text-muted-foreground"
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
          {text && <span className="text-muted-foreground">{text}</span>}
          {showPercentage && (
            <span className="text-primary font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      
      <div className="relative h-3 bg-secondary rounded-full overflow-hidden border border-border/50">
        {/* Background glow */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10"
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
          className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary rounded-full relative"
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
                "drop-shadow(0 0 2px hsl(var(--primary)))",
                "drop-shadow(0 0 8px hsl(var(--primary)))",
                "drop-shadow(0 0 2px hsl(var(--primary)))",
              ],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Zap className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
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
          <Zap className="w-5 h-5 text-primary fill-primary" />
        </motion.div>
        <motion.span
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Генерируем описание...
        </motion.span>
      </div>

      <div className="relative h-2 bg-secondary rounded-full overflow-hidden border border-border/50">
        <motion.div
          className="absolute inset-0 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
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
            <Zap className="w-3 h-3 text-primary/70 fill-primary/70" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Global page loader - Supabase-style lightning animation
export const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative">
        {/* Multiple expanding rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary/30"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{
              scale: [0.8, 1.5, 2],
              opacity: [0.8, 0.4, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
        
        {/* Center spinning gradient */}
        <motion.div
          className="relative w-16 h-16 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div 
            className="w-12 h-12 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)) 30%, transparent 60%)",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};
