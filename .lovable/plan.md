

## Исправление двух билд-ошибок

### Ошибка 1: `src/hooks/useActiveJobs.ts` (строка 55)
`Type 'Set<unknown>' is not assignable to type 'Set<string>'`

Строка 46: `new Set(jobs.map((job: ActiveJob) => job.id))` — TypeScript не может вывести тип, потому что `jobs` получен из `data?.jobs || []`, где `data` — `any`. Несмотря на аннотацию `(job: ActiveJob)`, TS иногда теряет вывод.

**Исправление**: явно типизировать Set:
```typescript
const currentIds = new Set<string>(jobs.map((job: ActiveJob) => job.id));
```

### Ошибка 2: `src/lib/telegram.ts` (строка 30)
`Property 'setTimeout' does not exist on type 'never'`

Проблема: TypeScript сужает тип `window` до `never` после проверки `"requestIdleCallback" in window` с ранним return. В строгом режиме TS считает, что если `requestIdleCallback` отсутствует, то `window` — `never`.

**Исправление**: использовать `globalThis.setTimeout` вместо `window.setTimeout`:
```typescript
globalThis.setTimeout(callback, 1500);
```

### Затрагиваемые файлы
1. `src/hooks/useActiveJobs.ts` — одна строка (46)
2. `src/lib/telegram.ts` — одна строка (30)

Никакие другие файлы и функции не затрагиваются.
