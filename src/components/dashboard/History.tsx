import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Image, FileText } from "lucide-react";

export const History = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">История генераций</h2>
        <p className="text-muted-foreground">
          Все ваши созданные карточки и описания
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Недавние генерации</CardTitle>
          <CardDescription>
            История будет доступна после первых генераций
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4" />
            <p>История пуста</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};