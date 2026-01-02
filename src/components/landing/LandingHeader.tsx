import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X } from "lucide-react";

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
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { label: "Примеры", id: "examples" },
    { label: "Возможности", id: "features" },
    { label: "Тарифы", id: "pricing" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[hsl(240,10%,6%)]/80 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_hsl(268,83%,60%,0.4)] transition-shadow duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">
                WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-sm text-white/70 hover:text-white transition-colors duration-200 relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] group-hover:w-full transition-all duration-300" />
                </button>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Link to="/auth?tab=signin" className="hidden sm:block">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  Войти
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button className="bg-gradient-to-r from-[hsl(268,83%,60%)] to-[hsl(268,83%,50%)] hover:from-[hsl(268,83%,55%)] hover:to-[hsl(268,83%,45%)] text-white border-0 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300">
                  <span className="hidden sm:inline">Начать бесплатно</span>
                  <span className="sm:hidden">Начать</span>
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-white/80 hover:text-white"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 lg:hidden"
          >
            <div className="bg-[hsl(240,10%,8%)]/95 backdrop-blur-xl border-b border-white/10 p-6">
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="text-left text-lg text-white/80 hover:text-white py-2 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="pt-4 border-t border-white/10">
                  <Link to="/auth?tab=signin">
                    <Button
                      variant="ghost"
                      className="w-full text-white/80 hover:text-white hover:bg-white/10 mb-2"
                    >
                      Войти
                    </Button>
                  </Link>
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
