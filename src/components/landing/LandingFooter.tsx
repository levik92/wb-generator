import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const productLinks = [
  { label: "Создание карточек", href: "/sozdanie-kartochek" },
  { label: "SEO-описания", href: "/seo-opisaniya" },
  { label: "Генератор ШК", href: "/generator-shk" },
  { label: "Видео-генерация", href: "/video-generaciya" },
];

const resourceLinks = [
  { label: "Кейсы", href: "/cases", external: true },
  { label: "База знаний", href: "/baza-znaniy" },
  { label: "Блог", href: "/blog" },
  { label: "Тарифы", href: "/pricing" },
];

const companyLinks = [
  { label: "Партнёрам", href: "/partners" },
  { label: "Telegram", href: "https://t.me/wbgen_official", external: true },
  { label: "Поддержка", href: "https://t.me/wbgen_support/", external: true },
];

const legalLinks = [
  { label: "Политика конфиденциальности", href: "/privacy" },
  { label: "Договор оферты", href: "/terms" },
  { label: "Партнёрское соглашение", href: "/partner-agreement" },
];

export const LandingFooter = () => {
  return (
    <footer className="relative py-16 border-t border-white/10">
      <div className="absolute inset-0 bg-[#111111]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
              </span>
            </Link>
            <p className="text-white/50 text-sm">
              ИИ-инструменты для селлеров WB, Ozon, Яндекс Маркет
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Продукт</h3>
            <ul className="space-y-3 text-sm">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Ресурсы</h3>
            <ul className="space-y-3 text-sm">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <Link to={link.href} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <Link to={link.href} className="text-white/50 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Компания</h3>
            <ul className="space-y-3 text-sm">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/50 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.href} className="text-white/50 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <a href="mailto:info@wbgen.ru" className="text-white/50 hover:text-white transition-colors">
                  info@wbgen.ru
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Документы</h3>
            <ul className="space-y-3 text-sm">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
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
