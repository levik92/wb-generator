import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Image, FileText, Users, Star, Check } from "lucide-react";
import { Link } from "react-router-dom";
import heroDemo from "@/assets/hero-demo.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">WB Генератор</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Войти
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-wb-purple hover:bg-wb-purple-dark">
                Начать бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 animate-fade-in">
        <div className="container mx-auto px-6 text-center">
          <Badge variant="secondary" className="mb-6 animate-slide-up">
            <Star className="w-4 h-4 mr-2" />
            25 токенов бесплатно при регистрации
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-in">
            Карточки Wildberries <br />
            <span className="text-gradient">за минуты, не дни</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Создавайте профессиональные карточки товаров 960×1280 и SEO-описания 
            с помощью ИИ. Загружайте сразу в личный кабинет WB.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/auth">
              <Button size="lg" className="bg-wb-purple hover:bg-wb-purple-dark text-lg px-8 py-6">
                Начать генерацию
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Посмотреть примеры
            </Button>
          </div>

          {/* Demo Image */}
          <div className="bg-gradient-card rounded-xl border border-card-border p-8 max-w-4xl mx-auto animate-slide-up">
            <img 
              src={heroDemo} 
              alt="Демонстрация генерации карточек WB Генератор"
              className="w-full rounded-lg shadow-lg"
            />
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

          <div className="grid md:grid-cols-3 gap-8">
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
                  <Zap className="w-6 h-6 text-wb-purple" />
                </div>
                <CardTitle>2. ИИ создает карточки</CardTitle>
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
                <CardTitle>3. Скачайте и загрузите</CardTitle>
                <CardDescription>
                  Готовые PNG 960×1280 и SEO-описания в WB
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
                <CardDescription>50 токенов</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    8 комплектов карточек
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    50 описаний товаров
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    Интеграция с WB
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-wb-purple hover:bg-wb-purple-dark">
                  Выбрать план
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative border-wb-purple">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-wb-purple">Популярный</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Профи</CardTitle>
                <div className="text-3xl font-bold">1 499₽</div>
                <CardDescription>200 токенов</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    33 комплекта карточек
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    200 описаний товаров
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    Приоритетная поддержка
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
                <CardDescription>1000 токенов</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    166 комплектов карточек
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    1000 описаний товаров
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2" />
                    Персональный менеджер
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