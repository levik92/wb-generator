import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

interface BeforeAfterSliderNewProps {
  beforeImage: string;
  afterImage: string;
  alt: string;
}

export const BeforeAfterSliderNew = ({
  beforeImage,
  afterImage,
  alt,
}: BeforeAfterSliderNewProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative aspect-[3/4] w-full mx-auto overflow-hidden rounded-2xl sm:rounded-3xl cursor-ew-resize select-none touch-pan-y"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-[hsl(268,83%,50%)] via-[hsl(280,90%,60%)] to-[hsl(268,83%,50%)] rounded-[2rem] blur-2xl opacity-20 sm:opacity-30 animate-pulse-glow" />

      {/* Container with border */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
        {/* Before Image (Background) */}
        <div className="absolute inset-0">
          <img
            src={beforeImage}
            alt={`До: ${alt}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Dark overlay for before */}
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* After Image (Clipped) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={afterImage}
            alt={`После: ${alt}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        >
          {/* Gradient line */}
          <div className="w-full h-full bg-gradient-to-b from-[hsl(268,83%,60%)] via-white to-[hsl(268,83%,60%)]" />

          {/* Handle */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 before-after-handle ${
              isDragging ? "scale-110" : "hover:scale-105"
            }`}
          >
            <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20">
          <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-black/60 backdrop-blur-sm text-white/90 border border-white/10">
            До
          </span>
        </div>
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20">
          <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-gradient-to-r from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] text-white border border-white/20">
            После
          </span>
        </div>
      </div>
    </motion.div>
  );
};
