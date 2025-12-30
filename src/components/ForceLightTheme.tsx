import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Компонент для принудительной светлой темы на публичных страницах
 * (лендинг, авторизация, и т.д.)
 */
export const ForceLightTheme = () => {
  const { setTheme, theme } = useTheme();
  
  useEffect(() => {
    // Сохраняем текущую тему перед переключением
    const previousTheme = theme;
    
    // Принудительно устанавливаем светлую тему
    setTheme("light");
    
    // При размонтировании восстанавливаем предыдущую тему (если была темная)
    return () => {
      if (previousTheme === "dark") {
        setTheme("dark");
      }
    };
  }, []);

  return null;
};
