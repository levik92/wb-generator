import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LogOut, Link as LinkIcon } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface SettingsProps {
  profile: Profile;
  onUpdate: () => void;
  onSignOut: () => void;
}

export const Settings = ({ profile, onUpdate, onSignOut }: SettingsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Настройки</h2>
        <p className="text-muted-foreground">
          Управление профилем и подключениями
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>Основная информация аккаунта</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Имя</Label>
            <Input placeholder="Ваше имя" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wildberries</CardTitle>
          <CardDescription>Подключение к личному кабинету</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Статус подключения</span>
            <Badge variant={profile.wb_connected ? "default" : "secondary"}>
              {profile.wb_connected ? 'Подключен' : 'Не подключен'}
            </Badge>
          </div>
          <Button className="w-full bg-wb-purple hover:bg-wb-purple-dark">
            <LinkIcon className="w-4 h-4 mr-2" />
            {profile.wb_connected ? 'Переподключить' : 'Подключить'} WB
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={onSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Выйти из аккаунта
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};