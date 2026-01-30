
# План исправления перегенерации с сохранением референса

## Корневая проблема

При перегенерации карточки **референс и описание теряются** из-за следующей цепочки:

1. Когда job завершается, `setCurrentJobId(null)` обнуляет ID (строка 573)
2. Функция `regenerateCard` проверяет `if (jobIdForRegeneration)` — это `null`!
3. Код идёт в fallback на `jobData`, но после refresh страницы `jobData` тоже пустой
4. **Главное**: массив `generatedImages` не содержит `jobId`, поэтому нельзя найти оригинальный job

## Данные из базы (подтверждение проблемы)

**Оригинальный job** `55b82345...` (первая генерация):
```json
product_images: [
  {"name":"image_1.jpeg", "url":"..."},           // нет type, значит product
  {"type":"reference", "url":"...reference.jpg"}  // референс ЕСТЬ ✅
]
```

**Job перегенерации** `3f228175...`:
```json
product_images: [
  {"name":"image_1.jpeg", "type":"product", "url":"..."}  // только 1 изображение ❌
]
```

Референс не попал в перегенерацию, потому что код не смог получить данные из оригинального job'а.

---

## План изменений

### 1. Сохранять `jobId` в каждой сгенерированной картинке

В `GenerateCards.tsx` при создании `generatedImages` добавить `jobId`:

**Файл:** `src/components/dashboard/GenerateCards.tsx`

**Строки 516-524** (при polling'е):
```typescript
const images = completedTasks.sort(...).map((task: any) => ({
  id: task.id,
  url: task.image_url,
  stage: CARD_STAGES[task.card_index]?.name,
  stageIndex: task.card_index,
  cardType: task.card_type,
  jobId: job.id  // ← ДОБАВИТЬ: сохраняем jobId для регенерации
}));
```

**Строки 232-238** (при загрузке из истории):
```typescript
// При загрузке активных job'ов — аналогично добавить jobId
```

### 2. В `regenerateCard` использовать `image.jobId` вместо `currentJobId`

**Файл:** `src/components/dashboard/GenerateCards.tsx`

**Строки 865-868**:
```typescript
// Было:
const jobIdForRegeneration = currentJobId;

// Станет:
const jobIdForRegeneration = image.jobId || currentJobId;
```

Теперь даже после обнуления `currentJobId` код возьмёт `jobId` из самой картинки.

### 3. Добавить fallback через `generation_tasks` таблицу

Если `image.jobId` отсутствует (старые картинки), можно получить `job_id` через запрос к `generation_tasks`:

```typescript
// Если jobId недоступен — получить его из таска по image.id
if (!jobIdForRegeneration && image.id) {
  const { data: taskData } = await supabase
    .from('generation_tasks')
    .select('job_id')
    .eq('id', image.id)
    .single();
  
  if (taskData?.job_id) {
    jobIdForRegeneration = taskData.job_id;
  }
}
```

### 4. Убедиться что тип `product` сохраняется при создании job'а

**Файл:** `src/components/dashboard/GenerateCards.tsx`

**Строки 626-629** — добавить `type: 'product'`:
```typescript
productImagesData.push({
  url: publicUrl,
  name: `image_${i + 1}.${fileExt}`,
  type: 'product'  // ← ДОБАВИТЬ
});
```

Это нужно для консистентности: сейчас только локально (`allImagesForJob`) тип указывается, а на сервер идёт без типа.

---

## Итоговые файлы для редактирования

| Файл | Что меняется |
|------|--------------|
| `src/components/dashboard/GenerateCards.tsx` | 1. Добавить `jobId` в `generatedImages` (2 места)<br>2. В `regenerateCard` брать `image.jobId` вместо `currentJobId`<br>3. Fallback: запрос `job_id` через `generation_tasks`<br>4. Добавить `type:'product'` в `productImagesData` |

---

## Как тестировать после исправления

1. Создать карточку с:
   - 1-2 фото товара
   - 1 референс
   - Заполненным описанием

2. Дождаться завершения генерации (job status = completed)

3. Нажать "Перегенерировать" на любой карточке

4. В Network → Request payload проверить:
   - `productImages` содержит **ВСЕ** изображения (и product, и reference)
   - `cardType` соответствует оригинальному типу
   - `description` не пустое

5. Перезагрузить страницу и повторить шаг 3-4 (проверить fallback)

---

## Техническая схема потока данных после исправления

```text
┌─────────────────────┐
│   Генерация job     │
│   job.id = ABC123   │
│   product_images:   │
│   - product1.jpg    │
│   - reference.jpg   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  generatedImages[]  │
│  { id, url, stage,  │
│    cardType,        │
│    jobId: ABC123 }  │  ← НОВОЕ ПОЛЕ
└──────────┬──────────┘
           │
           ▼ (клик "Перегенерировать")
           │
┌─────────────────────┐
│  regenerateCard()   │
│  jobIdFor... =      │
│  image.jobId ||     │  ← Берём из картинки!
│  currentJobId       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Запрос к БД:       │
│  SELECT product_..  │
│  FROM generation_   │
│  jobs               │
│  WHERE id=ABC123    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  allProductImages   │
│  включает reference │
│  → уходит на        │
│  regenerate API     │
└─────────────────────┘
```
