import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Image, FileText, History, CreditCard, Gift, Settings, Tags, Newspaper, GraduationCap, Video, Moon, Sun, X, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}
interface MobileSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Profile;
  hasUnreadNews?: boolean;
}
const MENU_WIDTH = 280;
const SWIPE_THRESHOLD = 100;
export const MobileSideMenu = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  profile,
  hasUnreadNews = false
}: MobileSideMenuProps) => {
  const {
    theme,
    setTheme,
    resolvedTheme
  } = useTheme();
  const isDark = resolvedTheme === "dark";
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItems = [{
    id: 'cards',
    label: 'Генерация карточек',
    icon: Image
  }, {
    id: 'video',
    label: 'Видеообложки',
    icon: Video
  }, {
    id: 'description',
    label: 'Генерация описаний',
    icon: FileText
  }, {
    id: 'labels',
    label: 'Генератор этикеток',
    icon: Tags
  }, {
    id: 'history',
    label: 'История',
    icon: History
  }, {
    id: 'pricing',
    label: 'Баланс',
    icon: CreditCard
  }, {
    id: 'news',
    label: 'Новости',
    icon: Newspaper,
    badge: hasUnreadNews ? 'Новое' : undefined,
    badgeColor: 'bg-wb-purple text-white'
  }, {
    id: 'learning',
    label: 'Обучение',
    icon: GraduationCap
  }, {
    id: 'bonuses',
    label: 'Бонусы',
    icon: Gift
  }, {
    id: 'settings',
    label: 'Настройки',
    icon: Settings
  }];
  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) {
      onClose();
    }
  };

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  return <AnimatePresence>
      {isOpen && <>
          {/* Backdrop */}
          <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.2
      }} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} />
          
          {/* Menu */}
          <motion.div ref={menuRef} initial={{
        x: -MENU_WIDTH
      }} animate={{
        x: 0
      }} exit={{
        x: -MENU_WIDTH
      }} transition={{
        type: "spring",
        damping: 30,
        stiffness: 300
      }} drag="x" dragConstraints={{
        left: -MENU_WIDTH,
        right: 0
      }} dragElastic={0.1} onDragEnd={handleDragEnd} className="fixed left-0 top-0 bottom-0 z-50 w-[280px] md:hidden" style={{
        touchAction: 'pan-y'
      }}>
            {/* Glass effect background */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-r border-border/50 shadow-2xl" />
            
            <div className="relative flex flex-col h-full pb-20">
              {/* Header */}
              <div className="p-5 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold">WB Генератор</span>
                  </div>
                  <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                
                {/* Token Balance */}
                <div className="bg-secondary/50 rounded-xl p-3 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Токены</span>
                    <Badge variant="secondary" className="font-semibold bg-background/50 border border-border/50">
                      {profile.tokens_balance}
                    </Badge>
                  </div>
                  <Button size="sm" onClick={() => handleTabChange('pricing')} className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 rounded-lg">
                    Пополнить
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto py-3 px-3">
                <div className="space-y-1">
                  {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return <div key={item.id} className="relative">
                        <button className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                            transition-all duration-200
                            ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'}
                          `} onClick={() => handleTabChange(item.id)}>
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center
                            ${isActive ? 'bg-primary/15' : 'bg-muted/30'}
                            transition-colors duration-200
                          `}>
                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.badge && <Badge className={`ml-auto text-[10px] px-1.5 py-0.5 ${item.badgeColor || 'bg-muted text-muted-foreground'}`}>
                              {item.badge}
                            </Badge>}
                        </button>
                      </div>;
              })}
                </div>
              </nav>

              {/* Bottom section - Theme Toggle */}
              <div className="shrink-0 p-3 border-t border-border/50">
                <button 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors" 
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-medium">
                    {isDark ? "Светлая тема" : "Тёмная тема"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </>}
    </AnimatePresence>;
};