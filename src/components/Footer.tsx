import { Link } from "react-router-dom";
import { Zap, Mail, Send, MessageCircle, ArrowUpRight } from "lucide-react";
import { PaymentMethods } from "@/components/PaymentMethods";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-card">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                WB Генератор
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-md leading-relaxed">
              Все инструменты для продавцов WB в одном месте: генерация фото,
              SEO-описаний и штрихкодов с AI.
            </p>
          </div>

          {/* Documents */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Документы
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-1 text-foreground/80 hover:text-primary transition-colors"
                >
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="inline-flex items-center gap-1 text-foreground/80 hover:text-primary transition-colors"
                >
                  Договор оферты
                </Link>
              </li>
              <li>
                <Link
                  to="/partners/cabinet"
                  className="inline-flex items-center gap-1 text-foreground/80 hover:text-primary transition-colors"
                >
                  Партнёрам
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Контакты
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:info@wbgen.ru"
                  className="group inline-flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
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
                  className="group inline-flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
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
                  className="group inline-flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </span>
                  Поддержка
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider with gradient */}
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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

export default Footer;
