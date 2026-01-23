import { Helmet } from "react-helmet-async";
import { ServicePageLayout } from "@/components/services";
import { motion } from "framer-motion";
import { Clock, Eye, ArrowLeft, Tag } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  tag: string;
  slug: string;
  published_at: string | null;
  created_at: string;
  views: number;
  image_url: string | null;
}

const tagColors: Record<string, string> = {
  "Гайд": "bg-blue-500/20 text-blue-400",
  "Новости": "bg-green-500/20 text-green-400",
  "Советы": "bg-purple-500/20 text-purple-400",
  "Кейс": "bg-amber-500/20 text-amber-400",
  "Обновление": "bg-pink-500/20 text-pink-400",
};

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (postSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", postSlug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      
      setPost(data);

      // Increment view count
      await supabase
        .from("blog_posts")
        .update({ views: (data.views || 0) + 1 })
        .eq("id", data.id);
    } catch (error) {
      console.error("Error loading post:", error);
      setPost(null);
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

  // Calculate read time based on content length
  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} мин`;
  };

  // Format markdown content to React elements
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let isInList = false;

    const processLine = (line: string, index: number) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-bold text-white mt-8 mb-4">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-white mt-10 mb-4">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-white mt-12 mb-6">{line.slice(2)}</h1>;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={index} className="border-l-4 border-[hsl(268,83%,55%)] pl-4 py-2 my-4 bg-white/5 rounded-r-lg">
            <p className="text-white/80 italic">{line.slice(2)}</p>
          </blockquote>
        );
      }

      // Bold text
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
      
      // Links
      processedLine = processedLine.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-[hsl(268,83%,65%)] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      // Empty line
      if (line.trim() === '') {
        return <div key={index} className="h-4" />;
      }

      // Regular paragraph
      return (
        <p 
          key={index} 
          className="text-white/70 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    };

    lines.forEach((line, index) => {
      // Handle list items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!isInList) {
          isInList = true;
          listItems = [];
        }
        listItems.push(line.slice(2));
      } else {
        // End list if we were in one
        if (isInList) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-2 my-4 text-white/70">
              {listItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
          listItems = [];
          isInList = false;
        }
        elements.push(processLine(line, index));
      }
    });

    // Handle remaining list items
    if (isInList && listItems.length > 0) {
      elements.push(
        <ul key="list-end" className="list-disc list-inside space-y-2 my-4 text-white/70">
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }

    return elements;
  };

  if (loading) {
    return (
      <ServicePageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[hsl(268,83%,60%)] border-t-transparent rounded-full animate-spin" />
        </div>
      </ServicePageLayout>
    );
  }

  if (!post) {
    return (
      <ServicePageLayout>
        <Helmet>
          <title>Статья не найдена | Блог WBGen</title>
        </Helmet>
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <h1 className="text-3xl font-bold text-white mb-4">Статья не найдена</h1>
          <p className="text-white/60 mb-8">Возможно, статья была удалена или ещё не опубликована</p>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к блогу
            </Button>
          </Link>
        </div>
      </ServicePageLayout>
    );
  }

  return (
    <ServicePageLayout>
      <Helmet>
        <title>{post.title} | Блог WBGen</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        {post.image_url && <meta property="og:image" content={post.image_url} />}
        <meta property="og:url" content={`https://wbgen.ru/blog/${post.slug}`} />
        <link rel="canonical" href={`https://wbgen.ru/blog/${post.slug}`} />
      </Helmet>

      <article className="pt-28 sm:pt-36 pb-20">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link 
              to="/blog"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад к блогу
            </Link>
          </motion.div>

          {/* Article header */}
          <motion.header
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-3xl mx-auto mb-12"
          >
            {/* Tag */}
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tagColors[post.tag] || 'bg-gray-500/20 text-gray-400'}`}>
                <Tag className="w-3 h-3 inline mr-1" />
                {post.tag}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-white/50 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(post.published_at || post.created_at)}
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.views} просмотров
              </div>
              <span>•</span>
              <div>{calculateReadTime(post.content)} чтения</div>
            </div>
          </motion.header>

          {/* Featured image */}
          {post.image_url && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-4xl mx-auto mb-12"
            >
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/10">
                <img 
                  src={post.image_url} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          )}

          {/* Article content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <div className="prose prose-invert prose-lg">
              {formatContent(post.content)}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-3xl mx-auto mt-16 pt-12 border-t border-white/10"
          >
            <div className="glass-card rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Попробуйте WBGen уже сейчас
              </h3>
              <p className="text-white/60 mb-6">
                Создавайте продающие карточки для Wildberries с помощью ИИ за 3 минуты
              </p>
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-[hsl(268,83%,55%)] to-[hsl(280,70%,50%)]">
                  Создать карточку бесплатно
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </article>
    </ServicePageLayout>
  );
};

export default BlogArticle;
