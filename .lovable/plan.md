

## Исправление часовых поясов в графиках админ-панели

### Проблема
При выборе периода 01.01 - 31.01 график показывает 31.12 - 30.01. Также после 12:00 (по Москве) часть данных "пропадает". Причина -- некорректная конвертация дат между фронтендом и бэкендом.

### Корневая причина
- Фронтенд отправляет даты через `.toISOString()`, который смещает на -3 часа (UTC вместо Москвы)
- Бэкенд нормализует даты по UTC-полуночи (`setUTCHours(0,0,0,0)`), а не по московской полуночи

### Решение

#### 1. Фронтенд (`src/components/dashboard/AdminAnalyticsChart.tsx`)

Отправлять даты как строки `YYYY-MM-DD` (без таймзоны), чтобы бэкенд мог интерпретировать их как московские даты:

```typescript
// Было:
body.startDateCustom = effectiveDateRange.from.toISOString();
body.endDateCustom = effectiveDateRange.to.toISOString();

// Станет:
const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
body.startDateCustom = formatLocalDate(effectiveDateRange.from);
body.endDateCustom = formatLocalDate(effectiveDateRange.to);
```

Аналогичное изменение для `AdminAdditionalMetrics` (строки ~490-510).

#### 2. Бэкенд (`supabase/functions/admin-analytics/index.ts`)

Парсить входящие даты как московские и конвертировать в UTC для запросов к БД:

```typescript
// Было:
startDate = new Date(startDateCustom)
endDate = new Date(endDateCustom)
startDate.setUTCHours(0, 0, 0, 0)
endDate.setUTCHours(23, 59, 59, 999)

// Станет:
// Парсим как московскую дату (YYYY-MM-DD -> начало дня по Москве = -3ч от UTC)
const [sy, sm, sd] = startDateCustom.split('-').map(Number)
const [ey, em, ed] = endDateCustom.split('-').map(Number)
// 00:00 по Москве = 21:00 предыдущего дня по UTC
startDate = new Date(Date.UTC(sy, sm - 1, sd, 0 - 3, 0, 0, 0))
// 23:59:59.999 по Москве = 20:59:59.999 по UTC
endDate = new Date(Date.UTC(ey, em - 1, ed, 23 - 3, 59, 59, 999))
```

#### 3. Результат
- Выбор 01.01 - 31.01 будет корректно запрашивать данные с 31.12 21:00 UTC (= 01.01 00:00 МСК) по 31.01 20:59 UTC (= 31.01 23:59 МСК)
- Данные будут группироваться по московскому времени (эта логика уже работает через `toMoscowDate`)
- Пропуск данных после 12:00 исчезнет, т.к. границы дней будут правильными

### Файлы для изменения
1. `src/components/dashboard/AdminAnalyticsChart.tsx` -- формат отправки дат (2 места: основной компонент и AdminAdditionalMetrics)
2. `supabase/functions/admin-analytics/index.ts` -- парсинг дат с учётом МСК
3. Деплой edge-функции `admin-analytics`
