import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";

const PartnerAgreement = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/partners" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors gap-2">
            <ArrowLeft className="w-4 h-4" />
            Назад к партнёрской программе
          </Link>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">Публичная оферта партнёрской программы WBGen</h1>
          <p className="text-muted-foreground text-sm">Последнее обновление: 15 января 2025 г.</p>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">1. Общие положения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <p className="text-muted-foreground leading-relaxed">
                1.1. Настоящий текст является официальным предложением (публичной офертой) ОБЩЕСТВА С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «МАРКЕТШОП №1» при использовании онлайн-сервиса WBGen, доступного в сети Интернет по адресу: https://wbgen.ru (далее — «Организатор»).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                1.2. Каждая Сторона гарантирует другой Стороне, что обладает необходимой право- и дееспособностью, а равно всеми правами и полномочиями, необходимыми для заключения и исполнения Публичной оферты.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                1.3. Действующая редакция настоящей Публичной оферты размещена на сайте https://wbgen.ru и в обязательном порядке предлагается для ознакомления Партнёру до момента акцепта.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">2. Термины и определения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Партнёрская программа</strong> — система сотрудничества, организованная онлайн-сервисом WBGen, в рамках которой Партнёр привлекает новых пользователей на платформу, используя уникальные реферальные ссылки.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Партнёр</strong> — юридическое лицо, индивидуальный предприниматель или физическое лицо, зарегистрированное в качестве налогоплательщика на профессиональный доход, которое принимает условия настоящей Публичной оферты.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Реферальная ссылка</strong> — специальная ссылка, содержащая уникальный идентификатор Партнёра, который позволяет отслеживать переходы и действия новых пользователей.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Клиент</strong> — физическое или юридическое лицо, зарегистрировавшееся и оплатившее услуги онлайн-сервиса WBGen через реферальную ссылку Партнёра.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">3. Предмет публичной оферты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <p className="text-muted-foreground leading-relaxed">
                3.1. Организатор поручает, а Партнёр принимает на себя обязательства по оказанию Организатору услуг по продвижению онлайн-сервиса WBGen и привлечению Клиентов, используя реферальные ссылки.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                3.2. Любые соглашения с Клиентами заключаются непосредственно Организатором. Партнёр не подписывает никаких договоров с Клиентами и не принимает на свои счета денежных средств.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">4. Условия вознаграждения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <p className="text-muted-foreground leading-relaxed">
                4.1. Партнёр получает вознаграждение в размере <strong className="text-foreground">20% (двадцать процентов)</strong> от суммы каждого платежа Клиента, привлечённого по реферальной ссылке Партнёра.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                4.2. Вознаграждение начисляется со всех платежей Клиента в течение всего срока использования им сервиса WBGen.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                4.3. Минимальная сумма для вывода вознаграждения составляет <strong className="text-foreground">5000 (пять тысяч) рублей</strong>.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                4.4. Вывод средств осуществляется на банковскую карту Партнёра в течение 3 (трёх) рабочих дней с момента подачи заявки.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">5. Права и обязанности сторон</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <div>
                <p className="font-medium mb-2">5.1. Партнёр обязуется:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Использовать реферальные ссылки исключительно для продвижения WBGen</li>
                  <li>Не совершать действий, наносящих ущерб репутации Организатора</li>
                  <li>Не использовать спам и вводящую в заблуждение рекламу</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">5.2. Организатор обязуется:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Своевременно начислять вознаграждение Партнёру</li>
                  <li>Обеспечить доступ к личному кабинету со статистикой</li>
                  <li>Предоставить корректно работающие реферальные ссылки</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">6. Ответственность сторон</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <p className="text-muted-foreground leading-relaxed">
                6.1. Организатор вправе приостановить участие Партнёра в программе при нарушении условий настоящей оферты.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                6.2. В случае обнаружения мошенничества начисленное вознаграждение может быть аннулировано.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">7. Заключительные положения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <p className="text-muted-foreground leading-relaxed">
                7.1. Настоящая оферта вступает в силу с момента акцепта и действует бессрочно.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                7.2. Организатор вправе вносить изменения в условия оферты с уведомлением Партнёров.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-lg">Реквизиты Организатора</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-muted-foreground">
                  <p><strong className="text-foreground">Наименование:</strong> ООО «МАРКЕТШОП №1»</p>
                  <p><strong className="text-foreground">ИНН:</strong> 6700002780</p>
                  <p><strong className="text-foreground">ОГРН:</strong> 1236700010678</p>
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <p><strong className="text-foreground">Сайт:</strong> https://wbgen.ru</p>
                  <p><strong className="text-foreground">Email:</strong> info@wbgen.ru</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PartnerAgreement;
