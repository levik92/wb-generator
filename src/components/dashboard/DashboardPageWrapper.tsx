import { ReactNode } from "react";

interface DashboardPageWrapperProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export const DashboardPageWrapper = ({ 
  children, 
  title, 
  subtitle,
  className = "" 
}: DashboardPageWrapperProps) => {
  return (
    <div
      className={`space-y-6 animate-[fadeSlideIn_0.4s_ease-out] ${className}`}
    >
      {/* Header */}
      <div className="relative">
        <div className="animate-[fadeSlideLeft_0.5s_ease-out_0.1s_both]">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="animate-[fadeIn_0.5s_ease-out_0.2s_both]">
        {children}
      </div>
    </div>
  );
};
