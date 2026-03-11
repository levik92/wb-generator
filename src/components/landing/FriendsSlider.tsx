import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Sparkles, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface ServiceFriend {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  exclusive_conditions: string;
  logo_url: string;
  service_url: string;
}

export const FriendsSlider = () => {
  const [friends, setFriends] = useState<ServiceFriend[]>([]);
  const [selected, setSelected] = useState<ServiceFriend | null>(null);
  const [scrollRef, setScrollRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase
      .from("service_friends")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => setFriends(data || []));
  }, []);

  if (friends.length === 0) return null;

  const scroll = (dir: number) => {
    scrollRef?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  return (
    <section className="py-16 sm:py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs mb-3">
              <BadgeCheck className="w-3.5 h-3.5" />
              Верифицированные партнёры
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Наши друзья
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1.5">
              <button
                onClick={() => scroll(-1)}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll(1)}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Link
              to="/friends"
              className="text-sm text-primary hover:text-primary/80 transition-colors ml-2"
            >
              Все →
            </Link>
          </div>
        </motion.div>

        {/* Slider */}
        <div
          ref={setScrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {friends.map((friend, i) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              onClick={() => setSelected(friend)}
              className="snap-start shrink-0 w-[200px] sm:w-[220px] rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5 hover:border-primary/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden mb-3">
                <img
                  src={friend.logo_url}
                  alt={friend.name}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h3 className="font-semibold text-white text-sm truncate mb-1 group-hover:text-primary transition-colors">
                {friend.name}
              </h3>
              <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                {friend.short_description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-lg bg-[#111111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg">
              {selected?.logo_url && (
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                  <img src={selected.logo_url} alt={selected.name} className="w-8 h-8 object-contain" />
                </div>
              )}
              <div>
                <span className="block">{selected?.name}</span>
                <span className="flex items-center gap-1 text-xs font-normal text-primary/70 mt-0.5">
                  <BadgeCheck className="w-3 h-3" /> Верифицированный партнёр
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">О сервисе</h4>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                {selected?.detailed_description || selected?.short_description}
              </p>
            </div>

            {selected?.exclusive_conditions && (
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-primary">Эксклюзивные условия</h4>
                </div>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                  {selected.exclusive_conditions}
                </p>
              </div>
            )}

            <Button className="w-full gap-2" size="lg" asChild>
              <a href={selected?.service_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Перейти и получить эксклюзив
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
