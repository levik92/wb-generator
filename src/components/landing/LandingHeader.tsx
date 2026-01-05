import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, LogIn } from "lucide-react";
export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth"
    });
    setIsMobileMenuOpen(false);
  };
  const navItems = [{
    label: "Примеры",
    id: "examples"
  }, {
    label: "Возможности",
    id: "features"
  }, {
    label: "Тарифы",
    id: "pricing"
  }, {
    label: "FAQ",
    id: "faq"
  }];
  return <>
      <motion.header initial={{
      y: -100
    }} animate={{
      y: 0
    }} transition={{
      duration: 0.6,
      ease: "easeOut"
    }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "bg-[hsl(240,10%,6%)]/80 backdrop-blur-xl border-b border-white/10" : "bg-transparent"}`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Mobile: Burger menu on left */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-white/80 hover:text-white order-1">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo - centered on mobile */}
            <Link to="/" className="flex items-center gap-3 group order-2 lg:order-1">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_hsl(268,83%,60%,0.4)] transition-shadow duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] blur-lg opacity-50 group-hover:opacity-70 transition-opacity rounded-lg" />
              </div>
              <span className="text-xl font-bold text-white rounded-lg">
                WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 order-2">
              {navItems.map(item => <button key={item.id} onClick={() => scrollToSection(item.id)} className="text-sm text-white/70 hover:text-white transition-colors duration-200 relative group">
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] group-hover:w-full transition-all duration-300" />
                </button>)}
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 order-3">
              {/* Mobile: Login icon */}
              <Link to="/auth?tab=signin" className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10">
                  <LogIn className="w-5 h-5" />
                </Button>
              </Link>

              {/* Desktop buttons */}
              <Link to="/auth?tab=signin" className="hidden lg:block">
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                  Войти
                </Button>
              </Link>
              <Link to="/auth?tab=signup" className="hidden sm:block">
                <Button className="bg-gradient-to-r from-[hsl(268,83%,60%)] to-[hsl(268,83%,50%)] hover:from-[hsl(268,83%,55%)] hover:to-[hsl(268,83%,45%)] text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300">
                  <span className="hidden sm:inline">Начать бесплатно</span>
                  <span className="sm:hidden">Начать</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu - slides from left */}
      <AnimatePresence>
        {isMobileMenuOpen && <>
            {/* Overlay */}
            <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} transition={{
          duration: 0.2
        }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            
            {/* Menu panel */}
            <motion.div initial={{
          x: "-100%"
        }} animate={{
          x: 0
        }} exit={{
          x: "-100%"
        }} transition={{
          duration: 0.3,
          ease: "easeOut"
        }} className="fixed left-0 top-0 bottom-0 w-[280px] bg-[hsl(240,10%,8%)] border-r border-white/10 z-50 lg:hidden">
              <div className="flex flex-col h-full">
                {/* Header */}
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

                {/* Navigation */}
                <nav className="flex-1 p-4">
                  <div className="space-y-1">
                    {navItems.map(item => <button key={item.id} onClick={() => scrollToSection(item.id)} className="w-full text-left px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                        {item.label}
                      </button>)}
                  </div>
                </nav>

                {/* Bottom buttons */}
                <div className="p-4 border-t border-white/10 space-y-4">
                  <Link to="/auth?tab=signin" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                      Войти
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-[hsl(268,83%,60%)] to-[hsl(268,83%,50%)] hover:from-[hsl(268,83%,55%)] hover:to-[hsl(268,83%,45%)] text-white border-0">
                      Зарегистрироваться
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-white/30 pt-2">
                    © 2025. Все права защищены.
                  </p>
                </div>
              </div>
            </motion.div>
          </>}
      </AnimatePresence>
    </>;
};