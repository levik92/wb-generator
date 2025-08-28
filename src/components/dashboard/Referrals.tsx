import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Users } from "lucide-react";
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

  const copyLink = () => {
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

      <div className="bg-gradient-to-r from-wb-purple/10 to-wb-purple-dark/10 border-2 border-wb-purple/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-wb-purple/20 p-3 rounded-lg">
            <Users className="h-6 w-6 text-wb-purple" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-wb-purple">Ваша реферальная ссылка</h3>
            <p className="text-sm text-muted-foreground">
              Поделитесь этой ссылкой с друзьями
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="bg-background/80 border-2 border-border/60"
            />
            <Button onClick={copyLink} className="bg-wb-purple hover:bg-wb-purple-dark px-4">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl">
              <div className="text-3xl font-bold text-green-600 mb-1">+20</div>
              <div className="text-sm text-green-700 font-medium">токенов за первую покупку друга</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl">
              <div className="text-3xl font-bold text-blue-600 mb-1">+10</div>
              <div className="text-sm text-blue-700 font-medium">токенов другу при регистрации</div>
            </div>
          </div>
          
          <div className="bg-muted/40 p-4 rounded-lg border text-sm text-muted-foreground">
            <strong>Как это работает:</strong> Ваш друг получает +10 токенов сразу при регистрации (итого 35 токенов). 
            Вы получаете +20 токенов только после его первого пополнения баланса.
          </div>
        </div>
      </div>
    </div>
  );
};