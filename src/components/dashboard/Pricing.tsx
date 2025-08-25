import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface PricingProps {
  profile: Profile;
  onTokensUpdate: () => void;
}

export const Pricing = ({ profile, onTokensUpdate }: PricingProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Тарифные планы</h2>
        <p className="text-muted-foreground">
          Выберите подходящий пакет токенов
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Стартовый</CardTitle>
            <div className="text-3xl font-bold">499₽</div>
            <CardDescription>50 токенов</CardDescription>
            <div className="text-sm text-muted-foreground mt-2">
              <strong>9,98₽</strong> за токен
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">1 токен =</span>
                <span className="text-sm font-medium">1 описание товара</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">6 токенов =</span>
                <span className="text-sm font-medium">1 комплект карточек</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-wb-purple mr-2" />
                  <span className="text-sm">8 комплектов карточек</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-wb-purple mr-2" />
                  <span className="text-sm">50 описаний товаров</span>
                </div>
              </div>
            </div>
            <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
              Выбрать
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-wb-purple">
          <CardHeader>
            <Badge className="w-fit bg-wb-purple">Популярный</Badge>
            <CardTitle>Профи</CardTitle>
            <div className="text-3xl font-bold">1 499₽</div>
            <CardDescription>200 токенов</CardDescription>
            <div className="text-sm text-muted-foreground mt-2">
              <strong>7,50₽</strong> за токен
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">1 токен =</span>
                <span className="text-sm font-medium">1 описание товара</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">6 токенов =</span>
                <span className="text-sm font-medium">1 комплект карточек</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-wb-purple mr-2" />
                  <span className="text-sm">33 комплекта карточек</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-wb-purple mr-2" />
                  <span className="text-sm">200 описаний товаров</span>
                </div>
              </div>
            </div>
            <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
              Выбрать
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Бизнес</CardTitle>
            <div className="text-3xl font-bold">5 999₽</div>
            <CardDescription>1000 токенов</CardDescription>
            <div className="text-sm text-muted-foreground mt-2">
              <strong>6,00₽</strong> за токен
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">1 токен =</span>
                <span className="text-sm font-medium">1 описание товара</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">6 токенов =</span>
                <span className="text-sm font-medium">1 комплект карточек</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-wb-purple mr-2" />
                  <span className="text-sm">166 комплектов карточек</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-wb-purple mr-2" />
                  <span className="text-sm">1000 описаний товаров</span>
                </div>
              </div>
            </div>
            <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
              Выбрать
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};