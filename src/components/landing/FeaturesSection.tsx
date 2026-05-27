import {
  Zap,
  Target,
  Sparkles,
  Layers,
  RefreshCw,
  ImageIcon,
  FileText,
  Barcode,
  Video,
} from "lucide-react";
import { SpotlightCard } from "./effects/SpotlightCard";
import illuPhoneCard from "@/assets/landing/illu-phone-card.png";

/**
 * Bento-grid: «Что делает WBGen» + ключевые преимущества в одной композиции.
 * Плитки используют SpotlightCard — курсорная подсветка + magnetic-наклон на крупной плитке.
 */

export const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0d0d0d]" />
      <div className="spotlight-violet" />
      <div className="absolute top-0 left-0 right-0 hairline" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[12px] text-white/70 mb-5">
            Что делает WBGen
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-[1.05]">
            Один инструмент —{" "}
            <span className="text-aurora">всё для упаковки товара</span>
          </h2>
          <p className="text-base sm:text-lg text-white/55">
            Дизайн, инфографика, описания и этикетки — собираются за минуты,
            без дизайнера и подписок на ПО.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-6 auto-rows-[minmax(160px,auto)] gap-3 sm:gap-4 max-w-6xl mx-auto">
          {/* Hero tile - generation */}
          <SpotlightCard
            magnetic
            spotlightColor="hsl(263 90% 60% / 0.22)"
            className="col-span-6 md:col-span-4 row-span-2 glass-card rounded-3xl p-6 sm:p-8 overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[hsl(263,90%,55%)] rounded-full blur-[100px] opacity-30 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(263,90%,60%)] to-[hsl(280,85%,50%)] flex items-center justify-center mb-5 shadow-lg shadow-[hsl(263,90%,40%)]/30">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
                Генерация карточек товара
              </h3>
              <p className="text-white/60 text-sm sm:text-base max-w-md mb-5 leading-relaxed">
                AI собирает обложку и инфографику с фокусом на CTR и рекламу.
                До 6 вариантов за раз — удобно тестировать.
              </p>
              <ul className="flex flex-wrap gap-2">
                {[
                  "WB · Ozon · Я.Маркет",
                  "10+ стилей",
                  "PNG готовые к загрузке",
                  "Тест-сборки пачками",
                ].map((t) => (
                  <li
                    key={t}
                    className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white/75"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </SpotlightCard>

          {/* Speed */}
          <SpotlightCard className="col-span-3 md:col-span-2 glass-card rounded-3xl p-5 sm:p-6 overflow-hidden">
            <Zap className="w-5 h-5 text-[hsl(263,90%,75%)] mb-3" />
            <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tracking-tight">
              3 мин
            </div>
            <p className="text-xs sm:text-sm text-white/55">
              от загрузки фото до готовой PNG-карточки
            </p>
          </SpotlightCard>

          {/* Price */}
          <SpotlightCard className="col-span-3 md:col-span-2 glass-card rounded-3xl p-5 sm:p-6 overflow-hidden">
            <Target className="w-5 h-5 text-[hsl(263,90%,75%)] mb-3" />
            <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tracking-tight">
              от 59₽
            </div>
            <p className="text-xs sm:text-sm text-white/55">
              за карточку — в десятки раз дешевле дизайнера
            </p>
          </SpotlightCard>

          {/* Descriptions */}
          <SpotlightCard className="col-span-6 md:col-span-3 glass-card rounded-3xl p-6 sm:p-7 overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-[hsl(263,90%,75%)]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              SEO-описания
            </h3>
            <p className="text-sm text-white/55 leading-relaxed">
              Продающий текст с ключами под маркетплейсы — помогает карточке
              лучше попадать в выдачу.
            </p>
          </SpotlightCard>

          {/* Variants */}
          <SpotlightCard className="col-span-3 md:col-span-3 glass-card rounded-3xl p-6 sm:p-7 overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5 text-[hsl(263,90%,75%)]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Варианты для A/B-тестов
            </h3>
            <p className="text-sm text-white/55 leading-relaxed">
              Несколько обложек за раз — можно проверять гипотезы по визуалу
              и усиливать рекламные кампании.
            </p>
          </SpotlightCard>

          {/* Video covers */}
          <SpotlightCard className="col-span-3 md:col-span-2 glass-card rounded-3xl p-5 sm:p-6 overflow-hidden">
            <Video className="w-5 h-5 text-[hsl(263,90%,75%)] mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Видеообложки</h3>
            <p className="text-xs text-white/55">
              Короткие видео для главной карточки и рекламы
            </p>
          </SpotlightCard>

          {/* Labels */}
          <SpotlightCard className="col-span-3 md:col-span-2 glass-card rounded-3xl p-5 sm:p-6 overflow-hidden">
            <Barcode className="w-5 h-5 text-[hsl(263,90%,75%)] mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              Этикетки и ШК
            </h3>
            <p className="text-xs text-white/55">
              Штрих-коды и QR для отгрузок — бесплатно
            </p>
          </SpotlightCard>

          {/* Edits */}
          <SpotlightCard className="col-span-6 md:col-span-2 glass-card rounded-3xl p-5 sm:p-6 overflow-hidden">
            <RefreshCw className="w-5 h-5 text-[hsl(263,90%,75%)] mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              Точечные правки
            </h3>
            <p className="text-xs text-white/55">
              Меняйте цвет, текст, элементы — AI-редактор без дизайнера
            </p>
          </SpotlightCard>

          {/* Note */}
          <div className="col-span-6 rounded-3xl border border-dashed border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-white/[0.015]">
            <Sparkles className="w-5 h-5 text-[hsl(263,90%,75%)] shrink-0" />
            <p className="text-sm text-white/60 leading-relaxed">
              WBGen не обещает «гарантированный рост продаж» — но даёт
              профессиональный визуал, который{" "}
              <span className="text-white/85">
                помогает повышать кликабельность и эффективность рекламы
              </span>{" "}
              у тысяч селлеров.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
