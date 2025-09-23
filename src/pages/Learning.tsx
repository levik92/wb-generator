import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Play, MessageCircle, HelpCircle, BookOpen, Video } from "lucide-react";

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration?: string;
}

const VIDEO_LESSONS: VideoLesson[] = [
  {
    id: "registration",
    title: "Регистрация на сервисе и обзор",
    description: "Узнайте как зарегистрироваться и начать работу с сервисом",
    videoUrl: "https://kinescope.io/o4YjCa9hxRutSYxHNaEHZv",
    duration: "5 мин"
  },
  {
    id: "cards",
    title: "Как работать с генерацией карточек",
    description: "Пошаговое руководство по созданию карточек товаров",
    videoUrl: "https://kinescope.io/8dxZ3uWTBxGYoXUP1wD6Zq",
    duration: "8 мин"
  },
  {
    id: "barcode",
    title: "Как работать с генерацией штрих-кодов",
    description: "Создание и настройка штрих-кодов для ваших товаров",
    videoUrl: "https://kinescope.io/kyZHWqtTVUX3EMTGGpm1gG", 
    duration: "4 мин"
  },
  {
    id: "description",
    title: "Как работать с генерацией описаний",
    description: "Создание продающих описаний с помощью ИИ",
    videoUrl: "#", // Будет добавлено позже
    duration: "6 мин"
  },
  {
    id: "overview",
    title: "Обзор сервиса",
    description: "Полный обзор всех возможностей платформы",
    videoUrl: "#", // Будет добавлено позже
    duration: "10 мин"
  }
];

const FAQ_ITEMS = [
  {
    question: "Как начать пользоваться сервисом?",
    answer: "После регистрации вы получаете 25 стартовых токенов. Выберите нужный инструмент в боковом меню и следуйте инструкциям."
  },
  {
    question: "Что такое токены и как их получить?",
    answer: "Токены - это внутренняя валюта сервиса. Их можно купить в разделе 'Баланс' или получить за приглашение друзей."
  },
  {
    question: "Сколько стоит генерация карточек?",
    answer: "Генерация 1 карточки стоит 1 токен. При генерации набора из 6 карточек стоимость составляет 6 токенов."
  },
  {
    question: "Можно ли редактировать созданные карточки?",
    answer: "Да, вы можете регенерировать отдельные карточки в наборе, если результат вас не устраивает."
  },
  {
    question: "Как подключить API Wildberries?",
    answer: "В разделе 'Настройки' найдите пункт 'API ключи' и добавьте ваш ключ от Wildberries для автоматической загрузки карточек."
  },
  {
    question: "Есть ли ограничения на использование?",
    answer: "Ограничений по времени нет. Единственное ограничение - количество токенов на вашем балансе."
  }
];

export default function Learning() {
  const openVideo = (videoUrl: string) => {
    if (videoUrl === "#") return;
    window.open(videoUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Обучение</h1>
          </div>
          <p className="text-muted-foreground">
            Изучите все возможности сервиса с помощью наших видеоуроков и получите ответы на частые вопросы
          </p>
        </div>

        {/* Telegram Group Promo */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Подписывайтесь на нашу группу в Telegram</h3>
                  <p className="text-blue-700">Получайте последние новости, советы и поддержку от нашего сообщества</p>
                </div>
              </div>
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => window.open('https://t.me/wbgen_official/', '_blank')}
              >
                Присоединиться
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video Lessons */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Video className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Видеоуроки</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VIDEO_LESSONS.map((lesson) => (
              <Card key={lesson.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">{lesson.title}</CardTitle>
                    {lesson.duration && (
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {lesson.duration}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {lesson.description}
                  </p>
                  
                  <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                    {lesson.videoUrl === "#" ? (
                      <div className="text-center">
                        <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Скоро будет доступно</p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => openVideo(lesson.videoUrl)}
                        className="gap-2"
                      >
                        <Play className="w-5 h-5" />
                        Смотреть
                      </Button>
                    )}
                  </div>
                  
                  {lesson.videoUrl !== "#" && (
                    <Button 
                      className="w-full" 
                      onClick={() => openVideo(lesson.videoUrl)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Открыть видео
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="mb-12" />

        {/* FAQ Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Часто задаваемые вопросы</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {FAQ_ITEMS.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.question}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Support Note */}
        <div className="mt-12 text-center">
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Нужна дополнительная помощь?</h3>
              <p className="text-muted-foreground mb-4">
                Если у вас остались вопросы, обратитесь в нашу группу поддержки в Telegram
              </p>
              <Button 
                variant="outline"
                onClick={() => window.open('https://t.me/wbgen_official/', '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Написать в поддержку
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}