
## Что отправилось сейчас на перегенерацию (по вашим логам сети)

Я посмотрел последний запрос **POST** на edge function:

**`/functions/v1/regenerate-single-card-banana`** (2026-01-27T11:02:40Z)

В payload ушло:

- `productName`: `"Коврик придверный"` ✅
- `category`: `"товар"` ✅
- `description`: `"поменяй товар мой местами..."` ✅
- `userId`: `"000a02ee-..."` ✅
- `cardIndex`: `6` ✅
- `cardType`: `"mainEdit"` ✅ (тип “Редактирование изображения” сохранился в этом запросе)
- `sourceImageUrl`: `.../1769511637796_0.jpeg` ✅
- `productImages`: **только 2 картинки товара** ✅❌
  - `[{ url: ...0.jpeg, type:"product" }, { url: ...1.jpeg, type:"product" }]`
  - **Референс НЕ ушёл** ❌ (в `productImages` нет элемента `type:"reference"`)

То есть в этой попытке проблема конкретно в том, что **в перегенерацию не передался reference** (хотя в `generation_jobs.product_images` референс у вас есть — это видно по предыдущим GET к `generation_jobs`, там третий элемент с `type:"reference"`).

---

## Почему так происходит (корневая причина)

В `src/components/dashboard/GenerateCards.tsx` в функции `simulateGeneration` после загрузки изображений в storage вы сохраняете `jobData` и `uploadedProductImages` так:

- `productImagesData` содержит **только фото товара** (без `type`, и без reference)
- `referenceImageUrl` хранится **отдельно**, и **не добавляется** в `jobData.productImages`

Потом при перегенерации код делает:
- “если есть `jobData.productImages` — используй его”
- и **даже не доходит** до fallback-а “достать product_images из базы по `currentJobId`”

Поэтому референс теряется именно в сценарии “сгенерировал → сразу нажал перегенерацию (без перезагрузки страницы)”.

Отсюда же иногда “теряется описание/название”: если `jobData` по какой-то причине пустой, а поля формы вы не хотите сохранять между перезагрузками, то fallback идет не всегда или не полностью (сейчас из БД в regenerateCard подтягиваются только `product_images`, но не `product_name/description/category`).

---

## Что сделаем, чтобы mainEdit работал так же стабильно как остальные 6 типов

### A) Сделать единый “канонический” набор исходных данных для перегенерации
Для перегенерации всегда должны быть доступны:
- `product_name`
- `category`
- `description`
- `product_images` (включая `type:'reference'` если есть)

И лучше считать их **из базы по `currentJobId`**, если есть, потому что:
- это точно исходные данные из “оригинальной генерации”
- не зависит от того, что хранится в локальном React state
- одинаково работает для всех типов и после refresh

### B) Исправить сохранение `jobData` сразу после старта генерации
Чтобы **перегенерация работала корректно даже мгновенно**, ещё до завершения job:
- сохранять `productImagesData` как массив объектов с `type: 'product'`
- если `referenceImageUrl` есть — добавлять в тот же массив объект `{ url, name:'reference', type:'reference' }`
- и уже этот массив класть в:
  - `setUploadedProductImages(...)`
  - `setJobData({ ..., productImages: ... })`

Так вы получите ровно тот формат, который ожидает regenerate flow.

### C) Сделать regenerateCard более “железобетонным”
В `regenerateCard` изменить приоритеты данных:

1) Если есть `currentJobId`:
   - запросить из `generation_jobs` **не только `product_images`, но и `product_name`, `category`, `description`**
   - использовать это как главный источник истины
2) Если `currentJobId` нет — fallback на `jobData`
3) Если и его нет — fallback на поля формы (как сейчас)

Это закроет кейсы “сбрасывается описание/название”.

### D) Проверить параллельный компонент OptimizedGenerateCards (если он используется на /dashboard)
У вас есть `src/components/dashboard/OptimizedGenerateCards.tsx`, который тоже:
- грузит `referenceImageUrl`
- но в `productImages` отправляет только товары, а reference отдельным полем

Нужно посмотреть, используется ли он реально в `/dashboard` вместо `GenerateCards.tsx`. Если да — применить аналогичную логику хранения/передачи контекста и там, иначе вы будете ловить “то работает, то нет” в зависимости от того, какой компонент открыт пользователю.

---

## План работ (что именно поменяем в коде)

1) **GenerateCards.tsx**
   - В `simulateGeneration`:
     - формировать `productImagesData` в формате `{url,name,type}` для product
     - при наличии `referenceImageUrl` добавить объект `{url: referenceImageUrl, name:'reference', type:'reference'}`
     - сохранить это и в `jobData.productImages`, и в `uploadedProductImages`
   - В `regenerateCard`:
     - если `currentJobId` существует — запросить из БД `product_name, category, description, product_images`
     - собирать `allProductImages` именно из `product_images` (и убедиться, что reference реально попадает)
     - `sourceImageUrl` выбирать как первый `type==='product'`
     - `productNameToUse/categoryToUse/descriptionToUse` брать из БД, а не из формы

2) **(Опционально, но рекомендую) OptimizedGenerateCards.tsx**
   - если используется в UI:
     - при формировании payload/локального состояния тоже включать reference как `{type:'reference'}` (или обеспечить, что regenerate берёт из БД)

3) **Диагностические улучшения (чтобы быстро ловить такие баги дальше)**
   - Добавить `console.log` перед invoke regeneration: вывести `cardType`, `productImages.length`, `count(reference)`  
   - (если нужно) добавить лог в edge function regenerate-single-card-banana: вывести сколько изображений пришло и есть ли reference.

---

## Как проверим после фикса

1) Создать карточку типа **mainEdit** с:
   - 2 фото товара
   - 1 референс
   - заполненными названием и описанием
2) Сразу (без refresh) нажать “Перегенерировать”
3) В Network должен уйти payload где:
   - `cardType: "mainEdit"`
   - `productImages` содержит **3 элемента**, один из которых `type:"reference"`
   - `description` не пустой и совпадает с исходным
4) Повторить тест после refresh (чтобы убедиться, что fallback из БД тоже работает)

---

## Уточняющий вопрос (1 штука, критичный)
Сейчас mainEdit у вас — это “редактирование изображения”, но в регенерации вы хотите:
- всегда использовать **исходные фото товара** (product) + **референс** (reference) + **исходное описание**,
- или для mainEdit регенерация должна использовать ещё и **source image = сгенерированную картинку**, как “edit”?  
(По текущему payload `sourceImageUrl` берётся из product photo, то есть это именно “regenerate from original product context”, не “edit existing result”.)

Если подтвердите, я закреплю это поведение именно для mainEdit без двусмысленностей.
