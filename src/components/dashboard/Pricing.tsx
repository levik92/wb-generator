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
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
              Купить
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-wb-purple">
          <CardHeader>
            <Badge className="w-fit bg-wb-purple">Популярный</Badge>
            <CardTitle>Профи</CardTitle>
            <div className="text-3xl font-bold">1 499₽</div>
            <CardDescription>200 токенов</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
              Купить
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Бизнес</CardTitle>
            <div className="text-3xl font-bold">5 999₽</div>
            <CardDescription>1000 токенов</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
              Купить
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};