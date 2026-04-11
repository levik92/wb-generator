

## Анализ: анимация генерации слетает при уходе со страницы (Polza AI)

### Найденные проблемы

**Проблема 1: Статус `retrying` не учитывается при восстановлении edit/regen задач**

В `checkForActiveJobs` (строка 532) запрос активных edit/regeneration заданий фильтрует только `['processing', 'pending']`. Но при Polza AI задачи часто находятся в статусе `retrying` (ожидание результата от Polza через polling). Поэтому при возвращении на вкладку эти задачи не обнаруживаются и спиннеры не восстанавливаются.

Аналогично, на строке 544 фильтрация задач внутри найденных jobs тоже пропускает `retrying`:
```
const activeTasks = editJob.generation_tasks?.filter(t => 
  t.status === 'processing' || t.status === 'pending'
) || [];
```

**Проблема 2: Основная генерация — аналогичная проблема**

На строке 464, `checkForActiveJobs` проверяет `latestJob.status === 'processing'`. Это корректно, потому что job-level статус остаётся `processing` пока оркестратор работает, даже если задачи внутри в `retrying`. Эта часть работает правильно.

**Проблема 3: `pending` статус у основного job при Polza AI**

Если задание ещё не подхвачено оркестратором (статус `pending`), оно тоже не восстанавливается. Строка 464 проверяет только `=== 'processing'`, нужно добавить `|| latestJob.status === 'pending'`.

### Единая стилизация с Polza AI

Код единой стилизации в `process-generation-tasks-banana` корректно маршрутизирует анализ стиля через `analyze-style-polza` при `api_provider === 'polza'` (строки 197, 322). Механизм работает: первая карточка обрабатывается, затем стиль анализируется, и остальные карточки получают описание стиля. Это реализовано правильно.

### Таймаут Polza AI

Механизм polling через `polza_pending:` реализован корректно (строки 464-548 в orchestrator). 8-секундный retry cycle, orchestrator проверяет статус через `process-polza-task`, тот опрашивает Polza Media API. Общий таймаут 9 минут обеспечивает завершение. Это работает.

---

### План исправления

**Файл: `src/components/dashboard/GenerateCards.tsx`**

1. **Строка 532**: Добавить `retrying` в фильтр статусов edit/regen jobs:
   ```
   .in('status', ['processing', 'pending', 'retrying'])
   ```

2. **Строка 544**: Добавить `retrying` в фильтр задач при восстановлении спиннеров:
   ```
   const activeTasks = editJob.generation_tasks?.filter(t => 
     t.status === 'processing' || t.status === 'pending' || t.status === 'retrying'
   ) || [];
   ```

3. **Строка 464**: Добавить проверку `pending` статуса для основного job:
   ```
   } else if (latestJob && (latestJob.status === 'processing' || latestJob.status === 'pending')) {
   ```

Эти три изменения — точечные, затрагивают только логику восстановления состояния при возврате на страницу. Никакие другие функции не затрагиваются.

