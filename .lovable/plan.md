

## Problem

There is a mismatch between card type keys used in different parts of the system:

| Card | Edge function (DB value) | Frontend key | Banana regen mapping |
|------|------------------------|-------------|---------------------|
| Главная | `cover` | `cover` | `cover` -> `cover` |
| Образ жизни / Свойства | `lifestyle` | `features` | NOT MAPPED -> `cover` |
| Макро | `macro` | `macro` | `macro` -> `macro` |
| До/После / Товар в использовании | `beforeAfter` | `usage` | NOT MAPPED -> `cover` |
| Комплект / Сравнение | `bundle` | `comparison` | NOT MAPPED -> `cover` |
| Гарантия / Фото без инфографики | `guarantee` | `clean` | NOT MAPPED -> `cover` |
| Редактирование | `mainEdit` | `mainEdit` | `mainEdit` -> `mainEdit` |

When a card is originally generated, the edge function stores `card_type` as `lifestyle`, `beforeAfter`, `bundle`, `guarantee` in the database. When the user regenerates, the frontend sends this stored DB value. But:

1. **Banana regeneration** (`regenerate-single-card-banana`): The `cardTypeToPromptType` map only contains frontend keys (`features`, `usage`, `comparison`, `clean`), not DB keys (`lifestyle`, `beforeAfter`, `bundle`, `guarantee`). Unmapped keys fall back to `cover`.

2. **V2 regeneration** (`regenerate-single-card-v2`): Passes `cardType` directly to `getPromptTemplate` as `prompt_type`. If prompts are stored under the edge function keys (`lifestyle`, `beforeAfter`, etc.), it works. If stored under frontend keys, it breaks.

## Solution

Update the `cardTypeToPromptType` mapping in `regenerate-single-card-banana/index.ts` to include **both** the DB keys and the frontend keys, so regeneration works regardless of which naming convention the stored `card_type` uses.

### File: `supabase/functions/regenerate-single-card-banana/index.ts`

Update the `cardTypeToPromptType` map (lines 11-19) to include DB-stored keys:

```typescript
const cardTypeToPromptType: Record<string, string> = {
  'cover': 'cover',
  'features': 'features',
  'lifestyle': 'features',      // DB key -> same prompt
  'macro': 'macro',
  'usage': 'beforeAfter',
  'beforeAfter': 'beforeAfter', // DB key -> same prompt
  'comparison': 'bundle',
  'bundle': 'bundle',           // DB key -> same prompt
  'clean': 'guarantee',
  'guarantee': 'guarantee',     // DB key -> same prompt
  'mainEdit': 'mainEdit',
};
```

### File: `supabase/functions/regenerate-single-card-v2/index.ts`

Add a similar mapping before `getPromptTemplate` is called (around line 177), so the correct prompt_type is used regardless of which key format was stored:

```typescript
const cardTypeToPromptType: Record<string, string> = {
  'cover': 'cover',
  'features': 'features',
  'lifestyle': 'features',
  'macro': 'macro',
  'usage': 'beforeAfter',
  'beforeAfter': 'beforeAfter',
  'comparison': 'bundle',
  'bundle': 'bundle',
  'clean': 'guarantee',
  'guarantee': 'guarantee',
  'mainEdit': 'mainEdit',
};

const promptType = cardTypeToPromptType[cardType] || 'cover';
const prompt = await getPromptTemplate(supabase, promptType, ...);
```

This ensures that no matter which key format (`lifestyle` from DB or `features` from frontend) is passed during regeneration, the correct prompt template is fetched.

