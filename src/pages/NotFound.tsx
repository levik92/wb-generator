import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Zap } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">WBGen</span>
        </div>

        {/* 404 Content */}
        <div className="space-y-4">
          <h1 className="text-6xl sm:text-7xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">404</h1>
          <h2 className="text-xl sm:text-2xl font-semibold">Страница не найдена</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Запрашиваемая страница не существует или была перемещена.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link to="/">
            <Button className="btn-gradient rounded-xl px-6">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
