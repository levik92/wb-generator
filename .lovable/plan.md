

# План: 3 типа промокодов + контроль использований на аккаунт

## Суть изменений

Сейчас 2 типа: `tokens` (после оплаты) и `discount`. Нужно добавить третий тип `tokens_instant` — токены начисляются сразу без оплаты. Плюс добавить поле «макс. использований на аккаунт», которое для `tokens_instant` всегда заблокировано и равно 1.

## 1. Миграция БД

Обновить CHECK constraint на `promocodes.type`, чтобы допускал 3 значения: `tokens`, `discount`, `tokens_instant`. Добавить колонку `max_uses_per_user` (integer, nullable, default null = неограниченно).

## 2. PromoCodeManager.tsx (админка)

- Тип `type` расширить до 3 значений: `'tokens' | 'discount' | 'tokens_instant'`
- В Select добавить 3 опции:
  - «Бонусные токены (после оплаты)» — `tokens`
  - «Скидка (%)» — `discount`
  - «Бонусные токены (сразу)» — `tokens_instant`
- Добавить поле `maxUsesPerUser` в форму — «Макс. использований на аккаунт»
  - Если тип = `tokens_instant` → поле disabled, значение принудительно = 1
  - Иначе → поле редактируемое, пустое = неограниченно
- В таблице обновить отображение бейджей для 3 типов
- При сохранении передавать `max_uses_per_user` в БД

## 3. PromoCodeInput.tsx (при оплате)

- Обновить тип `PromoCodeInfo` — добавить `tokens_instant`
- При валидации: если промокод типа `tokens_instant` — показать ошибку «Этот промокод нужно активировать в разделе Бонусы» (не давать применить при оплате)
- Типы `tokens` и `discount` работают как раньше

## 4. Edge Function redeem-promocode

- Принимать тип `tokens_instant` (вместо `tokens`)
- Проверять `max_uses_per_user`: считать количество записей в `promocode_uses` для данного user+promo и сравнивать с лимитом
- Для `tokens_instant` лимит всегда 1 (дополнительная серверная проверка)

## 5. RedeemPromoCode.tsx (раздел Бонусы)

- Обновить: принимать только `tokens_instant` тип (отказывать в `tokens` и `discount` — «Этот промокод применяется при оплате»)

## Файлы

| Файл | Действие |
|---|---|
| Миграция SQL | Добавить `tokens_instant` в constraint, колонку `max_uses_per_user` |
| `src/components/dashboard/PromoCodeManager.tsx` | 3 типа, поле max_uses_per_user, блокировка для instant |
| `src/components/dashboard/PromoCodeInput.tsx` | Блокировать `tokens_instant` при оплате |
| `supabase/functions/redeem-promocode/index.ts` | Принимать `tokens_instant`, проверять per-user лимит |
| `src/components/dashboard/RedeemPromoCode.tsx` | Принимать только `tokens_instant` |

