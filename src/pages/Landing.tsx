import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Image, FileText, Users, Star, Check, PartyPopper, BarChart3, QrCode, Package, TrendingUp, Clock, Target, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import heroDemo from "@/assets/hero-demo.jpg";
import dashboardDemo from "@/assets/dashboard-demo.png";
import exampleBefore1 from "@/assets/example-before-after-1.jpg";
import exampleBefore2 from "@/assets/example-before-after-2.jpg";
import exampleBefore3 from "@/assets/example-before-after-3.jpg";
import exampleAfter1 from "@/assets/example-after-1.jpg";
import exampleAfter2 from "@/assets/example-after-2.jpg";
import exampleAfter3 from "@/assets/example-after-3.jpg";

// Компонент анимированного счетчика
const AnimatedCounter = () => {
  const [count, setCount] = useState(0);
  
  // Функция для получения количества дней с 1 января 2025
  const getDaysSinceStart = () => {
    const startDate = new Date('2025-01-01');
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Генерация стабильного рандомного числа для дня (seed на основе даты)
  const getDailyIncrement = () => {
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash = hash & hash;
    }
    const random = Math.abs(hash % 91) + 10; // 10-100
    return random;
  };
  
  // Вычисляем итоговое значение
  const getTargetValue = () => {
    const baseValue = 12973;
    const days = getDaysSinceStart();
    const dailyIncrement = getDailyIncrement();
    return baseValue + (days * dailyIncrement);
  };

  useEffect(() => {
    const targetValue = getTargetValue();
    const duration = 2000; // 2 секунды
    const steps = 60;
    const increment = targetValue / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setCount(targetValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  return (
    <span className="font-bold text-primary">{count.toLocaleString('ru-RU')}</span>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  
  const scrollToExamples = () => {
    document.getElementById('examples')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-[12px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm sm:text-lg md:text-xl font-semibold">WB Генератор</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
                Войти
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-wb-purple hover:bg-wb-purple-dark text-xs sm:text-sm px-2 sm:px-4">
                Начать бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-20 animate-fade-in overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-wb-purple/3 via-transparent to-wb-purple/5"></div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-4 py-2 rounded-full text-xs sm:text-sm mb-8 border border-green-200 shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">25 токенов бесплатно при регистрации</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight px-4">
              Карточки для&nbsp;WB<br className="hidden sm:block" /> 
              <span className="text-gradient">за 3 минуты</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed px-4">
              Генерируйте дизайнерские карточки, описания и этикетки с помощью ИИ. Без дизайнера и опыта.
            </p>

            {/* Stats Section - NEW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12 px-4">
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">
                  <AnimatedCounter />
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">карточек создано</div>
              </div>
              
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">3 мин</div>
                <div className="text-xs sm:text-sm text-muted-foreground">до результата</div>
              </div>
              
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">98%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">довольны результатом</div>
              </div>
              
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">₽0</div>
                <div className="text-xs sm:text-sm text-muted-foreground">первая генерация</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 px-4">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all">
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 hover:bg-gray-50 w-full sm:w-auto" onClick={scrollToExamples}>
                Примеры работ
              </Button>
            </div>
          </div>

          {/* Dashboard Preview Image */}
          <div className="mb-8 px-4">
            <div className="relative w-full max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none z-10"></div>
              <img 
                src="/lovable-uploads/5030ec29-2f6f-4436-9d03-bafcfc526692.png" 
                alt="Интерфейс WB Генератор"
                className="w-full rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - NEW */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Почему выбирают нас</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Профессиональный результат без команды дизайнеров
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <Card className="border-none shadow-md hover:shadow-xl transition-all">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-wb-purple/10 to-wb-purple/5 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-wb-purple" />
                </div>
                <CardTitle className="text-xl">Экономия времени</CardTitle>
                <CardDescription className="text-base">
                  <span className="font-semibold text-foreground">3 минуты</span> вместо <span className="line-through">3 дней</span> работы с дизайнером
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-md hover:shadow-xl transition-all">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-7 h-7 text-green-600" />
                </div>
                <CardTitle className="text-xl">Экономия денег</CardTitle>
                <CardDescription className="text-base">
                  От <span className="font-semibold text-foreground">120₽</span> за карточку вместо <span className="line-through">5000-15000₽</span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-md hover:shadow-xl transition-all">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-7 h-7 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Рост конверсии</CardTitle>
                <CardDescription className="text-base">
                  Увеличение продаж до <span className="font-semibold text-foreground">40%</span> благодаря профессиональным карточкам
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-md hover:shadow-xl transition-all">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-purple-600" />
                </div>
                <CardTitle className="text-xl">ИИ-технологии</CardTitle>
                <CardDescription className="text-base">
                  Используем новейшие нейросети для создания уникального контента
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-md hover:shadow-xl transition-all">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-7 h-7 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Мгновенный старт</CardTitle>
                <CardDescription className="text-base">
                  <span className="font-semibold text-foreground">25 бесплатных токенов</span> сразу после регистрации
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-md hover:shadow-xl transition-all">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-pink-600" />
                </div>
                <CardTitle className="text-xl">Поддержка 24/7</CardTitle>
                <CardDescription className="text-base">
                  Помогаем решить любые вопросы в любое время
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section id="examples" className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Примеры работ</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Посмотрите, как обычные фото превращаются в профессиональные карточки
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-4xl mx-auto">
            {/* Example 1 - Наушники */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Наушники - Электроника</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/1-2.png"
                afterImage="/lovable-uploads/1-1.png"
                alt="карточки наушников"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 2 - Платье */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Платье - Мода</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/2-2.png"
                afterImage="/lovable-uploads/2-1.jpg"
                alt="карточки платья"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 3 - Шампунь */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Шампунь - Красота</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/4-2.png"
                afterImage="/lovable-uploads/4-1.webp"
                alt="карточки шампуня"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 4 - Йога-коврик - только на десктопе */}
            <div className="max-w-xs sm:max-w-md mx-auto hidden lg:block">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Йога-коврик - Спорт</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/3-2.png"
                afterImage="/lovable-uploads/3-1.webp"
                alt="карточки йога-коврика"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Как это работает</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Четыре простых шага до профессиональных карточек
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="relative">
              <Card className="text-center h-full border-none shadow-md hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    1
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-wb-purple/10 to-wb-purple/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Image className="w-8 h-8 text-wb-purple" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2">Загрузите фото</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    До 3 фотографий товара. Подойдут даже простые снимки на телефон
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="relative">
              <Card className="text-center h-full border-none shadow-md hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    2
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2">Опишите товар</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Расскажите о преимуществах и добавьте пожелания по дизайну
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="relative">
              <Card className="text-center h-full border-none shadow-md hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    3
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2">ИИ создает карточки</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Нейросеть генерирует до 6 профессиональных карточек за 3 минуты
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="relative">
              <Card className="text-center h-full border-none shadow-md hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    4
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2">Скачайте результат</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Получите готовые PNG и сразу загрузите в кабинет Wildberries
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/auth">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-base sm:text-lg px-8 py-6 shadow-lg">
                Попробовать бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Description Generation */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Генерация описаний</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              <span className="sm:hidden">SEO-описания для конверсии</span>
              <span className="hidden sm:inline">SEO-оптимизированные описания товаров для повышения конверсии</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <FileText className="w-12 h-12 text-wb-purple mb-4" />
                <CardTitle>Анализ конкурентов</CardTitle>
                <CardDescription>
                  ИИ анализирует описания конкурентов и создает уникальный контент с использованием эффективных ключевых слов
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-12 h-12 text-wb-purple mb-4" />
                <CardTitle>SEO-оптимизация</CardTitle>
                <CardDescription>
                  Автоматическое распределение ключевых слов и создание продающих текстов до 1800 символов
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link to="/auth">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark">
                <span className="sm:hidden">Генерация описаний</span>
                <span className="hidden sm:inline">Попробовать генерацию описаний</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Label Generator */}
      <section className="py-16 bg-gradient-to-b from-green-50/50 to-green-100/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-green-100 border border-green-300 text-green-700 px-6 py-3 rounded-lg text-sm font-medium mb-6">
              <Badge className="bg-green-500 text-white px-2 py-1 text-xs">БЕСПЛАТНО</Badge>
              <span>для всех пользователей WB Генератор</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Генератор этикеток</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              <span className="sm:hidden">Этикетки и коды для товаров</span>
              <span className="hidden sm:inline">Создавайте профессиональные этикетки, штрихкоды и QR-коды для ваших товаров</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-8">
            <Card>
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-wb-purple mb-4" />
                <CardTitle>Штрих-коды</CardTitle>
                <CardDescription>
                  Создавайте CODE-128 штрихкоды для товаров с наименованием и артикулом
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <QrCode className="w-12 h-12 text-wb-purple mb-4" />
                <CardTitle>QR-коды</CardTitle>
                <CardDescription>
                  Генерируйте QR-коды для ссылок, текста и любой другой информации
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Package className="w-12 h-12 text-wb-purple mb-4" />
                <CardTitle>Короба WB</CardTitle>
                <CardDescription>
                  Специальные этикетки для коробов Wildberries с порядковыми номерами
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/auth">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark">
                Создать этикетки бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Прозрачные тарифы</h2>
            <p className="text-xl text-muted-foreground">
              <span className="sm:hidden">Платите за генерацию</span>
              <span className="hidden sm:inline">Платите только за то, что генерируете</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Стартовый</CardTitle>
                <div className="text-3xl font-bold">990₽</div>
                <CardDescription>80 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>12,38₽</strong> за токен
                </div>
                <div className="mt-3 space-y-2">
                  <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                    1 описание = 12,38₽
                  </div>
                  <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                    1 изображение = 123,80₽
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 описание =</span>
                    <span className="text-xs sm:text-sm font-medium">12,38₽</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 изображение карточки =</span>
                    <span className="text-xs sm:text-sm font-medium">123,80₽</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">8 изображений карточек</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">80 описаний товаров</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Поддержка в чате</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark" onClick={() => navigate('/auth')}>
                  Выбрать план
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Профи</CardTitle>
                <div className="text-3xl font-bold">2 990₽</div>
                <CardDescription>250 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>11,96₽</strong> за токен
                </div>
                <div className="mt-3 space-y-2">
                  <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                    1 описание = 11,96₽
                  </div>
                  <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                    1 изображение = 119,60₽
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 описание =</span>
                    <span className="text-xs sm:text-sm font-medium">11,96₽</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 изображение карточки =</span>
                    <span className="text-xs sm:text-sm font-medium">119,60₽</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">25 изображений карточек</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">250 описаний товаров</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Приоритетная поддержка</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark" onClick={() => navigate('/auth')}>
                  Выбрать план
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Бизнес</CardTitle>
                <div className="text-3xl font-bold">9 990₽</div>
                <CardDescription>850 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>11,75₽</strong> за токен
                </div>
                <div className="mt-3 space-y-2">
                  <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                    1 описание = 11,75₽
                  </div>
                  <div className="bg-wb-purple/10 text-wb-purple text-xs font-medium px-3 py-2 rounded-lg">
                    1 изображение = 117,50₽
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 описание =</span>
                    <span className="text-xs sm:text-sm font-medium">11,75₽</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 изображение карточки =</span>
                    <span className="text-xs sm:text-sm font-medium">117,50₽</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">85 изображений карточек</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">850 описаний товаров</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Персональный менеджер</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">API доступ</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark" onClick={() => navigate('/auth')}>
                  Выбрать план
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Referrals */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Реферальная программа</h2>
            <p className="text-xl text-muted-foreground">
              <span className="sm:hidden">Приглашайте и получайте бонусы</span>
              <span className="hidden sm:inline">Приглашайте друзей и получайте бонусы</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Users className="w-12 h-12 text-wb-purple mb-4" />
                <CardTitle>Для вас</CardTitle>
                <CardDescription>
                  Получайте +25 токенов за каждого друга, который совершил покупку
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Star className="w-12 h-12 text-wb-purple mb-4" />
                <CardTitle>Для друзей</CardTitle>
                <CardDescription>
                  Ваши друзья получают +10 токенов при регистрации по вашей ссылке
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-wb-purple/5 via-transparent to-wb-purple/10"></div>
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-wb-purple/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-l from-wb-purple/5 to-transparent rounded-full blur-3xl"></div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
            Начните прямо сейчас
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            25 бесплатных токенов ждут вас. Создайте первые карточки за несколько минут.
          </p>
          <div className="animate-fade-in">
            <Link to="/auth">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-sm px-6 py-4 hover-scale">
                Получить 25 токенов бесплатно
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;