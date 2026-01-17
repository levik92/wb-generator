import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  // Generate JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Главная",
        "item": "https://wbgen.ru/"
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.label,
        ...(item.href && { "item": `https://wbgen.ru${item.href}` })
      }))
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center flex-wrap gap-2 text-sm text-white/50">
          <li className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="sr-only">Главная</span>
            </Link>
          </li>
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-white/30" />
              {item.href ? (
                <Link 
                  to={item.href} 
                  className="hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-white/70">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};
