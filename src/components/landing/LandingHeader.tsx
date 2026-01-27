import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, LogIn, ChevronDown, Image, FileText, Barcode, Video, BookOpen, Newspaper, FolderOpen } from "lucide-react";

const productItems = [
  { label: "Создание карточек", href: "/sozdanie-kartochek", icon: Image, description: "ИИ-дизайн за 3 минуты" },
  { label: "SEO-описания", href: "/seo-opisaniya", icon: FileText, description: "Продающие тексты с ключами" },
  { label: "Генератор ШК", href: "/generator-shk", icon: Barcode, description: "Штрихкоды бесплатно" },
  { label: "Видео-генерация", href: "/video-generaciya", icon: Video, description: "Скоро", isComingSoon: true },
];

const resourceItems = [
  { label: "Кейсы", href: "/cases", icon: FolderOpen, external: true },
  { label: "База знаний", href: "/baza-znaniy", icon: BookOpen },
  { label: "Блог", href: "/blog", icon: Newspaper },
];

export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (isLandingPage) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  const handleDropdownEnter = (name: string) => setOpenDropdown(name);
  const handleDropdownLeave = () => setOpenDropdown(null);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? "bg-[hsl(240,10%,6%)]/80 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Mobile: Burger menu on left */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-white/80 hover:text-white order-1"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group order-2 lg:order-1">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_hsl(268,83%,60%,0.4)] transition-shadow duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] blur-lg transition-opacity rounded-lg opacity-50" />
              </div>
              <span className="text-xl font-bold text-white">
                WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 order-2">
              {/* Product Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleDropdownEnter("product")}
                onMouseLeave={handleDropdownLeave}
              >
                <button className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors py-2">
                  Продукт
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === "product" ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openDropdown === "product" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 pt-2 w-72"
                    >
                      <div className="bg-[hsl(240,10%,10%)] border border-white/10 rounded-xl p-2 shadow-xl">
                        {productItems.map((item) => (
                          <Link
                            key={item.href}
                            to={item.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center flex-shrink-0">
                              <item.icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white group-hover:text-[hsl(268,83%,65%)] transition-colors">
                                  {item.label}
                                </span>
                                {item.isComingSoon && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">Скоро</span>
                                )}
                              </div>
                              <span className="text-xs text-white/50">{item.description}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Resources Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleDropdownEnter("resources")}
                onMouseLeave={handleDropdownLeave}
              >
                <button className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors py-2">
                  Ресурсы
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === "resources" ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openDropdown === "resources" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 pt-2 w-48"
                    >
                      <div className="bg-[hsl(240,10%,10%)] border border-white/10 rounded-xl p-2 shadow-xl">
                        {resourceItems.map((item) => (
                          item.external ? (
                            <Link
                              key={item.href}
                              to={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                              <item.icon className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                              <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                                {item.label}
                              </span>
                            </Link>
                          ) : (
                            <Link
                              key={item.href}
                              to={item.href}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                              <item.icon className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                              <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                                {item.label}
                              </span>
                            </Link>
                          )
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Direct Links */}
              <Link to="/pricing" className="text-sm text-white/70 hover:text-white transition-colors">
                Тарифы
              </Link>
              <Link to="/partners" className="text-sm text-white/70 hover:text-white transition-colors">
                Партнёрам
              </Link>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 order-3">
              <Link to="/auth?tab=signin" className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10">
                  <LogIn className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth?tab=signin" className="hidden lg:block">
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                  Войти
                </Button>
              </Link>
              <Link to="/auth?tab=signup" className="hidden sm:block">
                <Button className="bg-gradient-to-r from-[hsl(268,83%,60%)] to-[hsl(268,83%,50%)] hover:from-[hsl(268,83%,55%)] hover:to-[hsl(268,83%,45%)] text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300">
                  Начать
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed left-0 top-0 bottom-0 w-[300px] bg-[hsl(240,10%,8%)] border-r border-white/10 z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-8 h-8 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-white">
                      WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
                    </span>
                  </Link>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/60 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 p-4 space-y-4">
                  {/* Product Section */}
                  <div>
                    <p className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Продукт</p>
                    <div className="space-y-1">
                      {productItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <item.icon className="w-5 h-5 text-white/50" />
                          <span>{item.label}</span>
                          {item.isComingSoon && (
                            <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">Скоро</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Resources Section */}
                  <div>
                    <p className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Ресурсы</p>
                    <div className="space-y-1">
                      {resourceItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <item.icon className="w-5 h-5 text-white/50" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Other Links */}
                  <div className="pt-2 border-t border-white/10">
                    <Link
                      to="/pricing"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Тарифы
                    </Link>
                    <Link
                      to="/partners"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Партнёрам
                    </Link>
                  </div>
                </nav>

                <div className="p-4 border-t border-white/10 space-y-4">
                  <Link to="/auth?tab=signin" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                      Войти
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-[hsl(268,83%,60%)] to-[hsl(268,83%,50%)] text-white border-0">
                      Зарегистрироваться
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
