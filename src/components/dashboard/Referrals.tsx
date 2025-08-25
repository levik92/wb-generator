import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

      <Card>
        <CardHeader>
          <CardTitle>Ваша реферальная ссылка</CardTitle>
          <CardDescription>
            Поделитесь этой ссылкой с друзьями
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input value={referralLink} readOnly />
            <Button onClick={copyLink} className="bg-wb-purple hover:bg-wb-purple-dark">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">+25</div>
              <div className="text-sm text-muted-foreground">токенов за покупку друга</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">+10</div>
              <div className="text-sm text-muted-foreground">токенов другу при регистрации</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};