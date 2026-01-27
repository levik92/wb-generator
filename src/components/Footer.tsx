import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-hero rounded-[12px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
              <span className="text-xl font-semibold">WB Генератор</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              Все инструменты для продавцов WB в одном месте: генерация фото, SEO-описаний и штрихкодов с AI и пр.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold mb-4">Документы</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Договор оферты
                </Link>
              </li>
              <li>
                <Link to="/partners/cabinet" className="text-muted-foreground hover:text-foreground transition-colors">
                  Партнерам
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Контакты</h3>
            <ul className="space-y-2 text-sm">
              <li>
                 <a 
                  href="mailto:info@wbgen.ru" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  info@wbgen.ru
                </a>
              </li>
              <li>
                <a 
                  href="https://t.me/wbgen_official" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Telegram-группа
                </a>
              </li>
              <li>
                <a 
                  href="https://t.me/wbgen_support/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Поддержка
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-sm text-muted-foreground">
              © 2025 ООО "МАРКЕТШОП №1". Все права защищены.
            </p>
            <p className="text-sm text-muted-foreground">
              ИНН: 6700002780
            </p>
            <p className="text-sm text-muted-foreground">
              Приём платежей: ИП Кот А.С., ИНН 502007134804
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;