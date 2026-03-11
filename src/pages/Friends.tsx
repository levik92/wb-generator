import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { ExternalLink, BadgeCheck, Sparkles } from "lucide-react";
import verifiedBadge from "@/assets/verified-badge.png";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Helmet } from "react-helmet-async";

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
    <>
      <Helmet>
        <title>Наши друзья — проверенные сервисы с эксклюзивными условиями | WBGen</title>
        <meta name="description" content="Партнёры WBGen — верифицированные сервисы для селлеров с персональными условиями и бонусами при переходе от нас." />
      </Helmet>

      <div className="min-h-screen bg-[hsl(240,10%,4%)] text-white relative overflow-hidden">
        {/* Background gradient animations */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
          <div 
            className="absolute w-[800px] h-[800px] -top-1/4 -left-1/4 rounded-full animate-[pulse_15s_ease-in-out_infinite]"
            style={{
              background: 'radial-gradient(circle, hsl(268, 50%, 25%) 0%, transparent 70%)',
            }}
          />
          <div 
            className="absolute w-[600px] h-[600px] top-1/2 -right-1/4 rounded-full animate-[pulse_20s_ease-in-out_infinite_2s]"
            style={{
              background: 'radial-gradient(circle, hsl(280, 50%, 20%) 0%, transparent 70%)',
            }}
          />
          <div 
            className="absolute w-[500px] h-[500px] bottom-0 left-1/3 rounded-full animate-[pulse_25s_ease-in-out_infinite_4s]"
            style={{
              background: 'radial-gradient(circle, hsl(260, 40%, 18%) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Noise overlay */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.02]" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` 
          }} 
        />

        <LandingHeader />

        {/* Hero */}
        <section className="pt-28 pb-12 sm:pt-36 sm:pb-16 relative z-10">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Verified Badge */}
              <div className="flex justify-center mb-6">
                <img
                  src={verifiedBadge}
                  alt="Верифицировано"
                  className="w-24 h-24 sm:w-28 sm:h-28 animate-levitate drop-shadow-[0_8px_24px_hsl(268,83%,60%,0.3)]"
                />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
                <BadgeCheck className="w-4 h-4" />
                <span>Проверено командой WBGen</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Наши друзья
              </h1>
              <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto">
                Верифицированные сервисы, которые мы рекомендуем. Переходя от нас — вы получаете персональные условия и эксклюзивные бонусы.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Grid */}
        <section className="pb-24 sm:pb-32 relative z-10">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <p className="text-center text-white/40 py-16">Скоро здесь появятся наши друзья</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {friends.map((friend, i) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="group relative rounded-2xl border border-white/[0.06] bg-[#111111]/60 backdrop-blur-sm p-6 hover:border-primary/30 hover:bg-[#111111]/80 transition-all duration-300 flex flex-col"
                  >
                    {/* Logo + name */}
                    <div
                      className="flex items-center gap-4 mb-4 cursor-pointer"
                      onClick={() => setSelected(friend)}
                    >
                      <div className="w-14 h-14 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={friend.logo_url}
                          alt={friend.name}
                          className="w-10 h-10 object-contain"
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

                    {/* Description */}
                    <p className="text-sm text-white/50 leading-relaxed mb-6 flex-1 line-clamp-3">
                      {friend.short_description}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
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
                          <Sparkles className="w-3.5 h-3.5" />
                          Эксклюзив
                        </a>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="relative z-10">
          <LandingFooter />
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
              {/* Detailed description */}
              <div>
                <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">О сервисе</h4>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                  {selected?.detailed_description || selected?.short_description}
                </p>
              </div>

              {/* Exclusive conditions */}
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

              {/* CTA */}
              <Button className="w-full gap-2" size="lg" asChild>
                <a href={selected?.service_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  Перейти и получить эксклюзив
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
