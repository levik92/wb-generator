import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Image, FileText, Users, Star, Check, PartyPopper, BarChart3, QrCode, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import Footer from "@/components/Footer";
import heroDemo from "@/assets/hero-demo.jpg";
import dashboardDemo from "@/assets/dashboard-demo.png";
import exampleBefore1 from "@/assets/example-before-after-1.jpg";
import exampleBefore2 from "@/assets/example-before-after-2.jpg";
import exampleBefore3 from "@/assets/example-before-after-3.jpg";
import exampleAfter1 from "@/assets/example-after-1.jpg";
import exampleAfter2 from "@/assets/example-after-2.jpg";
import exampleAfter3 from "@/assets/example-after-3.jpg";

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
      <section className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 animate-fade-in overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-wb-purple/5 via-transparent to-wb-purple/10"></div>
        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 px-4 py-2 rounded-full text-xs mb-6 border border-gray-200 shadow-sm">
            <img 
              src="/lovable-uploads/1e3fc63c-a046-40b8-aede-2f40b6764d7a.png" 
              alt="Празднично-коническая иконка" 
              className="w-4 h-4"
            />
            <span className="font-medium">25 токенов бесплатно при регистрации</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in px-4">
            <span className="text-gradient">Создавайте продающие карточки для Wildberries за пару минут без дизайнера</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            AI-сервис для генерации дизайнерских изображений, SEO-описаний, штрихкодов, ответов на вопросы и отзывы.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 sm:mb-16 px-4">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-sm sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto">
                Начать генерацию
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-xs sm:text-lg px-4 sm:px-8 py-4 sm:py-6 hover:bg-wb-purple/20 hover:text-wb-purple-dark border-wb-purple/30" onClick={scrollToExamples}>
              <span className="sm:hidden">Посмотреть примеры</span>
              <span className="hidden sm:inline">Посмотреть примеры работ</span>
            </Button>
          </div>

          {/* Dashboard Preview Image */}
          <div className="mb-8 sm:mb-12 px-4">
            <div className="relative w-full max-w-4xl mx-auto">
              <img 
                src="/lovable-uploads/289c8992-c5b0-4dab-8da4-70befe803ab0.png" 
                alt="Интерфейс WB Генератор - панель для создания карточек товаров"
                className="w-full rounded-lg border-4 border-wb-purple/30 shadow-2xl shadow-wb-purple/20"
              />
            </div>
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
                beforeImage="/lovable-uploads/4fc1d149-23bc-42ba-8a35-f732f142a15d.png"
                afterImage="/lovable-uploads/efffc212-88b5-4e2c-bc86-8d71f50283e9.png"
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
                beforeImage="/lovable-uploads/e81af743-5bce-4a03-8419-1ccfe55207e2.png"
                afterImage="/lovable-uploads/434e64b7-155f-4e2b-991e-315e5410c63f.png"
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
                beforeImage="/lovable-uploads/bd25566b-5310-4b3e-9566-1ae44adbfd96.png"
                afterImage="/lovable-uploads/f6516fa1-8576-4774-8a31-c2ef5b995e6a.png"
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
                beforeImage="/lovable-uploads/1b4f8059-c780-42d1-b232-8937986d71c7.png"
                afterImage="/lovable-uploads/931a1793-5bd1-4b46-aff7-85ff9dbdf802.png"
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
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Как это работает</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              <span className="sm:hidden">Простые шаги создания</span>
              <span className="hidden sm:inline">Три простых шага до готовых карточек товаров</span>
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-wb-purple/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Image className="w-6 h-6 text-wb-purple" />
                </div>
                <CardTitle className="text-base sm:text-lg">1. Загрузите фото</CardTitle>
                <CardDescription>
                  До 10 фотографий товара на белом фоне
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-wb-purple/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-wb-purple" />
                </div>
                <CardTitle className="text-base sm:text-lg">2. Опишите товар</CardTitle>
                <CardDescription>
                  Добавьте описание, преимущества и пожелания по дизайну
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-wb-purple/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-wb-purple" />
                </div>
                <CardTitle className="text-base sm:text-lg">3. ИИ создает карточки</CardTitle>
                <CardDescription>
                  6 этапов: hero, usage, инфографика, сравнение, детали, финал
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-wb-purple/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-wb-purple" />
                </div>
                <CardTitle className="text-base sm:text-lg">4. Скачайте и загрузите</CardTitle>
                <CardDescription>
                  Скачайте готовые PNG и загрузите в свой кабинет WB
                </CardDescription>
              </CardHeader>
            </Card>
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