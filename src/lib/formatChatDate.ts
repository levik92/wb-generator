// Russian-localised chat date helpers.

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const formatChatDateSeparator = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return "Сегодня";
  if (isSameDay(date, yesterday)) return "Вчера";

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

export const formatChatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
