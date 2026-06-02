// Конфиг квиза — ветви, цели, видео.
// Замени VIDEO_URLS на реальные Kinescope/YouTube embed-ссылки.

export type AudienceId =
  | "seller"
  | "manager"
  | "avito"
  | "designer"
  | "beginner"
  | "other";

export type VideoBranch = "sellers" | "avito" | "designers";

export interface AudienceOption {
  id: AudienceId;
  label: string;
}

export interface GoalOption {
  id: string;
  label: string;
}

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  { id: "seller", label: "Продавец на маркетплейсах" },
  { id: "manager", label: "Менеджер маркетплейсов" },
  { id: "avito", label: "Продавец на Avito и подобных площадках" },
  { id: "designer", label: "Дизайнер карточек" },
  { id: "beginner", label: "Начинающий специалист" },
  { id: "other", label: "Другое" },
];

const SELLER_GOALS: GoalOption[] = [
  { id: "s1", label: "Сократить расходы на дизайнера" },
  { id: "s2", label: "Тестировать больше вариантов карточек для повышения эффективности рекламы" },
  { id: "s3", label: "Увеличить доход за счёт улучшения дизайна карточек" },
  { id: "s4", label: "Сократить штат и перекинуть задачи на менеджера" },
  { id: "s5", label: "Другое" },
];

const MANAGER_GOALS: GoalOption[] = [
  { id: "m1", label: "Оптимизировать свою работу" },
  { id: "m2", label: "Затрачивать меньше времени на дизайн карточек" },
  { id: "m3", label: "Эффективнее увеличивать доход продавцу на маркетплейсах" },
  { id: "m4", label: "Дополнительно зарабатывать" },
  { id: "m5", label: "Другое" },
];

const AVITO_GOALS: GoalOption[] = [
  { id: "a1", label: "Увеличить охват объявления за счёт фотографий" },
  { id: "a2", label: "Сделать фотосессию без фотографа" },
  { id: "a3", label: "Сократить затраты на фотографии" },
  { id: "a4", label: "Поднять позиции объявления в ранжировании" },
  { id: "a5", label: "Увеличить доход за счёт изменения карточек" },
  { id: "a6", label: "Другое" },
];

const DESIGNER_GOALS: GoalOption[] = [
  { id: "d1", label: "Сократить время на создание карточек в несколько раз" },
  { id: "d2", label: "Повысить результативность карточек для селлера (продающие)" },
  { id: "d3", label: "Улучшить качество своей работы" },
  { id: "d4", label: "Увеличить свой заработок" },
  { id: "d5", label: "Другое" },
];

const BEGINNER_GOALS: GoalOption[] = [
  { id: "b1", label: "Найти заказчиков" },
  { id: "b2", label: "Создавать эффективные карточки товаров" },
  { id: "b3", label: "Освоить новую профессию" },
  { id: "b4", label: "Другое" },
];

export const GOALS_BY_AUDIENCE: Record<AudienceId, GoalOption[]> = {
  seller: SELLER_GOALS,
  other: SELLER_GOALS,
  manager: MANAGER_GOALS,
  avito: AVITO_GOALS,
  designer: DESIGNER_GOALS,
  beginner: BEGINNER_GOALS,
};

export const VIDEO_BRANCH_BY_AUDIENCE: Record<AudienceId, VideoBranch> = {
  seller: "sellers",
  manager: "sellers",
  other: "sellers",
  avito: "avito",
  designer: "designers",
  beginner: "designers",
};

// Kinescope embed URLs (формат: https://kinescope.io/embed/{id})
export const VIDEO_URLS: Record<VideoBranch, string> = {
  sellers: "https://kinescope.io/embed/bjBiTi9uQdMHP8RjxgB2Ua",
  avito: "https://kinescope.io/embed/uZ8QL3KVLFRAoiPpnhQthd",
  designers: "https://kinescope.io/embed/uPkrVpx2bCALBFK64aggtc",
};

export const QUIZ_SUBTITLE =
  "WBGen — первый и лучший в мире сервис генерации эффективных карточек товаров для маркетплейсов. Уточните, какие цели вы преследуете в нашем сервисе.";
