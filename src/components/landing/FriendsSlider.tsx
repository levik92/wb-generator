import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FriendDetailDialog } from "./FriendDetailDialog";

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
    scrollRef?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[hsl(240,10%,4%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header — matches other landing sections */}
        <div className="text-center mb-16 sm:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-6">
            Верифицированные партнёры
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Наши друзья
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Проверенные сервисы с эксклюзивными условиями для пользователей WBGen
          </p>
        </div>

        {/* Navigation arrows */}
        <div className="hidden sm:flex justify-end gap-2 mb-6">
          <button
            onClick={() => scroll(-1)}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Slider */}
        <div
          ref={setScrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
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
              className="snap-start shrink-0 w-[220px] sm:w-[260px] rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 hover:border-primary/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden mb-4">
                <img
                  src={friend.logo_url}
                  alt={friend.name}
                  className="w-11 h-11 object-contain"
                />
              </div>
              <h3 className="font-semibold text-white text-base truncate mb-1.5 group-hover:text-primary transition-colors">
                {friend.name}
              </h3>
              <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">
                {friend.short_description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Link to full page */}
        <div className="text-center mt-10">
          <Link
            to="/friends"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Смотреть всех партнёров →
          </Link>
        </div>
      </div>

      <FriendDetailDialog friend={selected} onClose={() => setSelected(null)} />
    </section>
  );
};
