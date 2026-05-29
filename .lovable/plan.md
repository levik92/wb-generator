# Фикс: контент попапов уезжает за клавиатуру на мобилке

## Корень проблемы

1. **Dialog** — центрируется через `my-auto` во флекс-overlay. При появлении клавиатуры доступная высота уменьшается, но контент остаётся посередине, поэтому верх диалога уезжает за экран, а сфокусированный input оказывается под клавиатурой. Браузер не делает авто-`scrollIntoView` внутри `overflow:auto` контейнеров на iOS Safari.
2. **Drawer** (Vaul, мобильный путь `ResponsiveDialog`) — внутренний скролл ограничен `calc(85dvh - var(--keyboard-inset-height))`. База `85dvh` считается от полного экрана, а не от видимой зоны над клавиатурой — поэтому при клавиатуре ~300px часть контента всё равно остаётся ниже видимой области.
3. **AlertDialog** — вообще не учитывает клавиатуру: `translate(-50%,-50%)` от центра экрана, нет `dvh`, нет `--keyboard-inset-height`.
4. Нигде нет автоматического скролла сфокусированного `input/textarea` в зону видимости внутри попапа.

## Что меняем

### 1. `src/components/ui/dialog.tsx`
- Заменить `items-start sm:items-center` + `my-auto` на схему, где на мобиле при появлении клавиатуры контент прижимается к верху (через `items-start` всегда на маленьких экранах либо `items-start [@media(max-height:700px)]:items-start`).
- Оставить `maxHeight: calc(100dvh - 2rem - var(--keyboard-inset-height,0px))`, но также добавить `paddingBottom` на сам `DialogContent`, чтобы последний input не упирался в край.
- Добавить эффект на уровне `DialogContent`: слушатель `focusin` на контенте, который вызывает `scrollIntoView({ block: 'center' })` для активного `input/textarea/[contenteditable]` через `requestAnimationFrame` + небольшую задержку (300ms — клавиатура iOS).

### 2. `src/components/ui/drawer.tsx` + `src/components/ui/responsive-dialog.tsx`
- В `DrawerContent` (Vaul) уже есть свойство `setBackgroundColorOnScale`, но главное — нужно правильно вычислять высоту скролл-контейнера в `ResponsiveDialogContent`.
- Заменить `maxHeight: calc(85dvh - var(--keyboard-inset-height))` на формулу относительно видимой области: `maxHeight: calc(100dvh - var(--keyboard-inset-height,0px) - var(--drawer-header-offset, 4rem))`, плюс `paddingBottom: calc(env(safe-area-inset-bottom) + 1rem)`.
- Добавить такой же `focusin → scrollIntoView` хендлер внутрь `ResponsiveDialogContent` (через `ref` + `useEffect`).

### 3. `src/components/ui/alert-dialog.tsx`
- Привести `AlertDialogContent` к той же логике, что и `DialogContent`: добавить overlay-флекс c `items-start sm:items-center`, `maxHeight: calc(100dvh - 2rem - var(--keyboard-inset-height,0px))`, убрать `translate(-50%,-50%)` и использовать тот же паттерн что у Dialog.
- Подключить тот же `focusin`-скролл.

### 4. Общий хелпер
- Создать `src/hooks/useScrollFocusedIntoView.ts` — единый эффект, который вешает `focusin` на переданный `ref` и скроллит активный input в центр контейнера с задержкой (учитывает iOS Safari задержку появления клавиатуры). Использовать в Dialog, Drawer (через ResponsiveDialogContent), AlertDialog.

### 5. Проверка хука клавиатуры
- `setupKeyboardInsetTracking` в `src/hooks/useKeyboardInset.ts` уже корректен, убедиться что он подключён в `src/main.tsx` (если нет — подключить один раз при старте).

## Что не трогаем
- Никаких изменений в бизнес-логике, формах, или конкретных компонентах попапов — фикс централизованный в UI-примитивах.
- Точечный `onFocus → scrollIntoView` в `AdminUsers.tsx` можно оставить как есть (он не помешает), либо убрать — но это отдельный мелкий вопрос.

## Технические детали
- `scrollIntoView({ block: 'center', behavior: 'smooth' })` через `setTimeout(…, 300)` — стандартный паттерн для iOS, чтобы дождаться полной анимации клавиатуры.
- `--keyboard-inset-height` обновляется через `visualViewport.resize` — уже работает.
- Использовать только семантические токены, никаких хардкод-цветов.

## Результат
- На мобилке при фокусе в любом input/textarea внутри Dialog/Drawer/AlertDialog контент не уезжает за клавиатуру, активное поле автоматически оказывается в центре видимой зоны.
- Десктоп-поведение не меняется (на `sm:` и выше используется старая центровка).
