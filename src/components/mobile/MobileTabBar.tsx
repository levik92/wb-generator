import { useState, useEffect, useRef } from "react";
import { Image, FileText, History, Settings, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'pricing', icon: CreditCard, label: 'Баланс' },
  { id: 'description', icon: FileText, label: 'Описания' },
  { id: 'cards', icon: Image, label: 'Карточки' },
  { id: 'history', icon: History, label: 'История' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
];

export const MobileTabBar = ({ activeTab, onTabChange }: MobileTabBarProps) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (activeIndex !== -1 && tabRefs.current[activeIndex]) {
      const activeElement = tabRefs.current[activeIndex];
      if (activeElement) {
        setIndicatorStyle({
          left: activeElement.offsetLeft + activeElement.offsetWidth / 2 - 20,
          width: 40,
        });
      }
    }
  }, [activeTab]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
      
      {/* Safe area padding for iOS */}
      <div className="relative pb-safe">
        <nav className="flex items-center justify-around px-2 py-2">
          {/* Sliding indicator */}
          <motion.div
            className="absolute top-1 h-1 bg-primary rounded-full"
            animate={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          />
          
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isCenter = index === 2;
            
            return (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[index] = el)}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex flex-col items-center justify-center
                  ${isCenter ? 'w-16 h-16 -mt-4' : 'w-14 h-14'}
                  transition-all duration-200
                `}
              >
                {/* Center button special styling - no transparency */}
                {isCenter && (
                  <div className={`
                    absolute inset-0 rounded-full
                    ${isActive 
                      ? 'bg-gradient-to-br from-primary to-primary shadow-lg shadow-primary/30' 
                      : 'bg-primary'
                    }
                    transition-all duration-300
                  `} />
                )}
                
                <motion.div
                  animate={{
                    scale: isActive ? (isCenter ? 1.1 : 1.15) : 1,
                    y: isActive && !isCenter ? -2 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="relative z-10 flex flex-col items-center"
                >
                  <Icon 
                    className={`
                      ${isCenter ? 'w-6 h-6' : 'w-5 h-5'}
                      ${isActive 
                        ? isCenter ? 'text-white' : 'text-primary' 
                        : 'text-muted-foreground'
                      }
                      transition-colors duration-200
                    `}
                  />
                  {!isCenter && (
                    <span className={`
                      text-[10px] mt-1 font-medium
                      ${isActive ? 'text-primary' : 'text-muted-foreground'}
                      transition-colors duration-200
                    `}>
                      {tab.label}
                    </span>
                  )}
                </motion.div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
