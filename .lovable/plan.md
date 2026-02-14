

# Улучшение блока "Генератор этикеток"

## Проблемы, которые нужно исправить

1. **Конфликт ID**: Оба компонента `WBLabelMaker` и `WBLabelMakerAlt` используют одинаковый `id="wb-gen"` с дублированными inline-стилями -- это вызывает CSS-конфликты и баги при переключении табов
2. **Несоответствие стилю сервиса**: Кастомные CSS-стили с зелёными кнопками (`#20a04b`) вместо системного `primary`-цвета; собственные инпуты вместо UI-компонентов проекта (`Input`, `Select`, `Button`, `Card`)
3. **Дублирование кода**: WBLabelMaker и WBLabelMakerAlt -- это 95% одинаковый код с разными лейблами полей
4. **Превью не адаптивно**: Canvas использует фиксированные пиксели, нет корректного ресайза при смене формата
5. **Неиспользуемый код**: В `LabelGenerator.tsx` остались функции `renderPreview`, `generatePNG`, `canvasRef` и др. (строки 57-228), которые нигде не вызываются -- они заменены WBLabelMaker-ами

## План реализации

### Шаг 1. Объединить WBLabelMaker и WBLabelMakerAlt в один компонент

Создать единый компонент `UnifiedLabelMaker` с пропсом `mode: "barcode" | "wb"`, который определяет набор полей:
- **barcode**: Наименование, Артикул
- **wb**: Порядковый номер, Свободное поле

Общие поля для обоих: Штрих-код, Формат печати, Толщина штрихов, Высота ШК

### Шаг 2. Перевести на системные UI-компоненты

Заменить все кастомные `.wb-*` стили на компоненты проекта:
- `<input class="wb-input">` -> `<Input />` из `@/components/ui/input`
- `<select class="wb-select">` -> `<Select />` из `@/components/ui/select`
- `<button class="wb-btn wb-primary">` -> `<Button />` из `@/components/ui/button`
- Обёртки `.wb-card` -> `<Card>` / `<CardContent>` или `rounded-2xl border border-border/50 bg-card/50`
- Слайдеры range -> `<Slider />` из `@/components/ui/slider`
- Лейблы -> `<Label />` из `@/components/ui/label`

Кнопка "Скачать PNG" -- стиль как у кнопки генерации на странице VideoCovers: `w-full sm:w-auto`, `size="lg"`, с иконкой `Download`

### Шаг 3. Убрать все inline `<style>` блоки

Удалить ~80 строк CSS из каждого компонента. Весь стайлинг через Tailwind-классы.

### Шаг 4. Исправить превью

- Убрать конфликт `id="wb-gen"` (использовать уникальные ref-ы)
- Превью-блок: `rounded-2xl border border-border/50 bg-card/50 p-4`, внутренний контейнер с белым фоном и `rounded-xl`
- Canvas корректно масштабируется через `ResizeObserver` вместо window resize
- Badge формата -- через компонент `<Badge />`

### Шаг 5. Очистить LabelGenerator.tsx

- Удалить неиспользуемые функции: `renderPreview`, `generatePNG`, `drawWrap`, `mmToPx`, `dims`, `canvasRef`, `labelState`, `wbState` (строки 57-228)
- Удалить неиспользуемые импорты: `Settings`, `Slider` (если не нужен в QR)
- QR-блок: привести к тому же стилю карточек

### Шаг 6. Подсказки и информация по стилю VideoCovers

Под кнопкой "Скачать PNG" добавить:
- Информационный блок: `flex items-start gap-2 text-xs text-muted-foreground` с иконкой `Info`
- Текст: "Бесплатный инструмент. Для термопринтера выбирайте 58x40 мм."

## Технические детали

### Структура файлов

- Удалить: `WBLabelMaker.tsx`, `WBLabelMakerAlt.tsx`
- Создать: `UnifiedLabelMaker.tsx` (единый компонент с пропсом `mode`)
- Обновить: `LabelGenerator.tsx` (очистка + импорт нового компонента)

### Ключевые стилевые решения

- Фон карточек: `bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl`
- Кнопка: системный `<Button size="lg">` с `Download` иконкой
- Инпуты: системный `<Input />` с `bg-background/50 border-border/50`
- Превью: белый внутренний фон (`bg-white dark:bg-white/95`) для корректного отображения ШК
- Grid-раскладка: `grid grid-cols-1 lg:grid-cols-2 gap-4` вместо кастомного CSS grid

