Выяснил по логам и базе: фронт действительно отправил `aspectRatio: "1:1"` для генерации робота-пылесоса, но в `generation_jobs.aspect_ratio` сохранилось `3:4`, поэтому `process-google-task` вызвал Gemini с `aspectRatio: 3:4`. Значит проблема не в промте, а в том, что backend сейчас фактически не сохраняет выбранный формат в job.

План исправления:

1. Исправить `create-generation-job-banana`
   - Жёстко нормализовать входной `aspectRatio` как строку.
   - Добавить отдельный лог `Requested aspectRatio -> saved aspect_ratio`, чтобы сразу видеть, что сохраняется.
   - Сохранять `aspect_ratio` в `generation_jobs` именно из запроса, а не давать базе подставлять дефолт `3:4`.

2. Усилить передачу формата в обработку
   - В `process-generation-tasks-banana` передавать `aspectRatio: job.aspect_ratio` при вызове `process-google-task` / `process-polza-task`, а не полагаться только на вложенный `task.job`.
   - В `process-google-task` и `process-polza-task` принимать `aspectRatio` из body и использовать fallback из `task.job.aspect_ratio`.

3. Проверить на базе
   - После правки создать/проверить тестовый job или логи edge-функции: при выборе `1:1` в `generation_jobs.aspect_ratio` должен быть `1:1`, а в логе `process-google-task` должно быть `aspectRatio: 1:1`.

По промтам: упоминание формата лучше убрать или заменить на нейтральное; когда этот баг исправим, формат будет задаваться отдельным параметром API, и промт не должен ему противоречить.