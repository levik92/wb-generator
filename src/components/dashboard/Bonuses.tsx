import { BonusProgram } from "./BonusProgram";
import { Referrals } from "./Referrals";
import { Separator } from "@/components/ui/separator";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface BonusesProps {
  profile: Profile;
}

export const Bonuses = ({ profile }: BonusesProps) => {
  return (
    <div className="space-y-6">
      <BonusProgram profile={profile} />
      <Separator className="opacity-50" />
      <Referrals profile={profile} />
    </div>
  );
};

