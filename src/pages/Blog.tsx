import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceHero, ServiceCTA } from "@/components/services";
import { motion } from "framer-motion";
import { FileText, Bookmark, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Blog = () => {
  const [email, setEmail] = useState("");

  return (
    <ServicePageLayout>
      <Helmet>
        <title>Блог WBGen — статьи для селлеров Wildberries</title>
        <meta name="description" content="Полезные статьи, гайды и новости для продавцов Wildberries. Советы по оформлению карточек, SEO-продвижению и увеличению продаж." />
        <meta property="og:title" content="Блог WBGen — статьи для селлеров" />
        <meta property="og:url" content="https://wbgen.ru/blog" />
        <link rel="canonical" href="https://wbgen.ru/blog" />
      </Helmet>

      <ServiceHero
        title="Блог WBGen"
        subtitle="для селлеров"
        description="Полезные статьи, гайды и новости для продавцов маркетплейсов. Советы по оформлению карточек, SEO-продвижению и увеличению продаж."
        breadcrumbs={[{ label: "Ресурсы" }, { label: "Блог" }]}
        badge="Ресурсы"
      />

      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Скоро здесь появятся статьи
            </h2>
            <p className="text-white/60 mb-8">
              Мы готовим полезный контент для селлеров: гайды по оформлению карточек, 
              секреты SEO-продвижения, разборы кейсов и новости маркетплейсов.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ваш email"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                />
              </div>
              <Button className="bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,90%,55%)] text-white border-0 px-6">
                <Bookmark className="w-4 h-4 mr-2" />
                Подписаться
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <ServiceCTA
        title="Попробуйте WBGen уже сейчас"
        subtitle="Создавайте карточки с ИИ, пока мы готовим статьи"
        ctaText="Начать бесплатно"
      />
    </ServicePageLayout>
  );
};

export default Blog;
