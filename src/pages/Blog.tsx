import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceHero, ServiceCTA } from "@/components/services";
import { motion } from "framer-motion";
import { FileText, Clock, Eye, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/service-blog-hero.jpg";

// Placeholder posts until blog_posts table is created
const placeholderPosts = [
  {
    id: "1",
    title: "Как создать продающую карточку товара на Wildberries",
    excerpt: "Разбираем ключевые элементы успешной карточки: от заголовка до инфографики. Практические советы от топ-селлеров.",
    tag: "Гайд",
    slug: "kak-sozdat-prodayuschuyu-kartochku",
    published_at: "2025-01-15",
    views: 1247,
  },
  {
    id: "2",
    title: "SEO-оптимизация описаний: 10 правил для роста продаж",
    excerpt: "Узнайте, как правильно составлять описания товаров, чтобы попадать в топ поисковой выдачи маркетплейса.",
    tag: "Советы",
    slug: "seo-optimizaciya-opisaniy",
    published_at: "2025-01-12",
    views: 892,
  },
  {
    id: "3",
    title: "Обновление WBGen: новые шаблоны карточек",
    excerpt: "Добавили 15 новых профессиональных шаблонов для разных категорий товаров. Теперь создавать карточки ещё проще!",
    tag: "Обновление",
    slug: "novye-shablony-kartochek",
    published_at: "2025-01-10",
    views: 654,
  },
  {
    id: "4",
    title: "Кейс: рост продаж на 340% после редизайна карточек",
    excerpt: "Реальная история селлера косметики, который переоформил карточки с помощью WBGen и увеличил конверсию втрое.",
    tag: "Кейс",
    slug: "keys-rost-prodazh-340",
    published_at: "2025-01-08",
    views: 1503,
  },
  {
    id: "5",
    title: "Тренды оформления карточек в 2025 году",
    excerpt: "Какие визуальные решения сейчас в моде на маркетплейсах и как это использовать для повышения CTR.",
    tag: "Новости",
    slug: "trendy-oformleniya-2025",
    published_at: "2025-01-05",
    views: 728,
  },
  {
    id: "6",
    title: "Штрих-коды для Wildberries: полный гайд",
    excerpt: "Всё о генерации, размещении и требованиях к штрих-кодам. Избегаем частых ошибок при маркировке.",
    tag: "Гайд",
    slug: "shtrih-kody-polnyy-gayd",
    published_at: "2025-01-03",
    views: 1089,
  },
];

const tagColors: Record<string, string> = {
  "Гайд": "bg-blue-500/20 text-blue-400",
  "Новости": "bg-green-500/20 text-green-400",
  "Советы": "bg-purple-500/20 text-purple-400",
  "Кейс": "bg-amber-500/20 text-amber-400",
  "Обновление": "bg-pink-500/20 text-pink-400",
};

const Blog = () => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {placeholderPosts.map((post, index) => (
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
                      {formatDate(post.published_at)}
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
                    <span className="text-[hsl(268,83%,65%)] text-sm flex items-center gap-1 opacity-50 cursor-not-allowed">
                      Скоро <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-white/50 text-sm">
              Полноценный блог с возможностью чтения статей появится совсем скоро
            </p>
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
