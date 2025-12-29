import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full hover:bg-wb-purple/10"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-foreground transition-transform" />
      ) : (
        <Moon className="h-5 w-5 text-foreground transition-transform" />
      )}
    </Button>
  );
};
