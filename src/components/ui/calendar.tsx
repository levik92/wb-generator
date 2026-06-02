import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        caption: "flex justify-center pt-1 pb-1 relative items-center",
        caption_label: "text-sm font-semibold capitalize tracking-tight",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 rounded-lg border-border/60 text-muted-foreground hover:text-white hover:bg-violet-500 hover:border-violet-500 transition-colors opacity-80 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground/70 rounded-md w-9 font-medium text-[0.7rem] uppercase tracking-wider",
        row: "flex w-full mt-1.5",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/40 [&:has([aria-selected])]:bg-violet-500/5 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-md tabular-nums hover:bg-violet-500/10 hover:text-violet-500 transition-colors aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end rounded-md",
        day_range_start: "day-range-start rounded-md",
        day_selected:
          "bg-violet-500 text-white hover:bg-violet-500 hover:text-white focus:bg-violet-500 focus:text-white shadow-sm shadow-violet-500/30 rounded-md",
        day_today: "ring-1 ring-violet-500/40 text-violet-600 dark:text-violet-300 font-semibold",
        day_outside:
          "day-outside text-muted-foreground/40 aria-selected:bg-accent/40 aria-selected:text-muted-foreground aria-selected:opacity-40",
        day_disabled: "text-muted-foreground/40 opacity-50 hover:bg-transparent hover:text-muted-foreground/40 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-violet-500/5 aria-selected:text-violet-600 dark:aria-selected:text-violet-200 aria-selected:rounded-none aria-selected:shadow-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
