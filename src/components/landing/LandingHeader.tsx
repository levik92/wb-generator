import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, LogIn, ChevronDown, Image, FileText, Barcode, Video, BookOpen, Newspaper, FolderOpen } from "lucide-react";

const productItems = [
  { label: "Создание карточек", href: "/sozdanie-kartochek", icon: Image, description: "ИИ-дизайн за 3 минуты" },
  { label: "SEO-описания", href: "/seo-opisaniya", icon: FileText, description: "Продающие тексты с ключами" },
  { label: "Генератор ШК", href: "/generator-shk", icon: Barcode, description: "Штрихкоды бесплатно" },
  { label: "Видео-генерация", href: "/video-generaciya", icon: Video, description: "Видеообложки для карточек" },
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDropdownEnter = (name: string) => setOpenDropdown(name);
  const handleDropdownLeave = () => setOpenDropdown(null);

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Mobile: Burger menu on left */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="lg:hidden p-2 text-gray-500 hover:text-gray-900 order-1"
              aria-label="Открыть меню"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group order-2 lg:order-1">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Zap className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-gray-900">
                WB<span className="text-[hsl(268,83%,55%)]">Gen</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 order-2">
              {/* Product Dropdown */}
              <div className="relative" onMouseEnter={() => handleDropdownEnter("product")} onMouseLeave={handleDropdownLeave}>
                <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors py-2">
                  Продукт
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === "product" ? "rotate-180" : ""}`} />
                </button>
                {openDropdown === "product" && (
                  <div className="absolute top-full left-0 pt-2 w-72 animate-fade-in">
                    <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-xl shadow-gray-200/50">
                      {productItems.map(item => (
                        <Link 
                          key={item.href} 
                          to={item.href} 
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(268,83%,55%)] to-[hsl(268,83%,45%)] flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 group-hover:text-[hsl(268,83%,55%)] transition-colors">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{item.description}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resources Dropdown */}
              <div className="relative" onMouseEnter={() => handleDropdownEnter("resources")} onMouseLeave={handleDropdownLeave}>
                <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors py-2">
                  Ресурсы
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === "resources" ? "rotate-180" : ""}`} />
                </button>
                {openDropdown === "resources" && (
                  <div className="absolute top-full left-0 pt-2 w-48 animate-fade-in">
                    <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-xl shadow-gray-200/50">
                      {resourceItems.map(item => (
                        <Link 
                          key={item.href} 
                          to={item.href} 
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <item.icon className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                          <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                            {item.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Links */}
              <Link to="/pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Тарифы
              </Link>
              <Link to="/partners" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Партнёрам
              </Link>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 order-3">
              <Link to="/auth?tab=signin" className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                  <LogIn className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth?tab=signin" className="hidden lg:block">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  Войти
                </Button>
              </Link>
              <Link to="/auth?tab=signup" className="hidden sm:block">
                <Button className="bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(268,83%,45%)] hover:from-[hsl(268,83%,50%)] hover:to-[hsl(268,83%,40%)] text-white border-0 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300">
                  Начать
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-fade-in" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="fixed left-0 top-0 bottom-0 w-[300px] bg-white border-r border-gray-200 z-50 lg:hidden overflow-y-auto animate-slide-in-left shadow-2xl">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="w-8 h-8 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    WB<span className="text-[hsl(268,83%,55%)]">Gen</span>
                  </span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-4">
                {/* Product Section */}
                <div>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Продукт</p>
                  <div className="space-y-1">
                    {productItems.map(item => (
                      <Link 
                        key={item.href} 
                        to={item.href} 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <item.icon className="w-5 h-5 text-gray-400" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Resources Section */}
                <div>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ресурсы</p>
                  <div className="space-y-1">
                    {resourceItems.map(item => (
                      <Link 
                        key={item.href} 
                        to={item.href} 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <item.icon className="w-5 h-5 text-gray-400" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Other Links */}
                <div className="pt-2 border-t border-gray-100">
                  <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                    Тарифы
                  </Link>
                  <Link to="/partners" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                    Партнёрам
                  </Link>
                </div>
              </nav>

              <div className="p-4 border-t border-gray-100 space-y-3">
                <Link to="/auth?tab=signin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 mb-3">
                    Войти
                  </Button>
                </Link>
                <Link to="/auth?tab=signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(268,83%,45%)] text-white border-0">
                    Зарегистрироваться
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
