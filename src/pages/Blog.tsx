import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceHero, ServiceCTA } from "@/components/services";
import { motion } from "framer-motion";
import { FileText, Clock, Eye, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/service-blog-hero.jpg";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  tag: string;
  slug: string;
  published_at: string | null;
  created_at: string;
  views: number;
}

const tagColors: Record<string, string> = {
  "Гайд": "bg-blue-500/20 text-blue-400",
  "Новости": "bg-green-500/20 text-green-400",
  "Советы": "bg-purple-500/20 text-purple-400",
  "Кейс": "bg-amber-500/20 text-amber-400",
  "Обновление": "bg-pink-500/20 text-pink-400",
};

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, excerpt, tag, slug, published_at, created_at, views")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

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
        heroImage={heroImage}
      />

      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-[hsl(268,83%,60%)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {posts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${tagColors[post.tag] || 'bg-gray-500/20 text-gray-400'}`}>
                        {post.tag}
                      </span>
                      <div className="flex items-center gap-1 text-white/40 text-xs">
                        <Clock className="w-3 h-3" />
                        {formatDate(post.published_at || post.created_at)}
                      </div>
                    </div>
                    
                    <h2 className="text-lg font-bold text-white mb-3 group-hover:text-[hsl(268,83%,65%)] transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    
                    <p className="text-white/60 text-sm mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-white/40 text-xs">
                        <Eye className="w-3 h-3" />
                        {post.views} просмотров
                      </div>
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-[hsl(268,83%,65%)] text-sm flex items-center gap-1 hover:gap-2 transition-all"
                      >
                        Читать <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
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
            </motion.div>
          )}
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
