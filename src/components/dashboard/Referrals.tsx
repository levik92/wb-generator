import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, ExternalLink, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface ReferralsProps {
  profile: Profile;
}

export const Referrals = ({ profile }: ReferralsProps) => {
  const { toast } = useToast();
  const referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Ссылка скопирована!",
      description: "Поделитесь ей с друзьями",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Реферальная программа</h2>
        <p className="text-muted-foreground">
          Приглашайте друзей и получайте бонусы
        </p>
      </div>

      <Card className="bg-muted/30 border border-muted/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-muted p-3 rounded-lg">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">Реферальная программа</CardTitle>
              <CardDescription className="text-muted-foreground">
                Приглашайте друзей и получайте бонусы
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/30 border border-muted rounded-[12px] p-6 shadow-sm">
            <h3 className="font-medium mb-4 text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Ваша реферальная ссылка:
            </h3>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="flex-1 bg-background/80"
              />
              <Button
                onClick={copyReferralLink}
                variant="outline"
                className="px-4 hover:bg-primary hover:text-primary-foreground"
              >
                <Copy className="h-4 w-4 mr-2" />
                Копировать
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/30 border-2 border-muted rounded-xl">
              <div className="text-3xl font-bold text-muted-foreground mb-1">+20</div>
              <div className="text-sm text-muted-foreground font-medium">токенов за первую покупку друга</div>
            </div>
            <div className="text-center p-4 bg-muted/30 border-2 border-muted rounded-xl">
              <div className="text-3xl font-bold text-muted-foreground mb-1">+10</div>
              <div className="text-sm text-muted-foreground font-medium">токенов другу при регистрации</div>
            </div>
          </div>
          
          <div className="bg-muted/40 p-4 rounded-lg border text-sm text-muted-foreground">
            <strong>Как это работает:</strong> Ваш друг получает +10 токенов сразу при регистрации (итого 35 токенов). 
            Вы получаете +20 токенов только после его первого пополнения баланса.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};