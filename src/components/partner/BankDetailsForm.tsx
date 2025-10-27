import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RF_BANKS = [
  "Сбербанк",
  "Альфа-Банк",
  "ВТБ",
  "Газпромбанк",
  "Россельхозбанк",
  "Открытие",
  "Совкомбанк",
  "Промсвязьбанк",
  "Райффайзенбанк",
  "Росбанк",
  "Банк Санкт-Петербург",
  "Ак Барс",
  "МКБ",
  "Уралсиб",
  "Тинькофф",
  "Другой банк"
];

interface BankDetailsFormProps {
  partnerId: string;
}

export const BankDetailsForm = ({ partnerId }: BankDetailsFormProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasDetails, setHasDetails] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: "",
    card_number: "",
    phone_number: "",
    full_name: ""
  });

  useEffect(() => {
    loadBankDetails();
  }, [partnerId]);

  const loadBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_bank_details")
        .select("*")
        .eq("partner_id", partnerId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setFormData(data);
        setHasDetails(true);
      }
    } catch (error) {
      console.error("Error loading bank details:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate phone number
      const phoneRegex = /^(\+7|8)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        throw new Error("Неверный формат номера телефона");
      }

      // Validate card number (16 digits)
      const cardRegex = /^[0-9]{16}$/;
      if (!cardRegex.test(formData.card_number.replace(/\s/g, ""))) {
        throw new Error("Неверный формат номера карты");
      }

      if (hasDetails) {
        const { error } = await supabase
          .from("partner_bank_details")
          .update(formData)
          .eq("partner_id", partnerId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("partner_bank_details")
          .insert({
            ...formData,
            partner_id: partnerId
          });

        if (error) throw error;
        setHasDetails(true);
      }

      toast({
        title: "Успешно",
        description: "Банковские реквизиты сохранены"
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving bank details:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Банковские реквизиты</CardTitle>
            {!isEditing && hasDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name">Банк</Label>
            <Select
              value={formData.bank_name}
              onValueChange={(value) => setFormData({ ...formData, bank_name: value })}
              disabled={!isEditing && hasDetails}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите банк" />
              </SelectTrigger>
              <SelectContent>
                {RF_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="card_number">Номер карты</Label>
            <Input
              id="card_number"
              placeholder="1234 5678 9012 3456"
              value={formData.card_number}
              onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
              disabled={!isEditing && hasDetails}
              maxLength={19}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Номер телефона</Label>
            <Input
              id="phone_number"
              placeholder="+7 (900) 123-45-67"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              disabled={!isEditing && hasDetails}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">ФИО (как на карте)</Label>
            <Input
              id="full_name"
              placeholder="Иванов Иван Иванович"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!isEditing && hasDetails}
            />
          </div>

          {(isEditing || !hasDetails) && (
            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Поддержка</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open("https://t.me/your_support_bot", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Написать в поддержку Telegram
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
