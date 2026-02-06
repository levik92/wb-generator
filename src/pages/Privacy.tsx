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
          <p className="text-muted-foreground text-sm">Последнее обновление: 27 января 2026 г.</p>
        </div>

        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-lg">Политика обработки персональных данных</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm sm:text-base">
            <div>
              <h3 className="font-semibold mb-3">1. Общие положения</h3>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                1.1. Настоящая Политика конфиденциальности персональных данных (далее — «Политика») действует в отношении всей информации, которую сервис WB Генератор (wbgen.ru), принадлежащий ИП Чупину Антону Дмитриевичу, может получить о Пользователе во время использования сайта и сервисов.
              </p>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                1.2. Использование сервисов WB Генератор означает безоговорочное согласие Пользователя с настоящей Политикой и указанными в ней условиями обработки персональных данных.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                1.3. В случае несогласия с условиями Политики Пользователь должен прекратить использование сервисов.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">2. Персональная информация</h3>
              <p className="mb-3 text-muted-foreground">2.1. В рамках настоящей Политики WB Генератор обрабатывает следующие персональные данные:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Адрес электронной почты</li>
                <li>Имя пользователя (при наличии)</li>
                <li>Данные об использовании сервиса (история генераций)</li>
                <li>Информация о загружаемых изображениях товаров</li>
                <li>История транзакций и платежей</li>
                <li>IP-адрес и данные о браузере</li>
                <li>Файлы cookie и аналогичные технологии</li>
              </ul>
              <p className="mt-3 text-muted-foreground">
                2.2. Персональные данные предоставляются Пользователем добровольно при регистрации и использовании сервиса.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">3. Цели обработки персональных данных</h3>
              <p className="mb-3 text-muted-foreground">3.1. Персональные данные обрабатываются в следующих целях:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Идентификация Пользователя для предоставления доступа к сервису</li>
                <li>Обработка платежей и ведение истории транзакций</li>
                <li>Связь с Пользователем для технической поддержки</li>
                <li>Улучшение качества сервиса и разработка новых функций</li>
                <li>Проведение статистических исследований</li>
                <li>Выполнение требований законодательства РФ</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">4. Защита персональных данных</h3>
              <p className="mb-3 text-muted-foreground">
                4.1. Оператор принимает необходимые организационные и технические меры для защиты персональных данных от неправомерного доступа, уничтожения, изменения, блокирования, копирования и распространения.
              </p>
              <p className="mb-3 text-muted-foreground">
                4.2. Персональные данные хранятся на защищённых серверах с использованием современных методов шифрования.
              </p>
              <p className="text-muted-foreground">
                4.3. Доступ к персональным данным имеют только уполномоченные сотрудники, которые дали обязательство о неразглашении.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">5. Передача персональных данных третьим лицам</h3>
              <p className="mb-3 text-muted-foreground">
                5.1. Персональные данные могут быть переданы третьим лицам в следующих случаях:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>С согласия Пользователя</li>
                <li>Для обработки платежей (платёжным системам и агентам)</li>
                <li>По требованию законодательства РФ</li>
                <li>Для защиты прав и законных интересов Оператора</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">6. Права пользователя</h3>
              <p className="mb-3 text-muted-foreground">6.1. Пользователь имеет право:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                <li>Получить информацию об обработке своих персональных данных</li>
                <li>Требовать уточнения, блокирования или уничтожения персональных данных</li>
                <li>Отозвать согласие на обработку персональных данных</li>
                <li>Обжаловать действия Оператора в Роскомнадзор</li>
              </ul>
              <p className="mt-3 text-muted-foreground">
                6.2. Для реализации своих прав Пользователь может обратиться по адресу: info@wbgen.ru
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">7. Файлы cookie</h3>
              <p className="mb-3 text-muted-foreground">
                7.1. Сервис использует файлы cookie для улучшения работы сайта и персонализации контента.
              </p>
              <p className="text-muted-foreground">
                7.2. Пользователь может отключить использование cookie в настройках браузера, однако это может повлиять на функциональность сервиса.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">8. Изменение политики</h3>
              <p className="mb-3 text-muted-foreground">
                8.1. Оператор вправе вносить изменения в настоящую Политику без согласия Пользователя.
              </p>
              <p className="text-muted-foreground">
                8.2. Новая редакция Политики вступает в силу с момента её размещения на сайте, если иное не предусмотрено новой редакцией.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">9. Контактная информация</h3>
              <p className="mb-4 text-muted-foreground">
                По всем вопросам, связанным с обработкой персональных данных, обращайтесь: info@wbgen.ru
              </p>
              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="font-medium mb-3 text-sm">Реквизиты Оператора:</p>
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
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
