import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User, BarChart3, Megaphone, Loader2 } from "lucide-react";

interface SurveyData {
  question_key: string;
  answer: string;
  count: number;
}

const QUESTION_LABELS: Record<string, { title: string; icon: any }> = {
  who_are_you: { title: "Кто вы?", icon: User },
  monthly_volume: { title: "Объём карточек в месяц", icon: BarChart3 },
  acquisition_channel: { title: "Откуда узнали о WBGen?", icon: Megaphone },
};

const QUESTION_ORDER = ["who_are_you", "monthly_volume", "acquisition_channel"];

export function SurveyStats() {
  const [data, setData] = useState<SurveyData[]>([]);
  const [totalRespondents, setTotalRespondents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: responses, error } = await (supabase as any)
        .from("user_survey_responses")
        .select("question_key, answer");

      if (error) throw error;

      // Count unique users
      const { data: userCount } = await (supabase as any)
        .from("user_survey_responses")
        .select("user_id")
        .eq("question_key", "who_are_you");

      const uniqueUsers = new Set((userCount || []).map((r: any) => r.user_id));
      setTotalRespondents(uniqueUsers.size);

      // Aggregate counts
      const counts: Record<string, Record<string, number>> = {};
      for (const row of responses || []) {
        if (!counts[row.question_key]) counts[row.question_key] = {};
        counts[row.question_key][row.answer] = (counts[row.question_key][row.answer] || 0) + 1;
      }

      const aggregated: SurveyData[] = [];
      for (const [qk, answers] of Object.entries(counts)) {
        for (const [answer, count] of Object.entries(answers)) {
          aggregated.push({ question_key: qk, answer, count });
        }
      }

      setData(aggregated);
    } catch (error) {
      console.error("Error loading survey stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (totalRespondents === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Пока нет ответов на опрос
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">
          Опрос пользователей ({totalRespondents} ответов)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {QUESTION_ORDER.map((qk) => {
          const meta = QUESTION_LABELS[qk];
          if (!meta) return null;
          const Icon = meta.icon;
          const questionData = data
            .filter((d) => d.question_key === qk)
            .sort((a, b) => b.count - a.count);
          const total = questionData.reduce((s, d) => s + d.count, 0);

          return (
            <div key={qk} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-sm">{meta.title}</h4>
              </div>
              <div className="space-y-2">
                {questionData.map((item) => {
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={item.answer} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground truncate mr-2">{item.answer}</span>
                        <span className="text-muted-foreground shrink-0">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
