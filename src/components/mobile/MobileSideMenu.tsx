import { useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Image, FileText, History, CreditCard, Gift, Settings, Tags, Newspaper, GraduationCap, Video, X, ChevronRight, Sparkles, ArrowUpRight } from "lucide-react";

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

const MENU_WIDTH = 296;
const SWIPE_THRESHOLD = 100;

export const MobileSideMenu = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  profile,
  hasUnreadNews = false,
}: MobileSideMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const sections: { title?: string; items: Array<{ id: string; label: string; icon: any; badge?: string; badgeColor?: string }> }[] = [
    {
      title: "Создание",
      items: [
        { id: 'cards', label: 'Карточки товара', icon: Image },
        { id: 'video', label: 'Видеообложки', icon: Video },
        { id: 'description', label: 'Описания', icon: FileText },
        { id: 'labels', label: 'Этикетки', icon: Tags },
      ],
    },
    {
      title: "Кабинет",
      items: [
        { id: 'history', label: 'История', icon: History },
        { id: 'pricing', label: 'Баланс и тарифы', icon: CreditCard },
        { id: 'bonuses', label: 'Бонусы', icon: Gift },
      ],
    },
    {
      title: "Информация",
      items: [
        { id: 'news', label: 'Новости', icon: Newspaper, badge: hasUnreadNews ? 'Новое' : undefined, badgeColor: 'bg-violet-500 text-white' },
        { id: 'learning', label: 'Обучение', icon: GraduationCap },
        { id: 'settings', label: 'Настройки', icon: Settings },
      ],
    },
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const initials = (profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            ref={menuRef}
            initial={{ x: -MENU_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -MENU_WIDTH }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="x"
            dragConstraints={{ left: -MENU_WIDTH, right: 0 }}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
            className="fixed left-0 top-0 bottom-0 z-50 w-[296px] md:hidden"
            style={{ touchAction: 'pan-y' }}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-card border-r border-border/60 shadow-2xl shadow-black/20" />
            {/* Subtle accent glow */}
            <span aria-hidden className="pointer-events-none absolute -top-20 -left-12 w-56 h-56 rounded-full bg-violet-500/[0.08] blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute bottom-32 -left-16 w-48 h-48 rounded-full bg-fuchsia-500/[0.05] blur-3xl" />

            <div className="relative flex flex-col h-full">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                    <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[15px] font-bold tracking-tight">WB Генератор</span>
                    <span className="text-[10px] text-muted-foreground font-medium">AI для маркетплейсов</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-violet-500/10 hover:text-violet-600 active:scale-95 transition-all"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile + balance card */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => handleTabChange('settings')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-violet-500/[0.06] active:scale-[0.99] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-sm flex items-center justify-center ring-2 ring-violet-500/20 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{profile.full_name || 'Пользователь'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>

                <div className="mt-2 relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-card to-fuchsia-500/[0.06] p-3">
                  <span aria-hidden className="pointer-events-none absolute -top-8 -right-6 w-24 h-24 rounded-full bg-violet-500/15 blur-2xl" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        <Sparkles className="w-3 h-3" />
                        Баланс токенов
                      </div>
                      <p className="text-xl font-bold tabular-nums leading-tight mt-0.5">
                        {(profile.tokens_balance ?? 0).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTabChange('pricing')}
                      className="h-9 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm shadow-violet-500/25 text-xs font-medium px-3 shrink-0"
                    >
                      Пополнить
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto px-3 pb-6 [scrollbar-width:thin]">
                {sections.map((section, sIdx) => (
                  <div key={sIdx} className={sIdx === 0 ? '' : 'mt-4'}>
                    {section.title && (
                      <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {section.title}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`
                              relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left
                              transition-all duration-200 active:scale-[0.98]
                              ${isActive
                                ? 'bg-violet-500/10 text-violet-700 dark:text-violet-200'
                                : 'text-foreground/85 hover:bg-violet-500/[0.05] hover:text-foreground'}
                            `}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="sidemenu-active-bar"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-violet-500 to-purple-600"
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                              />
                            )}
                            <div className={`
                              w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                              ${isActive
                                ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/25'
                                : 'bg-muted/40 border border-transparent'}
                              transition-all duration-200
                            `}>
                              <Icon className={`w-4 h-4 ${isActive ? 'text-violet-600 dark:text-violet-300' : 'text-muted-foreground'}`} strokeWidth={isActive ? 2.4 : 2} />
                            </div>
                            <span className="text-[13.5px] font-medium flex-1 truncate">{item.label}</span>
                            {item.badge && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${item.badgeColor || 'bg-muted text-muted-foreground'}`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
