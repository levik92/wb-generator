import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Play, MessageCircle, HelpCircle, Zap, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
const videoLessons = [{
  id: "overview",
  title: "Обзор сервиса и всех функций",
  description: "Узнайте о всех функциях кабинета WB генератор и как с ними работать",
  embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/soVNVxif9ePmX7h7Hj5tMm" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
}, {
  id: "cards",
  title: "Как работать с генерацией карточек",
  description: "Полный обзор функций и процесса создания карточек товара до высокого уровня",
  embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/gxehUBTUM5Eg5GGcjZxs6T" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
}, {
  id: "top-cards",
  title: "Как делать карточки ТОП уровня",
  description: "\"Лайфхаки\" и \"фишки\" как работать с сервисом и довести уровень дизайна карточек до идеала",
  embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/wt1tRnXbyNeAv5NMFRfEGc" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
}, {
  id: "seo",
  title: "Как делать лучшие SEO карточек",
  description: "Рассказываем как работать в генераторе описаний и делать SEO, выводящие товары в ТОП10 выдачи",
  embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/usJ75nHxa7YXYw1bUeLnXV" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
}, {
  id: "partners",
  title: "Зарабатывайте вместе с нами",
  description: "Обзор кабинета партнеров и как можно скооперироваться с нашим сервисом",
  embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/5m7ZHxn36euywnnGFUzvTx" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
}, {
  id: "edit-cards",
  title: "Функция редактирования карточек",
  description: "Посмотрите все возможности функции \"Редактирование\" в сервисе",
  embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/9gw271sVENpvKKJiL6Juqd" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
}, {
  id: "adult-products",
  title: "Работа с товарами 18+",
  description: "Особенности работы с товарами категории 18+ на нашем сервисе",
  embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/2uMRCQEpnYHrvawcWdmfSv" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
}];
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
  const handleTelegramClick = () => {
    window.open("https://t.me/wbgen_official/", "_blank");
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4
  }} className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
          <GraduationCap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Обучение</h2>
          <p className="text-muted-foreground text-sm">Изучите все возможности WB Генератор</p>
        </div>
      </div>

      {/* Telegram Group Promo */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.1
    }}>
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-cyan-500/10 border-blue-500/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Telegram-канал
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Новости и советы
                  </p>
                </div>
              </div>
              <Button onClick={handleTelegramClick} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white gap-2 shadow-lg transition-all duration-300">
                <ExternalLink className="w-4 h-4" />
                Присоединиться
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Video Lessons */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.2
    }} className="space-y-6">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          <h3 className="text-xl sm:text-2xl font-semibold">Видеоуроки</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {videoLessons.map((lesson, index) => <motion.div key={lesson.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          delay: 0.1 * index
        }}>
              <Card className="overflow-hidden backdrop-blur-xl border-border/50 hover:border-primary/20 transition-all duration-300 h-full bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg mb-1">
                        {lesson.title}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{lesson.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {lesson.embedCode.includes("<div") ? <div className="rounded-xl overflow-hidden bg-black/5" dangerouslySetInnerHTML={{
                __html: lesson.embedCode
              }} /> : <div className="flex items-center justify-center h-48 bg-muted/50 rounded-xl">
                      <p className="text-muted-foreground">{lesson.embedCode}</p>
                    </div>}
                </CardContent>
              </Card>
            </motion.div>)}
        </div>
      </motion.div>

      <Separator className="bg-border/50" />

      {/* FAQ Section */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.3
    }} className="space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="text-xl sm:text-2xl font-semibold">Часто задаваемые вопросы</h3>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {faqItems.map((item, index) => <AccordionItem key={index} value={`item-${index}`} className="border border-border/50 rounded-xl px-4 bg-card/50 backdrop-blur-sm data-[state=open]:border-primary/20 transition-all duration-300">
              <AccordionTrigger className="text-left hover:no-underline py-4 text-sm sm:text-base">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed text-sm pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>)}
        </Accordion>
      </motion.div>
    </motion.div>;
};
export default Learning;