import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface UserFiltersState {
  payment: Set<'paid' | 'free'>;
  activity: Set<'active' | 'inactive'>;
  utm: Set<string>; // utm_source_id or "__direct__"
  who: Set<string>;
  volume: Set<string>;
  channel: Set<string>;
}

export const EMPTY_FILTERS: UserFiltersState = {
  payment: new Set(),
  activity: new Set(),
  utm: new Set(),
  who: new Set(),
  volume: new Set(),
  channel: new Set(),
};

interface UtmSourceOption {
  id: string;
  name: string;
}

interface Props {
  filters: UserFiltersState;
  setFilters: (next: UserFiltersState) => void;
  utmSources: UtmSourceOption[];
  whoOptions: string[];
  volumeOptions: string[];
  channelOptions: string[];
}

export function UserFiltersPopover({
  filters,
  setFilters,
  utmSources,
  whoOptions,
  volumeOptions,
  channelOptions,
}: Props) {
  const isMobile = useIsMobile();

  const totalActive = useMemo(() => {
    return filters.payment.size + filters.activity.size + filters.utm.size +
      filters.who.size + filters.volume.size + filters.channel.size;
  }, [filters]);

  const toggle = <K extends keyof UserFiltersState>(group: K, value: string) => {
    const set = new Set(filters[group] as Set<string>);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setFilters({ ...filters, [group]: set } as UserFiltersState);
  };

  const isChecked = (group: keyof UserFiltersState, value: string) => {
    return (filters[group] as Set<string>).has(value);
  };

  const reset = () => setFilters({ ...EMPTY_FILTERS,
    payment: new Set(), activity: new Set(), utm: new Set(),
    who: new Set(), volume: new Set(), channel: new Set() });

  const Section = ({ title, items, group }: {
    title: string;
    items: { value: string; label: string }[];
    group: keyof UserFiltersState;
  }) => (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">{title}</p>
      <div className="space-y-1">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/70 px-1 py-1">Нет данных</p>
        )}
        {items.map(item => (
          <label
            key={item.value}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={isChecked(group, item.value)}
              onCheckedChange={() => toggle(group, item.value)}
            />
            <span className="text-xs flex-1 truncate">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {isMobile ? (
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0 relative">
            <Filter className="h-4 w-4" />
            {totalActive > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center">
                {totalActive}
              </Badge>
            )}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5" />
            Фильтры
            {totalActive > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                {totalActive}
              </Badge>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[300px] sm:w-[340px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Фильтры</p>
          {totalActive > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-xs gap-1">
              <X className="h-3 w-3" />
              Сбросить
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[60vh] sm:max-h-[420px]">
          <div className="p-3 space-y-4">
            <Section
              title="Оплата"
              group="payment"
              items={[
                { value: 'paid', label: 'Платные' },
                { value: 'free', label: 'Бесплатные' },
              ]}
            />
            <Section
              title="Активность"
              group="activity"
              items={[
                { value: 'active', label: 'Активные (30 дней)' },
                { value: 'inactive', label: 'Неактивные' },
              ]}
            />
            <Section
              title="Источник трафика"
              group="utm"
              items={[
                { value: '__direct__', label: 'Прямой заход' },
                ...utmSources.map(u => ({ value: u.id, label: u.name })),
              ]}
            />
            <Section
              title="Кто вы?"
              group="who"
              items={whoOptions.map(o => ({ value: o, label: o }))}
            />
            <Section
              title="Объём в месяц"
              group="volume"
              items={volumeOptions.map(o => ({ value: o, label: o }))}
            />
            <Section
              title="Откуда узнали?"
              group="channel"
              items={channelOptions.map(o => ({ value: o, label: o }))}
            />
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
