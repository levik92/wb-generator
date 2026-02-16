import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  glowColor?: "purple" | "blue" | "green" | "orange";
  delay?: number;
}

export const GlassCard = ({ 
  children, 
  className = "",
  hover = true,
  glow = false,
  glowColor = "purple",
  delay = 0
}: GlassCardProps) => {
  const glowColors = {
    purple: "from-primary/20 to-primary/5",
    blue: "from-blue-500/20 to-blue-500/5",
    green: "from-emerald-500/20 to-emerald-500/5",
    orange: "from-orange-500/20 to-orange-500/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-card/80 backdrop-blur-xl",
        "border border-border/50",
        hover && "transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
        className
      )}
    >
      {/* Glow effect */}
      {glow && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-30",
          glowColors[glowColor]
        )} />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

// Smaller stat card with icon
interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

export const StatCard = ({ 
  icon, 
  label, 
  value, 
  trend, 
  trendUp,
  delay = 0 
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="relative p-4 rounded-xl bg-background border border-border/30 hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
        {trend && (
          <div className={cn(
            "px-2 py-1 rounded-md text-xs font-medium",
            trendUp 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-red-500/10 text-red-500"
          )}>
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
};
