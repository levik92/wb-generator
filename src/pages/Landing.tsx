import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Image, FileText, Users, Star, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
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
            <div className="w-8 h-8 bg-gradient-hero rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-semibold">WB Генератор</span>
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
      <section className="pt-12 sm:pt-20 pb-12 sm:pb-16 animate-fade-in">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <Badge variant="secondary" className="mb-6 animate-slide-up text-xs sm:text-sm">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            25 токенов бесплатно при регистрации
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in px-4">
            Карточки Wildberries <br />
            <span className="text-gradient">за минуты, не дни</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            Создавайте профессиональные карточки товаров 960×1280 и SEO-описания 
            с помощью ИИ. Загружайте сразу в личный кабинет WB.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto">
                Начать генерацию
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 hover:bg-wb-purple/20 hover:text-wb-purple-dark border-wb-purple/30" onClick={scrollToExamples}>
              Посмотреть примеры
            </Button>
          </div>

          {/* Demo Image */}
          <div className="bg-gradient-card rounded-xl border border-card-border p-4 sm:p-8 max-w-4xl mx-auto animate-slide-up">
            <img 
              src={dashboardDemo} 
              alt="Интерфейс WB Генератор - панель для создания карточек товаров"
              className="w-full rounded-lg shadow-lg"
            />
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
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Смартфон - Электроника</h3>
              <BeforeAfterSlider
                beforeImage={exampleBefore1}
                afterImage={exampleAfter1}
                alt="карточки смартфона"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 2 */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Косметика - Красота</h3>
              <BeforeAfterSlider
                beforeImage={exampleBefore2}
                afterImage={exampleAfter2}
                alt="карточки косметики"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 3 */}
            <div className="max-w-xs sm:max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Одежда - Мода</h3>
              <BeforeAfterSlider
                beforeImage={exampleBefore3}
                afterImage={exampleAfter3}
                alt="карточки одежды"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>

            {/* Example 4 - only shown on desktop */}
            <div className="max-w-xs sm:max-w-md mx-auto hidden lg:block">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">Спорт - Фитнес</h3>
              <BeforeAfterSlider
                beforeImage={exampleBefore1}
                afterImage={exampleAfter1}
                alt="карточки спорттоваров"
              />
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
                Перетаскивайте ползунок, чтобы увидеть разницу
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
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
                <CardTitle>1. Загрузите фото</CardTitle>
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
                <CardTitle>2. Опишите товар</CardTitle>
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
                <CardTitle>3. ИИ создает карточки</CardTitle>
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
                <CardTitle>4. Скачайте и загрузите</CardTitle>
                <CardDescription>
                  Скачайте готовые PNG и загрузите в свой кабинет WB
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

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
                <CardDescription>40 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>12,50₽</strong> за токен
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    6 комплектов карточек (6 токенов за комплект)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    40 описаний товаров (1 токен за описание)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    Поддержка в чате
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-wb-purple hover:bg-wb-purple-dark">
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
                <CardDescription>130 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>11,50₽</strong> за токен
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    21 комплект карточек (6 токенов за комплект)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    130 описаний товаров (1 токен за описание)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    Приоритетная поддержка
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    Персональный менеджер
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-wb-purple hover:bg-wb-purple-dark">
                  Выбрать план
                </Button>
              </CardContent>
            </Card>

            {/* Business */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-xl">Бизнес</CardTitle>
                <div className="text-3xl font-bold">5 999₽</div>
                <CardDescription>550 токенов</CardDescription>
                <div className="text-sm text-muted-foreground mt-2">
                  <strong>10,90₽</strong> за токен
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    91 комплект карточек (6 токенов за комплект)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    550 описаний товаров (1 токен за описание)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    Персональный менеджер
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    VIP поддержка 24/7
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-wb-purple hover:bg-wb-purple-dark">
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
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Начните прямо сейчас
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            25 бесплатных токенов ждут вас. Создайте первые карточки за несколько минут.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-lg px-8 py-6">
              Получить 25 токенов бесплатно
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2024 WB Генератор. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;