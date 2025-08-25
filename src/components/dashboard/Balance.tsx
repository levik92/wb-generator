import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, CreditCard } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface BalanceProps {
  profile: Profile;
  onTokensUpdate: () => void;
}

export const Balance = ({ profile, onTokensUpdate }: BalanceProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Баланс</h2>
        <p className="text-muted-foreground">
          Управляйте своими токенами и тарифными планами
        </p>
      </div>

      {/* Current Balance */}
      <Card className="border-wb-purple/20 bg-gradient-to-r from-wb-purple/5 to-wb-purple/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-wb-purple/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-wb-purple" />
            </div>
            <div>
              <CardTitle className="text-2xl">Текущий баланс</CardTitle>
              <CardDescription>Доступные токены для генерации</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="text-4xl font-bold text-wb-purple">
              {profile.tokens_balance}
            </div>
            <Badge className="bg-wb-purple text-white text-lg px-4 py-2">
              токенов
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-wb-purple" />
                <span className="font-medium">Описание товара</span>
              </div>
              <p className="text-sm text-muted-foreground">1 токен = 1 описание</p>
              <p className="text-xs text-muted-foreground mt-1">
                Доступно: {profile.tokens_balance} описаний
              </p>
            </div>
            
            <div className="bg-white/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-wb-purple" />
                <span className="font-medium">Карточки товара</span>
              </div>
              <p className="text-sm text-muted-foreground">6 токенов за карточку из 6 фотографий</p>
              <p className="text-xs text-muted-foreground mt-1">
                Доступно: {Math.floor(profile.tokens_balance / 6)} комплектов
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div>
        <h3 className="text-2xl font-bold mb-4">Тарифные планы</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center bg-wb-purple/10 rounded-lg p-3">
                    <span className="text-sm font-medium">1 описание</span>
                    <span className="text-sm text-wb-purple font-bold">~10₽</span>
                  </div>
                  <div className="flex justify-between items-center bg-wb-purple/10 rounded-lg p-3">
                    <span className="text-sm font-medium">1 комплект карточки</span>
                    <span className="text-sm text-wb-purple font-bold">~60₽</span>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    <span className="text-sm">8 комплектов карточек</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    <span className="text-sm">50 описаний товаров</span>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
                Выбрать
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-wb-purple ml-0 sm:ml-4">
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
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center bg-wb-purple/10 rounded-lg p-3">
                    <span className="text-sm font-medium">1 описание</span>
                    <span className="text-sm text-wb-purple font-bold">~7,50₽</span>
                  </div>
                  <div className="flex justify-between items-center bg-wb-purple/10 rounded-lg p-3">
                    <span className="text-sm font-medium">1 комплект карточки</span>
                    <span className="text-sm text-wb-purple font-bold">~45₽</span>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    <span className="text-sm">33 комплекта карточек</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
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
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center bg-wb-purple/10 rounded-lg p-3">
                    <span className="text-sm font-medium">1 описание</span>
                    <span className="text-sm text-wb-purple font-bold">~6₽</span>
                  </div>
                  <div className="flex justify-between items-center bg-wb-purple/10 rounded-lg p-3">
                    <span className="text-sm font-medium">1 комплект карточки</span>
                    <span className="text-sm text-wb-purple font-bold">~36₽</span>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
                    <span className="text-sm">166 комплектов карточек</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-wb-purple mr-2 flex-shrink-0" />
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
    </div>
  );
};