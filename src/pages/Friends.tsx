import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ServicePageLayout } from "@/components/services";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ArrowRight } from "lucide-react";
import verifiedBadge from "@/assets/verified-badge.png";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { FriendDetailDialog } from "@/components/landing/FriendDetailDialog";


interface ServiceFriend {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  exclusive_conditions: string;
  logo_url: string;
  service_url: string;
  display_order: number;
}

export default function Friends() {
  const [friends, setFriends] = useState<ServiceFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceFriend | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("service_friends")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setFriends(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <ServicePageLayout>
      <Helmet>
        <title>Наши друзья — проверенные сервисы с эксклюзивными условиями | WBGen</title>
        <meta name="description" content="Партнёры WBGen — верифицированные сервисы для селлеров с персональными условиями и бонусами при переходе от нас." />
      </Helmet>

      {/* Hero */}
      <section className="pt-28 pb-12 sm:pt-36 sm:pb-16 relative">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <img
                src={verifiedBadge}
                alt="Верифицировано"
                className="w-24 h-24 sm:w-28 sm:h-28 animate-levitate drop-shadow-[0_8px_24px_hsl(268,83%,60%,0.3)]"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-white">
              Наши друзья
            </h1>
            <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto">
              Верифицированные сервисы, проверенные командой WBGen. Переходя от нас — вы получаете персональные условия и эксклюзивные бонусы.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-24 sm:pb-32 relative">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-center text-white/40 py-16">Скоро здесь появятся наши друзья</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-6xl mx-auto">
              {friends.map((friend, i) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.06 }}
                  className="group relative"
                >
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[hsl(268,83%,58%)]/0 via-[hsl(280,83%,58%)]/0 to-[hsl(295,83%,58%)]/0 group-hover:from-[hsl(268,83%,58%)]/25 group-hover:to-[hsl(295,83%,58%)]/25 blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />
                  <div
                  className="relative rounded-2xl border border-white/[0.06] bg-[#111111]/60 backdrop-blur-sm p-5 sm:p-6 hover:border-primary/30 hover:bg-[#111111]/80 transition-all duration-300 flex flex-col h-full"
                >
                  <div
                    className="flex items-center gap-4 mb-4 cursor-pointer"
                    onClick={() => setSelected(friend)}
                  >
                    <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl border border-white/[0.08] overflow-hidden shrink-0">
                      <img
                        src={friend.logo_url}
                        alt={friend.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-base truncate">{friend.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-primary/70">
                        <BadgeCheck className="w-3 h-3" />
                        Верифицирован
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-white/50 leading-relaxed mb-5 sm:mb-6 flex-1 line-clamp-3">
                    {friend.short_description}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-white/10 text-white/80 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white hover:border-white/20"
                      onClick={() => setSelected(friend)}
                    >
                      Подробнее
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      asChild
                    >
                      <a href={friend.service_url} target="_blank" rel="noopener noreferrer">
                        Перейти
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <FriendDetailDialog friend={selected} onClose={() => setSelected(null)} />
    </ServicePageLayout>
  );
}

