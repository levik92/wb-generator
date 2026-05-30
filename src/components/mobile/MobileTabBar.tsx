import { Image, FileText, History, Video, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'description', icon: FileText, label: 'Описания' },
  { id: 'video', icon: Video, label: 'Видео' },
  { id: 'cards', icon: Image, label: 'Карточки' },
  { id: 'history', icon: History, label: 'История' },
  { id: 'pricing', icon: CreditCard, label: 'Баланс' },
];

export const MobileTabBar = ({ activeTab, onTabChange }: MobileTabBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Frosted background */}
      <div className="absolute inset-0 bg-card/85 backdrop-blur-xl border-t border-border/60" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      {/* Safe area padding for iOS */}
      <div className="relative pb-safe">
        <nav className="flex items-stretch justify-around px-1.5 pt-1.5 pb-1.5">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isCenter = index === 2;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if ('vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  onTabChange(tab.id);
                }}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex-1 flex flex-col items-center justify-center min-w-0 group"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`
                    relative flex flex-col items-center justify-center gap-0.5
                    rounded-2xl
                    ${isCenter ? 'h-14 w-14 -mt-3' : 'h-12 px-2 py-1'}
                  `}
                >
                  {/* Active background pill for regular tabs */}
                  {isActive && !isCenter && (
                    <motion.div
                      layoutId="tabbar-pill"
                      className="absolute inset-0 rounded-2xl bg-violet-500/10 border border-violet-500/20"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}

                  {/* Center button: always elevated, violet when active, neutral when not */}
                  {isCenter && (
                    <div
                      className={`
                        absolute inset-0 rounded-2xl transition-all duration-300
                        ${isActive
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/35 ring-4 ring-violet-500/15'
                          : 'bg-card border border-border/70 shadow-md shadow-black/5'
                        }
                      `}
                    />
                  )}

                  <motion.div
                    animate={{
                      y: isActive && !isCenter ? -1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="relative z-10 flex flex-col items-center gap-0.5"
                  >
                    <Icon
                      className={`
                        transition-colors duration-200
                        ${isCenter ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]'}
                        ${isActive
                          ? isCenter ? 'text-white' : 'text-violet-600 dark:text-violet-300'
                          : isCenter ? 'text-foreground/70' : 'text-muted-foreground group-active:text-foreground'
                        }
                      `}
                      strokeWidth={isActive ? 2.4 : 2}
                    />
                    {!isCenter && (
                      <span
                        className={`
                          text-[10px] leading-none font-medium transition-colors duration-200
                          ${isActive ? 'text-violet-600 dark:text-violet-300' : 'text-muted-foreground'}
                        `}
                      >
                        {tab.label}
                      </span>
                    )}
                  </motion.div>
                </motion.div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
