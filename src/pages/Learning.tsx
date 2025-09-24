import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Play, MessageCircle, HelpCircle } from "lucide-react";

const videoLessons = [
  {
    id: 'registration',
    title: 'Регистрация на сервисе и обзор',
    description: 'Узнайте, как зарегистрироваться и начать работу с WB Генератор',
    embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/o4YjCa9hxRutSYxHNaEHZv" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
  },
  {
    id: 'cards',
    title: 'Как работать с генерацией карточек',
    description: 'Изучите процесс создания карточек товаров с помощью ИИ',
    embedCode: 'Видео будет добавлено позже'
  },
  {
    id: 'descriptions',
    title: 'Как работать с генерацией описаний',
    description: 'Научитесь создавать продающие описания для ваших товаров',
    embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/8dxZ3uWTBxGYoXUP1wD6Zq" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
  },
  {
    id: 'barcodes',
    title: 'Как работать с генерацией штрих-кодов',
    description: 'Создавайте штрих-коды и этикетки для ваших товаров',
    embedCode: `<div style="position: relative; padding-top: 67.84%; width: 100%"><iframe src="https://kinescope.io/embed/kyZHWqtTVUX3EMTGGpm1gG" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;" frameborder="0" allowfullscreen style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></iframe></div>`
  },
  {
    id: 'overview',
    title: 'Обзор сервиса',
    description: 'Полный обзор всех возможностей WB Генератор',
    embedCode: 'Видео будет добавлено позже'
  }
];

const faqItems = [
  {
    question: "Как получить токены для генерации?",
    answer: "Токены можно получить несколькими способами: при регистрации вы получаете 25 бесплатных токенов, можете пополнить баланс в разделе 'Баланс', пригласить друзей по реферальной программе или использовать промокоды."
  },
  {
    question: "Сколько токенов нужно для генерации карточки?",
    answer: "Для генерации одной карточки требуется 1 токен. В стандартном наборе генерируется 6 карточек, что стоит 6 токенов."
  },
  {
    question: "Можно ли редактировать сгенерированные карточки?",
    answer: "Да, после генерации вы можете скачать карточки и отредактировать их в любом графическом редакторе. Также можете перегенерировать отдельные карточки, если результат не устраивает."
  },
  {
    question: "Как работает реферальная программа?",
    answer: "За каждого приглашенного друга, который совершит первую покупку токенов, вы получаете 20 бонусных токенов. Ваш реферальный код можно найти в разделе 'Рефералы'."
  },
  {
    question: "Какие форматы изображений поддерживаются?",
    answer: "Сервис поддерживает загрузку изображений в форматах JPG, PNG и WebP. Рекомендуется использовать изображения высокого качества для лучшего результата генерации."
  },
  {
    question: "Как получить поддержку?",
    answer: "Если у вас возникли вопросы или проблемы, вы можете обратиться к нам через Telegram @wb_generator_support или написать на почту support@wbgenerator.ru"
  }
];

const Learning = () => {
  const handleTelegramClick = () => {
    window.open('https://t.me/wbgen_official/', '_blank');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Обучение</h2>
        <p className="text-muted-foreground">
          Изучите все возможности WB Генератор с помощью наших видеоуроков
        </p>
      </div>

      {/* Telegram Group Promo */}
      <Card className="border-wb-purple/20 bg-gradient-to-r from-wb-purple/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#0088cc] rounded-2xl flex items-center justify-center shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Подписывайтесь на нашу группу в Telegram</h3>
                <p className="text-sm text-muted-foreground">
                  Получайте последние новости, обновления и полезные советы по работе с сервисом
                </p>
              </div>
            </div>
            <Button 
              onClick={handleTelegramClick}
              className="bg-[#0088cc] hover:bg-[#006ba8] text-white gap-2 shadow-lg"
            >
              <ExternalLink className="w-4 h-4" />
              Присоединиться
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Lessons */}
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold">Видеоуроки</h3>
        
        <div className="grid gap-6">
          {videoLessons.map((lesson, index) => (
            <Card key={lesson.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-wb-purple/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                    <Play className="w-4 h-4 text-wb-purple" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">
                      {index + 1}. {lesson.title}
                    </CardTitle>
                    <CardDescription>{lesson.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {lesson.embedCode.includes('<div') ? (
                  <div 
                    className="rounded-lg overflow-hidden bg-black/5"
                    dangerouslySetInnerHTML={{ __html: lesson.embedCode }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">{lesson.embedCode}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* FAQ Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-wb-purple" />
          <h3 className="text-2xl font-semibold">Часто задаваемые вопросы</h3>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default Learning;