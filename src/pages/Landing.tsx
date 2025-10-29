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
import bg3d1 from "@/assets/3d-gradient-bg-1.jpg";
import bg3d2 from "@/assets/3d-gradient-bg-2.jpg";
import bg3d3 from "@/assets/3d-gradient-bg-3.jpg";
import ecommerce3d1 from "@/assets/3d-ecommerce-1.jpg";
import ecommerce3d2 from "@/assets/3d-ecommerce-2.jpg";
import aiTech3d from "@/assets/3d-ai-tech.png";
import lightning3d from "@/assets/3d-lightning.png";

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
            <Link to="/auth?tab=signin">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
                Войти
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button size="sm" className="bg-wb-purple hover:bg-wb-purple-dark text-xs sm:text-sm px-2 sm:px-4">
                Начать бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-20 animate-fade-in overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/80 via-white to-gray-100/50"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 via-transparent to-transparent"></div>
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-wb-purple/10 to-transparent rounded-bl-[200px]"></div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-4 py-2 rounded-full text-xs sm:text-sm mb-8 border border-green-200 shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">25 токенов бесплатно при регистрации</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight px-4">
              Карточки для <span className="whitespace-nowrap">WB <br className="sm:hidden" /></span>
              <span className="hidden sm:inline"><br /></span>
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
              <Link to="/auth?tab=signup" className="w-full sm:w-auto">
                <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all">
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 hover:bg-gray-50 hover:text-wb-purple w-full sm:w-auto" onClick={scrollToExamples}>
                Примеры работ
              </Button>
            </div>
          </div>

          {/* Before/After Example with Angled Photos */}
          <div className="mb-8 px-4">
            <div className="relative w-full max-w-5xl mx-auto">
              <div className="text-center mb-4">
                <Badge variant="secondary" className="bg-gray-100/50 text-gray-600 border-none text-sm px-4 py-2 hover:bg-gray-100/50 hover:text-gray-600 cursor-default">
                  Пример генерации в сервисе
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                {/* Before Image */}
                <div className="relative transform -rotate-6 sm:-rotate-3 transition-transform hover:rotate-0">
                  <div className="bg-white p-2 sm:p-4 rounded-xl shadow-2xl">
                    <img 
                      src="/lovable-uploads/clarins-before.jpeg" 
                      alt="До генерации"
                      className="w-56 sm:w-48 md:w-64 h-auto rounded-lg"
                    />
                    <div className="text-center mt-2 text-xs sm:text-sm font-medium text-muted-foreground">
                      До
                    </div>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className="flex-shrink-0">
                  <ArrowRight className="hidden sm:block w-6 h-6 sm:w-10 sm:h-10 text-wb-purple" />
                  <div className="sm:hidden w-10 h-10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-wb-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
                
                {/* After Image */}
                <div className="relative transform rotate-6 sm:rotate-3 transition-transform hover:rotate-0">
                  <div className="bg-white p-2 sm:p-4 rounded-xl shadow-2xl">
                    <img 
                      src="/lovable-uploads/clarins-after.png" 
                      alt="После генерации"
                      className="w-56 sm:w-48 md:w-64 h-auto rounded-lg"
                    />
                    <div className="text-center mt-2 text-xs sm:text-sm font-medium text-green-600 font-bold">
                      После
                    </div>
                  </div>
                </div>
              </div>
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

      {/* Examples Section - Before/After Gallery */}
      <section id="examples" className="py-16 sm:py-20 bg-gray-100">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Примеры генераций</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Реальные результаты клиентов WB Генератор
            </p>
          </div>

          {/* Before/After Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-7xl mx-auto mb-12">
            {/* Example 1 */}
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {/* Before */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                      <img 
                        src="/lovable-uploads/1-1.png" 
                        alt="До"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center font-medium">
                        До
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ArrowRight className="w-6 h-6 text-wb-purple" />
                  </div>
                  
                  {/* After */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md ring-2 ring-green-500">
                      <img 
                        src="/lovable-uploads/1-2.png" 
                        alt="После"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs py-1 text-center font-medium">
                        После
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Категория:</span>
                    <Badge className="bg-purple-100 text-purple-700">Электроника</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Рост конверсии:</span>
                    <span className="text-lg font-bold text-green-600">+183%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-blue-50 px-2 py-1 rounded">
                    <span className="text-muted-foreground">Заказов в день:</span>
                    <span className="font-bold text-blue-600">3 → 8</span>
                  </div>
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">WB Генератор:</span>
                      <span className="font-bold text-wb-purple">120₽</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Дизайнер:</span>
                      <span className="line-through text-gray-400">15 000₽</span>
                    </div>
                    <div className="bg-green-50 px-2 py-1 rounded text-xs text-green-700 font-medium text-center">
                      Экономия 14 880₽
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example 2 */}
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {/* Before */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                      <img 
                        src="/lovable-uploads/2-1.jpg" 
                        alt="До"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center font-medium">
                        До
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ArrowRight className="w-6 h-6 text-wb-purple" />
                  </div>
                  
                  {/* After */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md ring-2 ring-green-500">
                      <img 
                        src="/lovable-uploads/2-2.png" 
                        alt="После"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs py-1 text-center font-medium">
                        После
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Категория:</span>
                    <Badge className="bg-pink-100 text-pink-700">Одежда</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Рост конверсии:</span>
                    <span className="text-lg font-bold text-green-600">+250%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-blue-50 px-2 py-1 rounded">
                    <span className="text-muted-foreground">Заказов в день:</span>
                    <span className="font-bold text-blue-600">2 → 7</span>
                  </div>
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">WB Генератор:</span>
                      <span className="font-bold text-wb-purple">120₽</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Фотограф:</span>
                      <span className="line-through text-gray-400">8 000₽</span>
                    </div>
                    <div className="bg-green-50 px-2 py-1 rounded text-xs text-green-700 font-medium text-center">
                      Экономия 7 880₽
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example 3 */}
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {/* Before */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                      <img 
                        src="/lovable-uploads/3-1.webp" 
                        alt="До"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center font-medium">
                        До
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ArrowRight className="w-6 h-6 text-wb-purple" />
                  </div>
                  
                  {/* After */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md ring-2 ring-green-500">
                      <img 
                        src="/lovable-uploads/3-2.png" 
                        alt="После"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs py-1 text-center font-medium">
                        После
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Категория:</span>
                    <Badge className="bg-blue-100 text-blue-700">Красота</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Рост конверсии:</span>
                    <span className="text-lg font-bold text-green-600">+153%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-blue-50 px-2 py-1 rounded">
                    <span className="text-muted-foreground">Заказов в день:</span>
                    <span className="font-bold text-blue-600">4 → 10</span>
                  </div>
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">WB Генератор:</span>
                      <span className="font-bold text-wb-purple">120₽</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Дизайнер:</span>
                      <span className="line-through text-gray-400">12 000₽</span>
                    </div>
                    <div className="bg-green-50 px-2 py-1 rounded text-xs text-green-700 font-medium text-center">
                      Экономия 11 880₽
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example 4 */}
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {/* Before */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                      <img 
                        src="/lovable-uploads/4-1.webp" 
                        alt="До"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center font-medium">
                        До
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ArrowRight className="w-6 h-6 text-wb-purple" />
                  </div>
                  
                  {/* After */}
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md ring-2 ring-green-500">
                      <img 
                        src="/lovable-uploads/4-2.png" 
                        alt="После"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs py-1 text-center font-medium">
                        После
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Категория:</span>
                    <Badge className="bg-orange-100 text-orange-700">Товары для дома</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Рост конверсии:</span>
                    <span className="text-lg font-bold text-green-600">+197%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-blue-50 px-2 py-1 rounded">
                    <span className="text-muted-foreground">Заказов в день:</span>
                    <span className="font-bold text-blue-600">5 → 15</span>
                  </div>
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">WB Генератор:</span>
                      <span className="font-bold text-wb-purple">120₽</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Дизайнер:</span>
                      <span className="line-through text-gray-400">10 000₽</span>
                    </div>
                    <div className="bg-green-50 px-2 py-1 rounded text-xs text-green-700 font-medium text-center">
                      Экономия 9 880₽
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-sm sm:text-base md:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-lg">
                Получить такие же результаты
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
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
                  <div className="absolute -top-4 left-2 sm:-left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                  <div className="absolute -top-4 left-2 sm:-left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                  <div className="absolute -top-4 left-2 sm:-left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                  <div className="absolute -top-4 left-2 sm:-left-4 w-10 h-10 bg-wb-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-base sm:text-lg px-8 py-6 shadow-lg">
                Попробовать бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Description Generation */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={bg3d1} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-wb-purple/20 via-background/95 to-background/95"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-wb-purple/10 to-purple-500/10 text-wb-purple px-4 py-2 rounded-full text-xs sm:text-sm mb-6 border border-wb-purple/20">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">ИИ-генерация SEO-описаний</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Продающие описания за минуту</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Нейросеть анализирует конкурентов и создает уникальные SEO-тексты
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-12">
            <Card className="border-none shadow-xl bg-white/95 backdrop-blur">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-wb-purple/10 to-wb-purple/5 rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-wb-purple" />
                </div>
                <CardTitle className="text-xl">Анализ конкурентов</CardTitle>
                <CardDescription className="text-base">
                  ИИ изучает топ-20 карточек в вашей нише и выявляет самые эффективные ключевые слова
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-xl bg-white/95 backdrop-blur">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">SEO-оптимизация</CardTitle>
                <CardDescription className="text-base">
                  Автоматическое распределение ключей и создание продающих текстов до 1800 символов
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-xl bg-white/95 backdrop-blur">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Рост продаж</CardTitle>
                <CardDescription className="text-base">
                  Грамотные описания повышают позиции в поиске WB и увеличивают конверсию на 25-40%
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
              <div className="text-4xl font-bold text-wb-purple mb-2">1 мин</div>
              <div className="text-sm text-muted-foreground">Время генерации</div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
              <div className="text-4xl font-bold text-wb-purple mb-2">12₽</div>
              <div className="text-sm text-muted-foreground">За одно описание</div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
              <div className="text-4xl font-bold text-wb-purple mb-2">+35%</div>
              <div className="text-sm text-muted-foreground">Средний рост конверсии</div>
            </div>
          </div>

          <div className="text-center">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-base sm:text-lg px-8 py-6 shadow-xl">
                <span className="hidden sm:inline">Попробовать генерацию описаний</span>
                <span className="sm:hidden">Попробовать генерацию</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Label Generator */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={bg3d2} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-background/95 to-background/95"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 px-6 py-3 rounded-full text-sm font-medium mb-6 shadow-sm">
              <Badge className="bg-green-500 text-white px-3 py-1 text-xs font-bold hover:bg-green-500">БЕСПЛАТНО</Badge>
              <span className="font-semibold text-xs sm:text-sm">для всех пользователей</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Генератор этикеток WB</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Профессиональные этикетки, штрихкоды и QR-коды для ваших товаров
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto mb-12">
            <Card className="border-none shadow-xl bg-white/95 backdrop-blur hover:shadow-2xl transition-all">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-wb-purple/10 to-wb-purple/5 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-wb-purple" />
                </div>
                <CardTitle className="text-xl">Штрих-коды</CardTitle>
                <CardDescription className="text-base">
                  Создавайте CODE-128 штрихкоды для товаров с наименованием и артикулом. Готовы к печати
                </CardDescription>
                <div className="pt-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-600">∞</div>
                    <div className="text-xs text-green-700 font-medium">Без ограничений</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-xl bg-white/95 backdrop-blur hover:shadow-2xl transition-all">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">QR-коды</CardTitle>
                <CardDescription className="text-base">
                  Генерируйте QR-коды для ссылок на товары, инструкций или контактной информации
                </CardDescription>
                <div className="pt-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-600">∞</div>
                    <div className="text-xs text-green-700 font-medium">Без ограничений</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-xl bg-white/95 backdrop-blur hover:shadow-2xl transition-all">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Короба WB</CardTitle>
                <CardDescription className="text-base">
                  Специальные этикетки для коробов Wildberries с автоматической нумерацией
                </CardDescription>
                <div className="pt-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-600">∞</div>
                    <div className="text-xs text-green-700 font-medium">Без ограничений</div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg px-8 py-6 shadow-xl">
                Создать этикетки бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-wb-purple/10 to-purple-500/10 text-wb-purple px-4 py-2 rounded-full text-xs sm:text-sm mb-6 border border-wb-purple/20">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Без скрытых платежей</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Прозрачные тарифы</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              <span className="sm:hidden">Платите за генерацию</span>
              <span className="hidden sm:inline">Платите только за то, что генерируете. Без абонентской платы.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden rounded-t-lg">
              <CardHeader className="relative">
                <CardTitle className="text-2xl">Стартовый</CardTitle>
                <div className="text-4xl font-bold text-foreground mt-2">990₽</div>
                <CardDescription className="text-base">80 токенов</CardDescription>
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

            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-visible relative rounded-t-lg">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wb-purple via-purple-500 to-pink-500 rounded-t-lg"></div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-wb-purple to-purple-600 text-white border-none px-4 py-1 text-xs font-bold shadow-lg">
                  ПОПУЛЯРНЫЙ
                </Badge>
              </div>
              <CardHeader className="relative pt-8">
                <CardTitle className="text-2xl">Профи</CardTitle>
                <div className="text-4xl font-bold text-foreground mt-2">2 990₽</div>
                <CardDescription className="text-base">250 токенов</CardDescription>
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

            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-white via-wb-purple/5 to-purple-50 overflow-hidden rounded-t-lg">
              <CardHeader className="relative">
                <CardTitle className="text-2xl">Бизнес</CardTitle>
                <div className="text-4xl font-bold text-foreground mt-2">9 990₽</div>
                <CardDescription className="text-base">850 токенов</CardDescription>
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
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-4 py-2 rounded-full text-xs sm:text-sm mb-6 border border-green-200">
              <PartyPopper className="w-4 h-4" />
              <span className="font-medium">Зарабатывайте вместе с нами</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Реферальная программа</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Делитесь с друзьями и получайте бонусы за каждого нового пользователя
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-white to-gray-50">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-wb-purple/10 to-wb-purple/5 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-wb-purple" />
                </div>
                <CardTitle className="text-2xl">Для вас</CardTitle>
                <CardDescription className="text-base space-y-4 pt-2">
                  <div className="bg-gradient-to-r from-wb-purple/5 to-transparent p-4 rounded-lg">
                    <div className="text-4xl font-bold text-wb-purple mb-2">+25</div>
                    <div className="text-sm text-muted-foreground">токенов за каждого друга, который совершил покупку</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Один реферал = <span className="font-bold text-foreground">297₽ экономии</span>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-white to-gray-50">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Для друзей</CardTitle>
                <CardDescription className="text-base space-y-4 pt-2">
                  <div className="bg-gradient-to-r from-green-500/5 to-transparent p-4 rounded-lg">
                    <div className="text-4xl font-bold text-green-600 mb-2">+10</div>
                    <div className="text-sm text-muted-foreground">токенов при регистрации по вашей реферальной ссылке</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Дополнительный бонус = <span className="font-bold text-foreground">119₽ в подарок</span>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Benefits Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
              <TrendingUp className="w-10 h-10 text-wb-purple mx-auto mb-3" />
              <div className="text-3xl font-bold text-wb-purple mb-1">∞</div>
              <div className="text-sm text-muted-foreground">Без лимитов рефералов</div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
              <Zap className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-green-600 mb-1">Мгновенно</div>
              <div className="text-sm text-muted-foreground">Токены зачисляются сразу</div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
              <Target className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-blue-600 mb-1">Легко</div>
              <div className="text-sm text-muted-foreground">Просто поделитесь ссылкой</div>
            </div>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={bg3d3} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-wb-purple/80 via-purple-600/80 to-wb-purple/90"></div>
          <div className="absolute top-10 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl"></div>
          {/* 3D Images */}
          <div className="absolute top-20 left-10 w-48 h-48 opacity-40 hidden lg:block transform -rotate-12">
            <img src={aiTech3d} alt="" className="w-full h-full object-contain animate-float" />
          </div>
          <div className="absolute bottom-20 right-10 w-56 h-56 opacity-40 hidden lg:block transform rotate-12">
            <img src={lightning3d} alt="" className="w-full h-full object-contain animate-float-delayed" />
          </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-xs sm:text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">Присоединяйтесь к тысячам продавцов</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white animate-fade-in">
            Начните прямо сейчас
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto animate-fade-in leading-relaxed">
            25 бесплатных токенов ждут вас. Создайте первые профессиональные карточки за 3 минуты.
          </p>
          
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto mb-10">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">₽0</div>
              <div className="text-xs sm:text-sm text-white/80">Начало работы</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">3 мин</div>
              <div className="text-xs sm:text-sm text-white/80">До результата</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">+40%</div>
              <div className="text-xs sm:text-sm text-white/80">Рост продаж</div>
            </div>
          </div>

          <div className="animate-fade-in">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-white text-wb-purple hover:bg-gray-100 text-sm sm:text-base md:text-lg px-6 sm:px-10 py-5 sm:py-7 hover-scale shadow-2xl font-semibold">
                Получить 25 токенов бесплатно
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-white/70 text-xs sm:text-sm mt-4">Без карты • Без обязательств • Мгновенный доступ</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;