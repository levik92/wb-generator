import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const Snowfall = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Generate snowflakes
    const flakes: Snowflake[] = [];
    const count = window.innerWidth < 768 ? 25 : 50; // Less on mobile

    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 3 + 4,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.6 + 0.4,
      });
    }
    setSnowflakes(flakes);
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[200px] pointer-events-none overflow-hidden z-50"
      aria-hidden="true"
    >
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute rounded-full bg-white animate-snowfall"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
