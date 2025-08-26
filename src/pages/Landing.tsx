import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Image, FileText, Users, Star, Check, PartyPopper } from "lucide-react";
import { Link } from "react-router-dom";
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
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 px-8 py-4 rounded-full text-sm mb-8 border border-gray-200 shadow-sm">
            <img 
              src="/lovable-uploads/1e3fc63c-a046-40b8-aede-2f40b6764d7a.png" 
              alt="Празднично-коническая иконка" 
              className="w-7 h-7"
            />
            <span className="font-medium">25 токенов бесплатно при регистрации</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in px-4">
            Карточки Wildberries <br />
            <span className="text-gradient">за минуты и пару рублей, а не недели с большими затратами</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            Создавайте профессиональные изображения и описания для карточек товара 
            с помощью AI. Загружайте сразу в кабинет WB.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-sm sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto">
                Начать генерацию
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-xs sm:text-lg px-4 sm:px-8 py-4 sm:py-6 hover:bg-wb-purple/20 hover:text-wb-purple-dark border-wb-purple/30" onClick={scrollToExamples}>
              <span className="sm:hidden">Получить 25 токенов</span>
              <span className="hidden sm:inline">Получить 25 токенов бесплатно</span>
            </Button>
          </div>

          {/* Dashboard Preview Image */}
          <div className="mb-8 sm:mb-12 px-4">
            <div className="relative w-full max-w-4xl mx-auto">
              <img 
                src="/lovable-uploads/87afb2c1-c274-438e-83b8-8e802d3cbc2f.png" 
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
            {/* Example 1 */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Шампунь - Красота</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/bd25566b-5310-4b3e-9566-1ae44adbfd96.png"
                afterImage="/lovable-uploads/bd25566b-5310-4b3e-9566-1ae44adbfd96.png"
                alt="карточки шампуня"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 2 */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Платье - Мода</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/434e64b7-155f-4e2b-991e-315e5410c63f.png"
                afterImage="/lovable-uploads/e81af743-5bce-4a03-8419-1ccfe55207e2.png"
                alt="карточки платья"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 3 */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Йога-коврик - Спорт</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/931a1793-5bd1-4b46-aff7-85ff9dbdf802.png"
                afterImage="/lovable-uploads/1b4f8059-c780-42d1-b232-8937986d71c7.png"
                alt="карточки йога-коврика"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 4 - only shown on desktop */}
            <div className="max-w-xs sm:max-w-md mx-auto hidden lg:block">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Наушники - Электроника</h3>
              <BeforeAfterSlider
                beforeImage="/lovable-uploads/efffc212-88b5-4e2c-bc86-8d71f50283e9.png"
                afterImage="/lovable-uploads/4fc1d149-23bc-42ba-8a35-f732f142a15d.png"
                alt="карточки наушников"
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
              Три простых шага до готовых карточек товаров
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
              SEO-оптимизированные описания товаров для повышения конверсии
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
                Попробовать генерацию описаний
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="relative py-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gradient-to-r from-transparent via-wb-purple/20 to-transparent"></div>
        </div>
        <div className="relative flex justify-center">
          <div className="bg-background px-8">
            <div className="w-16 h-16 bg-gradient-to-br from-wb-purple/10 to-wb-purple/5 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-wb-purple" />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Прозрачные тарифы</h2>
            <p className="text-xl text-muted-foreground">
              Платите только за то, что генерируете
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Starter */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-xl">Стартовый</CardTitle>
                <div className="text-3xl font-bold">499₽</div>
                <CardDescription>50 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>9,98₽</strong> за токен
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 токен =</span>
                    <span className="text-xs sm:text-sm font-medium">1 описание товара</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">6 токенов =</span>
                    <span className="text-xs sm:text-sm font-medium">1 комплект карточек</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">8 комплектов карточек</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">50 описаний товаров</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Поддержка в чате</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
                  Выбрать план
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative border-wb-purple">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-wb-purple">Популярный</Badge>
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="text-xl">Профи</CardTitle>
                <div className="text-3xl font-bold">1 499₽</div>
                <CardDescription>200 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>7,50₽</strong> за токен
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 токен =</span>
                    <span className="text-xs sm:text-sm font-medium">1 описание товара</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">6 токенов =</span>
                    <span className="text-xs sm:text-sm font-medium">1 комплект карточек</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">33 комплекта карточек</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">200 описаний товаров</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Приоритетная поддержка</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Персональный менеджер</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
                  Выбрать план
                </Button>
              </CardContent>
            </Card>

            {/* Business */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-xl">Бизнес</CardTitle>
                <div className="text-3xl font-bold">5 999₽</div>
                <CardDescription>1000 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>6,00₽</strong> за токен
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">1 токен =</span>
                    <span className="text-xs sm:text-sm font-medium">1 описание товара</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm">6 токенов =</span>
                    <span className="text-xs sm:text-sm font-medium">1 комплект карточек</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">166 комплектов карточек</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">1000 описаний товаров</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Персональный менеджер</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-wb-purple mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">VIP поддержка 24/7</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
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
              Приглашайте друзей и получайте бонусы
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
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-base px-8 py-6 hover-scale">
                Получить 25 токенов бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
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