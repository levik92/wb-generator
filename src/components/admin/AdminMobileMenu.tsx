import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Zap,
  BarChart3,
  Users,
  Bot,
  Gift,
  Megaphone,
  Handshake,
  DollarSign,
  LayoutDashboard,
  FileText,
  GraduationCap,
  Headphones,
  Crosshair,
  Receipt,
  X,
} from "lucide-react";

interface AdminMobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadSupportCount?: number;
  pendingInvoicesCount?: number;
  pendingBonusesCount?: number;
}

const MENU_WIDTH = 296;
const SWIPE_THRESHOLD = 100;

export const AdminMobileMenu = ({
  activeTab,
  onTabChange,
  unreadSupportCount = 0,
  pendingInvoicesCount = 0,
  pendingBonusesCount = 0,
}: AdminMobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sections: {
    title?: string;
    items: Array<{ id: string; label: string; icon: any; badge?: string; badgeColor?: string }>;
  }[] = [
    {
      title: "Обзор",
      items: [
        { id: "analytics", label: "Аналитика", icon: BarChart3 },
        { id: "users", label: "Пользователи", icon: Users },
        {
          id: "support",
          label: "Поддержка",
          icon: Headphones,
          badge: unreadSupportCount > 0 ? unreadSupportCount.toString() : undefined,
          badgeColor: "bg-violet-500 text-white",
        },
        { id: "utm", label: "Трафик", icon: Crosshair },
      ],
    },
    {
      title: "Финансы",
      items: [
        { id: "partners", label: "Партнеры", icon: Handshake },
        {
          id: "payments_admin",
          label: "Оплаты",
          icon: Receipt,
          badge: pendingInvoicesCount > 0 ? pendingInvoicesCount.toString() : undefined,
          badgeColor: "bg-orange-500 text-white",
        },
        { id: "pricing", label: "Цены", icon: DollarSign },
        {
          id: "bonuses",
          label: "Бонусы",
          icon: Gift,
          badge: pendingBonusesCount > 0 ? pendingBonusesCount.toString() : undefined,
          badgeColor: "bg-amber-500 text-white",
        },
      ],
    },
    {
      title: "Контент",
      items: [
        { id: "prompts", label: "Модель", icon: Bot },
        { id: "banners", label: "Баннеры", icon: LayoutDashboard },
        { id: "news", label: "Новости", icon: Megaphone },
        { id: "blog", label: "Блог", icon: FileText },
        { id: "video_lessons", label: "Обучение", icon: GraduationCap },
      ],
    },
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="md:hidden h-9 w-9 rounded-xl hover:bg-secondary"
      >
        <Menu className="h-5 w-5 text-muted-foreground" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />

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
              className="fixed left-0 top-0 bottom-0 z-50 w-[296px] md:hidden overflow-hidden"
              style={{ touchAction: "pan-y" }}
            >
              <div className="absolute inset-0 bg-card border-r border-border/60 shadow-2xl shadow-black/20" />
              <span aria-hidden className="pointer-events-none absolute -top-20 -left-12 w-56 h-56 rounded-full bg-violet-500/[0.08] blur-3xl" />
              <span aria-hidden className="pointer-events-none absolute bottom-32 -left-16 w-48 h-48 rounded-full bg-fuchsia-500/[0.05] blur-3xl" />

              <div className="relative flex flex-col h-full">
                {/* Header */}
                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                      <Zap className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[15px] font-bold tracking-tight">WBGen</span>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mt-0.5">
                        Admin
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-violet-500/10 hover:text-violet-600 active:scale-95 transition-all"
                    aria-label="Закрыть"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Menu items */}
                <nav className="flex-1 overflow-y-auto px-3 pb-32 pt-1 [scrollbar-width:thin]">
                  {sections.map((section, sIdx) => (
                    <div key={sIdx} className={sIdx === 0 ? "" : "mt-4"}>
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
                                group relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left
                                transition-all duration-200 active:scale-[0.98]
                                ${isActive
                                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-200"
                                  : "text-foreground/85 hover:bg-gradient-to-r hover:from-violet-500 hover:to-purple-600 hover:text-white"}
                              `}
                            >
                              {isActive && (
                                <motion.span
                                  layoutId="admin-mobilemenu-active-bar"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-violet-500 to-purple-600"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              <div
                                className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200
                                  ${isActive
                                    ? "bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/25"
                                    : "bg-muted/40 border border-transparent group-hover:bg-white/15 group-hover:border-white/20"}
                                `}
                              >
                                <Icon
                                  className={`w-4 h-4 ${isActive ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground group-hover:text-white"}`}
                                  strokeWidth={isActive ? 2.4 : 2}
                                />
                              </div>
                              <span className="text-[13.5px] font-medium flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${item.badgeColor || "bg-muted text-muted-foreground"}`}
                                >
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
    </>
  );
};
