

# Кластеризация результатов редактирования в истории

## Суть задачи

Сейчас при редактировании изображения из истории результат сохраняется как отдельная запись в таблице `generations`. Нужно, чтобы отредактированное изображение добавлялось в ту же карточку истории (кластер), откуда запускалось редактирование, и это происходило без перезагрузки страницы.

## Текущая архитектура

1. Пользователь нажимает "Ред." на изображении в истории
2. Вызывается edge function `edit-card-banana` / `edit-card-v2`
3. Создается **новый** `generation_job` с `category: 'edit'`
4. По завершении DB-триггер `save_completed_generation_to_history` сохраняет **новую** строку в таблице `generations`
5. Результат виден только после обновления страницы, как отдельная карточка

## План реализации

### 1. Передавать ID исходной генерации при редактировании

В функции `editHistoryCard` в History.tsx -- при вызове edge function передавать дополнительное поле `sourceGenerationId` (ID записи из `generations`, откуда редактируется изображение).

Для этого в `editingImageData` добавить поле `generationId`.

### 2. Обновить edge functions (edit-card-banana, edit-card-v2)

- Принимать новый параметр `sourceGenerationId`
- Сохранять его в `generation_jobs` (в поле `description` или в `product_images` как метаданные)
- Передавать далее в процесс обработки

### 3. Изменить логику сохранения результата

Вместо создания новой записи в `generations` при редактировании -- обновлять существующую запись:

- В DB-триггере `save_completed_generation_to_history`: если job имеет `category = 'edit'` и в описании/метаданных есть `sourceGenerationId`, то вместо INSERT делать UPDATE существующей записи, добавляя новое изображение в массив `output_data.images`
- Обновлять `tokens_used` (суммировать стоимость)

### 4. Реактивное обновление на фронтенде (без перезагрузки)

После успешного завершения редактирования в `editHistoryCard`:

- Поллить (опрашивать) статус задачи `generation_tasks` по `taskId`, который возвращает edge function
- Когда статус становится `completed` и появляется `image_url` -- добавить новое изображение в массив `output_data.images` соответствующей генерации в локальном state `generations`
- Обновить `tokens_used` в карточке
- Автоматически раскрыть карточку (expandedIds), если в ней теперь больше одного изображения

### 5. UI-изменения

- Если в карточке 1 изображение и запускается редактирование -- после получения результата автоматически появляется кнопка "Все фото" (как для мульти-карточек)
- Отредактированные изображения помечаются бейджем "Ред." в сетке развернутых изображений
- Счетчик токенов в карточке обновляется (сумма оригинала + все редактирования)

## Технические детали

### Изменяемые файлы

1. **`src/components/dashboard/History.tsx`**
   - Добавить `generationId` в `editingImageData`
   - Добавить поллинг статуса задачи после запуска редактирования
   - Обновлять локальный state при получении результата
   - Автоматически раскрывать карточку при добавлении нового изображения

2. **`supabase/functions/edit-card-banana/index.ts`**
   - Принимать `sourceGenerationId`
   - Сохранять в метаданные job

3. **`supabase/functions/edit-card-v2/index.ts`**
   - Аналогично banana-версии

4. **DB-триггер `save_completed_generation_to_history`** (миграция SQL)
   - При `category = 'edit'`: если есть `sourceGenerationId`, делать UPDATE вместо INSERT, дописывая изображение в `output_data.images` существующей записи и суммируя `tokens_used`

### Поллинг задачи (History.tsx)

```text
editHistoryCard() ->
  invoke edge function ->
  получить taskId ->
  запустить setInterval (каждые 3 сек) ->
    запрос generation_tasks по taskId ->
    если status = 'completed' и image_url есть ->
      обновить generations state:
        найти generation по generationId
        добавить image в output_data.images
        обновить tokens_used
        добавить в expandedIds
      остановить поллинг
    если status = 'failed' ->
      показать ошибку
      остановить поллинг
    таймаут через 5 минут -> остановить
```

### Обновление DB-триггера

```text
IF NEW.category = 'edit' THEN
  -- извлечь sourceGenerationId из description
  -- если найден, UPDATE generations SET
  --   output_data.images = output_data.images || new_image
  --   tokens_used = tokens_used + NEW.tokens_cost
  -- ELSE создать новую запись (fallback)
END IF;
```

## Порядок выполнения

1. Обновить edge functions (edit-card-banana, edit-card-v2) -- добавить sourceGenerationId
2. Создать SQL-миграцию для обновления DB-триггера
3. Обновить History.tsx: передача generationId, поллинг, реактивное обновление state
4. Деплой edge functions
5. Тестирование

