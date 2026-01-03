import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";

const Privacy = () => {
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">Политика конфиденциальности</h1>
          <p className="text-muted-foreground text-sm">Последнее обновление: 26 августа 2025 г.</p>
        </div>

        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-lg">1. Общие положения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm sm:text-base">
            <div>
              <h3 className="font-semibold mb-3">1.1. Основные понятия</h3>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                Настоящая Политика конфиденциальности персональных данных действует в отношении всей информации, которую WB Генератор может получить о Пользователе во время использования сайта wbgen.ru.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Использование сервисов WB Генератор означает безоговорочное согласие пользователя с настоящей Политикой.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">2. Персональная информация</h3>
              <p className="mb-3 text-muted-foreground">WB Генератор обрабатывает следующие данные:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Адрес электронной почты</li>
                <li>Имя пользователя</li>
                <li>Данные об использовании сервиса</li>
                <li>Информация о загружаемых изображениях</li>
                <li>История генераций и транзакций</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">7. Контактная информация</h3>
              <p className="mb-4 text-muted-foreground">Вопросы направляйте по адресу: info@wbgen.ru</p>
              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="font-medium mb-2 text-sm">Реквизиты:</p>
                <ul className="list-none space-y-1 text-xs text-muted-foreground">
                  <li><strong>Наименование:</strong> ООО "МАРКЕТШОП №1"</li>
                  <li><strong>ИНН:</strong> 6700002780</li>
                  <li><strong>Сайт:</strong> wbgen.ru</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
