import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export const LandingFooter = () => {
  return (
    <footer className="relative py-16 border-t border-white/10">
      <div className="absolute inset-0 bg-[hsl(240,10%,4%)]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
              </span>
            </Link>
            <p className="text-white/50 text-sm max-w-md">
              Все инструменты для продавцов WB в одном месте: генерация фото, SEO-описаний и штрихкодов с AI.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Документы</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/privacy" className="text-white/50 hover:text-white transition-colors">Политика конфиденциальности</Link></li>
              <li><Link to="/terms" className="text-white/50 hover:text-white transition-colors">Договор оферты</Link></li>
              <li><Link to="/partner" className="text-white/50 hover:text-white transition-colors">Партнерам</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Контакты</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="mailto:info@wbgen.ru" className="text-white/50 hover:text-white transition-colors">info@wbgen.ru</a></li>
              <li><a href="https://t.me/wbgen_official" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">Telegram-группа</a></li>
              <li><a href="https://t.me/wbgen_support/" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">Поддержка</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">© 2025 ООО "МАРКЕТШОП №1". Все права защищены.</p>
          <p className="text-sm text-white/40">ИНН: 6700002780</p>
        </div>
      </div>
    </footer>
  );
};
