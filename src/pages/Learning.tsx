import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Play, MessageCircle, HelpCircle, Clock, GraduationCap, Sparkles, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface VideoLesson {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  display_order: number;
  kinescope_id: string;
}

const faqItems = [{
  question: "Как получить токены для генерации?",
  answer: "Токены можно получить несколькими способами: пополнить баланс в разделе 'Баланс', пригласить друзей по реферальной программе (вы получите бонус при их первой покупке) или использовать промокоды."
}, {
  question: "Сколько токенов нужно для генерации карточки?",
  answer: "Для генерации одной карточки требуется 10 токенов. В стандартном наборе генерируется 6 карточек, что стоит 60 токенов."
}, {
  question: "Можно ли редактировать сгенерированные карточки?",
  answer: "Да, после генерации вы можете скачать карточки и отредактировать их в любом графическом редакторе. Также можете перегенерировать отдельные карточки, если результат не устраивает."
}, {
  question: "Как работает реферальная программа?",
  answer: "За каждого приглашенного друга, который совершит первую покупку токенов, вы получаете 20 бонусных токенов. Ваш реферальный код можно найти в разделе 'Рефералы'."
}, {
  question: "Какие форматы изображений поддерживаются?",
  answer: "Сервис поддерживает загрузку изображений в форматах JPG, PNG и WebP. Рекомендуется использовать изображения высокого качества для лучшего результата генерации."
}, {
  question: "Как получить поддержку?",
  answer: "Если у вас возникли вопросы или проблемы, вы можете обратиться к нам через Telegram @wbgen_support или написать на почту info@wbgen.ru"
}];

const Learning = () => {
  const [videoLessons, setVideoLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLessons = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('video_lessons')
          .select('id, title, subtitle, duration, display_order, kinescope_id')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setVideoLessons(data || []);
      } catch (error) {
        console.error('Error loading video lessons:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLessons();
  }, []);

  const handleTelegramClick = () => {
    window.open("https://t.me/wbgen_official/", "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-card p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Обучение
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
                База знаний и видеоуроки
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Освойте все возможности сервиса и создавайте карточки ТОП-уровня
              </p>
            </div>
          </div>
          {videoLessons.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 self-start sm:self-auto">
              <Sparkles className="h-4 w-4" />
              {videoLessons.length} уроков
            </div>
          )}
        </div>
      </div>

      {/* Telegram Promo */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-card p-5 sm:p-6">
          <div className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Telegram-канал</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">Новости, советы и обновления сервиса</p>
              </div>
            </div>
            <Button
              onClick={handleTelegramClick}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white gap-2 shadow-lg shadow-blue-500/20 w-full sm:w-auto"
            >
              <ExternalLink className="w-4 h-4" />
              Присоединиться
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Video Lessons */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="space-y-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold">Видеоуроки</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 rounded-2xl border border-border/60 bg-card">
            <div className="w-8 h-8 rounded-full border-[2.5px] border-violet-500/30 border-t-violet-500 animate-[spin_0.7s_linear_infinite]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {videoLessons.map((lesson, index) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <Card className="overflow-hidden border-border/60 bg-card hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 h-full rounded-2xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-violet-600 dark:text-violet-300">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1 flex-wrap">
                          <CardTitle className="text-base sm:text-lg leading-snug">{lesson.title}</CardTitle>
                          {lesson.duration && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0 gap-1 bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20">
                              <Clock className="w-2.5 h-2.5" />
                              {lesson.duration}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs sm:text-sm">{lesson.subtitle}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="rounded-xl overflow-hidden bg-black/5 ring-1 ring-border/50">
                      <div style={{ position: 'relative', paddingTop: '67.84%', width: '100%' }}>
                        <iframe
                          src={`https://kinescope.io/embed/${lesson.kinescope_id}`}
                          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                          frameBorder="0"
                          allowFullScreen
                          style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* FAQ Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="space-y-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <HelpCircle className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold">Часто задаваемые вопросы</h2>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-2 sm:p-3">
          <Accordion type="single" collapsible className="w-full space-y-1.5">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-xl px-4 bg-background/40 data-[state=open]:border-violet-500/30 data-[state=open]:bg-violet-500/[0.03] transition-all duration-300"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm sm:text-base font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Learning;
