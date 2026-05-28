import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, LogIn, ChevronDown, Image, FileText, Barcode, Video, BookOpen, Newspaper, FolderOpen, Users, ArrowRight } from "lucide-react";

const productItems = [
  { label: "Создание карточек", href: "/sozdanie-kartochek", icon: Image, description: "ИИ-дизайн за 3 минуты" },
  { label: "SEO-описания", href: "/seo-opisaniya", icon: FileText, description: "Продающие тексты с ключами" },
  { label: "Генератор ШК", href: "/generator-shk", icon: Barcode, description: "Штрихкоды бесплатно" },
  { label: "Видео-генерация", href: "/video-generaciya", icon: Video, description: "Видеообложки для карточек" },
];

const resourceItems = [
  { label: "Кейсы", href: "/cases", icon: FolderOpen },
  { label: "База знаний", href: "/baza-znaniy", icon: BookOpen },
  { label: "Блог", href: "/blog", icon: Newspaper },
  { label: "Наши друзья", href: "/friends", icon: Users },
];

export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  const handleDropdownEnter = (name: string) => setOpenDropdown(name);
  const handleDropdownLeave = () => setOpenDropdown(null);

  return (
    <>
      {/* Floating, rounded header that follows scroll */}
      <div
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out ${
          isScrolled ? "top-2 sm:top-3" : "top-3 sm:top-5"
        }`}
      >
        <div className="mx-3 sm:mx-5 lg:mx-8">
          <header
            className={`relative rounded-2xl transition-all duration-300 ease-out border ${
              isScrolled
                ? "bg-[hsl(0,0%,6%)]/80 backdrop-blur-xl border-white/10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]"
                : "bg-[hsl(0,0%,7%)]/40 backdrop-blur-md border-white/[0.06] shadow-[0_8px_30px_-16px_rgba(0,0,0,0.4)]"
            }`}
          >
            <div className="px-3 sm:px-5 lg:px-6">
              <div className="flex items-center justify-between h-14 sm:h-16">
                {/* Mobile: Burger on left */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 -ml-2 text-white/80 hover:text-white order-1"
                  aria-label="Открыть меню"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 group order-2 lg:order-1">
                  <div className="relative">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[hsl(263,90%,62%)] to-[hsl(280,85%,48%)] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(263,90%,40%)]/30 transition-transform group-hover:scale-[1.05]">
                      <Zap className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-[hsl(263,90%,60%)] blur-xl opacity-30 -z-10" />
                  </div>
                  <span
                    className="text-base sm:text-lg font-bold text-white tracking-tight"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    WB<span className="text-[hsl(263,90%,72%)]">Gen</span>
                  </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-0.5 order-2">
                  <div className="relative" onMouseEnter={() => handleDropdownEnter("product")} onMouseLeave={handleDropdownLeave}>
                    <button className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg transition-colors ${openDropdown === "product" ? "text-white bg-white/[0.06]" : "text-white/75 hover:text-white hover:bg-white/[0.04]"}`}>
                      Продукт
                      <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === "product" ? "rotate-180" : ""}`} />
                    </button>
                    {openDropdown === "product" && (
                      <div className="absolute top-full left-0 pt-3 w-80 animate-fade-in">
                        <div className="bg-[hsl(0,0%,7%)]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50">
                          {productItems.map(item => (
                            <Link key={item.href} to={item.href} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-colors group">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(263,90%,55%)] to-[hsl(280,85%,45%)] flex items-center justify-center flex-shrink-0 shadow-md shadow-[hsl(263,90%,40%)]/25">
                                <item.icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <span className="block text-sm font-semibold text-white group-hover:text-[hsl(263,90%,78%)] transition-colors">{item.label}</span>
                                <span className="text-xs text-white/50">{item.description}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" onMouseEnter={() => handleDropdownEnter("resources")} onMouseLeave={handleDropdownLeave}>
                    <button className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg transition-colors ${openDropdown === "resources" ? "text-white bg-white/[0.06]" : "text-white/75 hover:text-white hover:bg-white/[0.04]"}`}>
                      Ресурсы
                      <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === "resources" ? "rotate-180" : ""}`} />
                    </button>
                    {openDropdown === "resources" && (
                      <div className="absolute top-full left-0 pt-3 w-56 animate-fade-in">
                        <div className="bg-[hsl(0,0%,7%)]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50">
                          {resourceItems.map(item => (
                            <Link key={item.href} to={item.href} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors group">
                              <item.icon className="w-4 h-4 text-white/55 group-hover:text-[hsl(263,90%,78%)] transition-colors" />
                              <span className="text-sm text-white/80 group-hover:text-white transition-colors">{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {[
                    { to: "/pricing", label: "Тарифы" },
                    { to: "/partners", label: "Партнёрам" },
                  ].map((l) => {
                    const active = location.pathname === l.to;
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        className={`text-sm px-3 py-2 rounded-lg transition-colors ${active ? "text-white bg-white/[0.06]" : "text-white/75 hover:text-white hover:bg-white/[0.04]"}`}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* CTA Buttons */}
                <div className="flex items-center gap-2 order-3">
                  <Link to={withUtm("/auth?tab=signin")} className="lg:hidden">
                    <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10 w-9 h-9" aria-label="Войти">
                      <LogIn className="w-[18px] h-[18px]" />
                    </Button>
                  </Link>
                  <Link to={withUtm("/auth?tab=signin")} className="hidden lg:block">
                    <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 h-9 px-4">
                      Войти
                    </Button>
                  </Link>
                  <Link to={withUtm("/auth?tab=signup")} className="hidden sm:block">
                    <Button className="bg-gradient-to-r from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] hover:brightness-110 text-white border-0 shadow-lg shadow-[hsl(263,90%,40%)]/30 hover:shadow-[hsl(263,90%,40%)]/50 transition-all duration-300 rounded-lg px-4 h-9">
                      Начать
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-2 top-2 bottom-2 w-[88vw] max-w-[340px] bg-gradient-to-b from-[hsl(263,40%,10%)] via-[hsl(0,0%,7%)] to-[hsl(0,0%,5%)] border border-white/10 rounded-2xl z-[70] lg:hidden overflow-hidden animate-slide-in-left shadow-2xl shadow-black/60">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
                <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="w-9 h-9 bg-gradient-to-br from-[hsl(263,90%,62%)] to-[hsl(280,85%,48%)] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(263,90%,40%)]/30">
                    <Zap className="w-[18px] h-[18px] text-white" />
                  </div>
                  <span className="text-lg font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    WB<span className="text-[hsl(263,90%,72%)]">Gen</span>
                  </span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
                <div>
                  <p className="px-3 mb-2 text-[10px] font-semibold text-white/35 uppercase tracking-[0.14em]">Продукт</p>
                  <div className="space-y-1">
                    {productItems.map(item => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[hsl(263,90%,55%)]/80 to-[hsl(280,85%,45%)]/80 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-[18px] h-[18px] text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-white truncate">{item.label}</span>
                          <span className="block text-[11px] text-white/45 truncate">{item.description}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="px-3 mb-2 text-[10px] font-semibold text-white/35 uppercase tracking-[0.14em]">Ресурсы</p>
                  <div className="space-y-0.5">
                    {resourceItems.map(item => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors"
                      >
                        <item.icon className="w-[18px] h-[18px] text-white/45" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="px-3 mb-2 text-[10px] font-semibold text-white/35 uppercase tracking-[0.14em]">Ещё</p>
                  <div className="space-y-0.5">
                    {[
                      { to: "/pricing", label: "Тарифы" },
                      { to: "/partners", label: "Партнёрам" },
                    ].map(l => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </nav>

              {/* Footer CTAs */}
              <div className="p-4 border-t border-white/[0.07] space-y-2.5 bg-black/20">
                <Link to={withUtm("/auth?tab=signup")} onClick={() => setIsMobileMenuOpen(false)} className="block">
                  <Button className="w-full bg-gradient-to-r from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] hover:brightness-110 text-white border-0 shadow-lg shadow-[hsl(263,90%,40%)]/30 rounded-xl h-11 font-semibold group">
                    Начать бесплатно
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                <Link to={withUtm("/auth?tab=signin")} onClick={() => setIsMobileMenuOpen(false)} className="block">
                  <Button variant="outline" className="w-full bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20 rounded-xl h-11">
                    Войти
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
