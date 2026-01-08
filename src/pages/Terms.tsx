import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors gap-2">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">Договор оферты</h1>
          <p className="text-muted-foreground text-sm">Последнее обновление: 26 августа 2025 г.</p>
        </div>

        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-lg">Договор-оферта на оказание услуг</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm sm:text-base">
            <div>
              <h3 className="font-semibold mb-3">1. Общие положения</h3>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                Настоящий Договор-оферта является официальным предложением WB Генератор на оказание услуг по генерации карточек товаров и SEO-описаний для маркетплейсов.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">2. Предмет договора</h3>
              <p className="mb-3 text-muted-foreground">Исполнитель обязуется оказать услуги по:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Генерации карточек товаров 960×1280 пикселей</li>
                <li>Созданию SEO-оптимизированных описаний</li>
                <li>Предоставлению доступа к онлайн-платформе</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">4. Стоимость услуг</h3>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Генерация комплекта карточек: 6 токенов</li>
                <li>SEO-описание: 1 токен</li>
                <li>При регистрации: 10 бесплатных токенов</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="font-medium mb-2 text-sm">Реквизиты Исполнителя:</p>
              <ul className="list-none space-y-1 text-xs text-muted-foreground">
                <li><strong>Наименование:</strong> ООО "МАРКЕТШОП №1"</li>
                <li><strong>ИНН:</strong> 6700002780</li>
                <li><strong>Email:</strong> info@wbgen.ru</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
