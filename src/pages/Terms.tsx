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
          <p className="text-muted-foreground text-sm">Последнее обновление: 27 января 2026 г.</p>
        </div>

        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-lg">Договор-оферта на оказание услуг</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm sm:text-base">
            <div>
              <h3 className="font-semibold mb-3">1. Общие положения</h3>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                1.1. Настоящий Договор-оферта (далее — «Договор») является официальным предложением Индивидуального предпринимателя Чупина Антона Дмитриевича (далее — «Исполнитель») на оказание услуг по генерации карточек товаров, SEO-описаний и иных сервисов для маркетплейсов.
              </p>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                1.2. Акцептом настоящей оферты является регистрация на сайте wbgen.ru и/или оплата услуг. С момента акцепта настоящий Договор считается заключённым.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">2. Предмет договора</h3>
              <p className="mb-3 text-muted-foreground">2.1. Исполнитель обязуется оказать Заказчику следующие услуги:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Генерация карточек товаров размером 960×1280 пикселей</li>
                <li>Создание SEO-оптимизированных описаний для маркетплейсов</li>
                <li>Генерация штрихкодов и этикеток</li>
                <li>Генерация видеоконтента для товаров</li>
                <li>Предоставление доступа к онлайн-платформе wbgen.ru</li>
              </ul>
              <p className="mt-3 text-muted-foreground">
                2.2. Услуги оказываются посредством автоматизированной онлайн-платформы с использованием технологий искусственного интеллекта.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">3. Права и обязанности сторон</h3>
              <p className="mb-3 text-muted-foreground font-medium">3.1. Исполнитель обязуется:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground mb-4">
                <li>Обеспечить доступ к платформе 24/7 (за исключением технических работ)</li>
                <li>Оказывать услуги надлежащего качества</li>
                <li>Обеспечить сохранность персональных данных Заказчика</li>
                <li>Своевременно информировать о изменениях в работе сервиса</li>
              </ul>
              <p className="mb-3 text-muted-foreground font-medium">3.2. Заказчик обязуется:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Предоставлять достоверную информацию при регистрации</li>
                <li>Своевременно оплачивать услуги</li>
                <li>Не использовать сервис для незаконных целей</li>
                <li>Соблюдать условия настоящего Договора</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">4. Стоимость услуг и порядок оплаты</h3>
              <p className="mb-3 text-muted-foreground">4.1. Доступ к услугам предоставляется по подписке. Действующие тарифные планы:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>«Старт» — 490 ₽ / 30 дней, 40 токенов</li>
                <li>«Работа» — 1 190 ₽ / 30 дней, 100 токенов</li>
                <li>«Профи» — 2 990 ₽ / 30 дней, 300 токенов</li>
              </ul>
              <p className="mt-3 text-muted-foreground">
                4.2. Стоимость операций в токенах определяется Исполнителем и может быть изменена. Актуальные цены отображаются на сайте.
              </p>
              <p className="mt-3 text-muted-foreground">
                4.3. Подписка продлевается автоматически. Неиспользованные токены сгорают по окончании оплаченного периода.
              </p>
              <p className="mt-3 text-muted-foreground">
                4.4. Дополнительное пополнение: +100 токенов за 990 ₽, действуют до конца текущего периода подписки.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">5. Возврат средств</h3>
              <p className="mb-3 text-muted-foreground">
                5.1. Возврат денежных средств осуществляется в случае технической невозможности оказания услуг по вине Исполнителя.
              </p>
              <p className="mb-3 text-muted-foreground">
                5.2. Заявка на возврат направляется на email: info@wbgen.ru в течение 14 дней с момента оплаты.
              </p>
              <p className="text-muted-foreground">
                5.3. Возврат осуществляется в течение 10 рабочих дней на реквизиты, с которых была произведена оплата.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">6. Ответственность сторон</h3>
              <p className="mb-3 text-muted-foreground">
                6.1. Исполнитель не несёт ответственности за результаты использования сгенерированных материалов на маркетплейсах.
              </p>
              <p className="mb-3 text-muted-foreground">
                6.2. Исполнитель не гарантирует конкретных результатов продаж при использовании созданных материалов.
              </p>
              <p className="text-muted-foreground">
                6.3. Заказчик несёт полную ответственность за содержание загружаемых материалов и их соответствие законодательству РФ.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">7. Срок действия и расторжение</h3>
              <p className="mb-3 text-muted-foreground">
                7.1. Договор вступает в силу с момента акцепта и действует до полного исполнения сторонами своих обязательств.
              </p>
              <p className="text-muted-foreground">
                7.2. Любая из сторон вправе расторгнуть Договор, уведомив другую сторону за 7 дней.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">8. Заключительные положения</h3>
              <p className="mb-3 text-muted-foreground">
                8.1. Все споры разрешаются путём переговоров, а при недостижении согласия — в суде по месту нахождения Исполнителя.
              </p>
              <p className="text-muted-foreground">
                8.2. Исполнитель вправе вносить изменения в настоящий Договор с уведомлением Заказчиков через сайт.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="font-medium mb-3 text-sm">Реквизиты Исполнителя:</p>
              <ul className="list-none space-y-1 text-xs text-muted-foreground">
                <li><strong>Наименование:</strong> Индивидуальный предприниматель Чупин Антон Дмитриевич</li>
                <li><strong>ИНН:</strong> 723013381128</li>
                <li><strong>Расчётный счёт:</strong> 40802810120000608278</li>
                <li><strong>Банк:</strong> ООО «Банк Точка»</li>
                <li><strong>БИК:</strong> 044525104</li>
                <li><strong>Корр. счёт:</strong> 30101810745374525104</li>
                <li><strong>Email:</strong> info@wbgen.ru</li>
                <li><strong>Сайт:</strong> wbgen.ru</li>
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
