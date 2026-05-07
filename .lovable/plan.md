Новая гипотеза: предыдущая правка не сработала, потому что проект одновременно смешивает старый API `widget.pay('charge', ...)` и новый формат параметров CloudPayments (`publicTerminalId`, `paymentSchema`, `externalId`), а CSS-исключение не покрывает реальную DOM-структуру мобильного виджета.

Что уже подтверждено:
- У пользователя `karinakracyk@gmail.com` новые платежи всё ещё создаются в БД как `pending`, значит backend `create-payment` дорабатывает успешно.
- За эти попытки нет ни одного webhook от CloudPayments, значит пользователь не доходит до реальной оплаты/транзакции; проблема на этапе открытия/работы виджета.
- Официальная документация CloudPayments для текущего виджета показывает основной метод `widget.start(intentParams)` с параметрами `publicTerminalId`, `paymentSchema`, `externalId`, `metadata`, `receipt`.
- В коде сейчас используется старый вызов `widget.pay('charge', ...)`, но в него передаются частично новые параметры, переименованные обратно в старые (`publicId`, `invoiceId`, `data`). Это вероятная причина закрытия/сбоя виджета.

План исправления:

1. Перевести фронтенд на актуальный API CloudPayments
   - В `src/components/dashboard/Pricing.tsx` заменить `widget.pay('charge', ...)` на `widget.start(intentParams)`.
   - Передавать параметры в формате, который уже возвращает edge function: `publicTerminalId`, `description`, `amount`, `currency`, `paymentSchema: 'Single'`, `externalId`, `userInfo`, `metadata`, `receipt`, `skin`, `autoClose`, `successRedirectUrl`, `failRedirectUrl`.
   - Оставить ожидание загрузки библиотеки, но проверять именно наличие конструктора `cp.CloudPayments` перед созданием виджета.
   - Обработать Promise от `widget.start(...)`: success/fail/cancel показывать русскими сообщениями и корректно сбрасывать состояние кнопки.

2. Упростить и привести ответ `create-payment` к новому формату
   - В `supabase/functions/create-payment/index.ts` оставить `paymentSchema`, `externalId`, `autoClose`, `successRedirectUrl`, `failRedirectUrl`, потому что они нужны именно для `start()`.
   - Дублировать чек в новом поле `receipt` и сохранить метаданные в `metadata`, чтобы виджет не зависел только от legacy `data.CloudPayments.CustomerReceipt`.
   - При необходимости оставить legacy `data.CloudPayments.CustomerReceipt` для совместимости, но основной путь сделать через `receipt`/`metadata`.

3. Полностью изолировать CloudPayments от глобальных CSS
   - В `src/index.css` заменить точечные исключения для input на безопасную стратегию: не применять глобальные стили к элементам внутри CloudPayments overlay/iframe/container, включая классы/ID/атрибуты с `cloudpayments`, `cp`, `widget`, а также поля `cardNumber`, `expDateMonthYear`, `cvv`, `name`.
   - Убрать рискованный `border: initial !important`/`font-size: initial !important` для CP-полей и заменить на `all: revert`/минимальные сбросы только для реально принадлежащих виджету элементов, чтобы не ломать маски ввода.
   - Добавить исключения для `textarea/select/button[role="combobox"]` только там, где они не находятся в платёжном оверлее.

4. Почистить зависшие попытки пользователя
   - Добавить миграцию, которая переведёт старые `pending` CloudPayments-платежи пользователя `karinakracyk@gmail.com` в `expired`/`canceled` только если они старше нескольких минут.
   - Не трогать успешные платежи и не менять балансы.

5. Проверка после правки
   - Проверить, что код больше не содержит смешанного вызова `widget.pay('charge', ...)` для нового формата.
   - Проверить в БД, что новые попытки будут создаваться с корректным `external_payment_id`.
   - Проверить логи edge function после деплоя/вызова: `create-payment` создаёт intent, а webhook остаётся готов принимать `InvoiceId`/`metadata.external_payment_id`.

Ожидаемый результат:
- На ноутбуке окно оплаты не должно закрываться сразу после загрузки.
- На телефоне поля карты должны работать штатно, без перемешивания цифр и ошибочной валидации даты.
- Если оплата не прошла или пользователь закрыл окно, кнопка корректно разблокируется и покажет понятное сообщение на русском.