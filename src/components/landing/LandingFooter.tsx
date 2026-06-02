import { Link } from "react-router-dom";
import { Zap, Mail, Send, MessageCircle, ArrowUpRight } from "lucide-react";
import { PaymentMethods } from "@/components/PaymentMethods";

const productLinks = [
  { label: "Создание карточек", href: "/sozdanie-kartochek" },
  { label: "SEO-описания", href: "/seo-opisaniya" },
  { label: "Генератор ШК", href: "/generator-shk" },
  { label: "Видео-генерация", href: "/video-generaciya" },
];

const resourceLinks = [
  { label: "Кейсы", href: "/cases" },
  { label: "База знаний", href: "/baza-znaniy" },
  { label: "Блог", href: "/blog" },
  { label: "Тарифы", href: "/pricing" },
  { label: "Наши друзья", href: "/friends" },
];

const legalLinks = [
  { label: "Политика конфиденциальности", href: "/privacy" },
  { label: "Договор оферты", href: "/terms" },
  { label: "Партнёрское соглашение", href: "/partner-agreement" },
];

export const LandingFooter = () => {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#111111]">
      {/* Decorative gradient orb */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[hsl(268,83%,60%)]/15 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center shadow-md shadow-[hsl(268,83%,50%)]/30 transition-transform group-hover:scale-105">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-white/55 max-w-sm leading-relaxed">
              ИИ-инструменты для селлеров WB, Ozon и Яндекс Маркет: генерация фото,
              SEO-описаний, видео и штрихкодов.
            </p>
          </div>

          {/* Product */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Продукт
            </h3>
            <ul className="space-y-2.5 text-sm">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-white/70 hover:text-[hsl(268,83%,70%)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Ресурсы
            </h3>
            <ul className="space-y-2.5 text-sm">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-white/70 hover:text-[hsl(268,83%,70%)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/partners"
                  className="inline-flex items-center gap-1 text-white/70 hover:text-[hsl(268,83%,70%)] transition-colors"
                >
                  Партнёрам
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Контакты
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:info@wbgen.ru"
                  className="group inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(268,83%,60%)]/15 text-[hsl(268,83%,70%)] group-hover:bg-[hsl(268,83%,60%)] group-hover:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  info@wbgen.ru
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/wbgen_official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(268,83%,60%)]/15 text-[hsl(268,83%,70%)] group-hover:bg-[hsl(268,83%,60%)] group-hover:text-white transition-colors">
                    <Send className="w-3.5 h-3.5" />
                  </span>
                  Telegram-группа
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/wbgen_support/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(268,83%,60%)]/15 text-[hsl(268,83%,70%)] group-hover:bg-[hsl(268,83%,60%)] group-hover:text-white transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </span>
                  Поддержка
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Documents row */}
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-white/55 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Divider with gradient */}
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs text-white/50">
            <span>© 2026 ООО «АЛЬТАИР»</span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span>ИНН: 9724238597</span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span>Платёжный агент в РБ: ИП Левицкий В.С. · УНП: 192485539</span>
          </div>
          <PaymentMethods />
        </div>
      </div>
    </footer>
  );
};
