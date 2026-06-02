interface PaymentMethodsProps {
  variant?: "light" | "dark";
  className?: string;
}

const cards = [
  { label: "VISA", bg: "#1A1F71", fg: "#FFFFFF" },
  { label: "MC", bg: "#FFFFFF", fg: "#EB001B", full: "Mastercard" },
  { label: "МИР", bg: "#0F754E", fg: "#FFFFFF" },
  { label: "БЕЛКАРТ", bg: "#E30613", fg: "#FFFFFF" },
];

export const PaymentMethods = ({ className = "" }: PaymentMethodsProps) => {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${className}`}>
      {cards.map((c) => (
        <div
          key={c.label}
          aria-label={c.full || c.label}
          className="inline-flex items-center justify-center rounded-[4px] px-1.5 py-1 sm:px-2 sm:py-1 h-6 min-w-[34px] text-[10px] sm:text-[11px] font-bold tracking-tight leading-none select-none"
          style={{ backgroundColor: c.bg, color: c.fg }}
        >
          {c.label === "MC" ? (
            <span className="flex items-center gap-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#EB001B" }} />
              <span className="w-2.5 h-2.5 rounded-full -ml-1" style={{ backgroundColor: "#F79E1B", mixBlendMode: "multiply" }} />
            </span>
          ) : (
            c.label
          )}
        </div>
      ))}
    </div>
  );
};
