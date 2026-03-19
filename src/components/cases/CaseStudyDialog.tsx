import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Eye, MousePointerClick, ShoppingCart, Lightbulb, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { caseStudyDetails, type CaseStudyDetail } from "./caseStudyData";

interface CaseStudyDialogProps {
  caseId: number;
  children: React.ReactNode;
}

const MetricCard = ({
  icon: Icon,
  label,
  before,
  after,
  suffix = "",
}: {
  icon: React.ElementType;
  label: string;
  before: number;
  after: number;
  suffix?: string;
}) => {
  const growth = Math.round(((after - before) / before) * 100);
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[hsl(268,83%,58%)]" />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-white/40 text-xs line-through mr-2">
            {before}{suffix}
          </span>
          <span className="text-white text-lg sm:text-xl font-bold">
            {after}{suffix}
          </span>
        </div>
        <span className="text-emerald-400 text-xs font-semibold">+{growth}%</span>
      </div>
    </div>
  );
};

export const CaseStudyDialog = ({ caseId, children }: CaseStudyDialogProps) => {
  const [open, setOpen] = useState(false);
  const study = caseStudyDetails[caseId];

  if (!study) return <>{children}</>;

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      <ResponsiveDialogContent className="sm:max-w-2xl lg:max-w-3xl border-border/50 text-white p-0">
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
          {/* Header */}
          <ResponsiveDialogHeader className="space-y-3 p-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[hsl(268,83%,58%)]/15 border border-[hsl(268,83%,58%)]/30 text-xs text-[hsl(268,83%,70%)] font-medium">
                {study.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Кейс
              </span>
            </div>
            <ResponsiveDialogTitle className="text-xl sm:text-2xl font-bold text-white">
              {study.title}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-white/50 text-sm sm:text-base">
              {study.challenge}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {/* Result highlight */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-[hsl(268,83%,58%)]/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-emerald-400 font-medium mb-1">Результат</div>
                <div className="text-sm sm:text-base text-white font-medium">{study.result}</div>
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Ключевые метрики
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <MetricCard
                icon={MousePointerClick}
                label="CTR"
                before={study.metrics.ctrBefore}
                after={study.metrics.ctrAfter}
                suffix="%"
              />
              <MetricCard
                icon={TrendingUp}
                label="Конверсия"
                before={study.metrics.conversionBefore}
                after={study.metrics.conversionAfter}
                suffix="%"
              />
              <MetricCard
                icon={ShoppingCart}
                label="Заказы/день"
                before={study.metrics.ordersBefore}
                after={study.metrics.ordersAfter}
              />
              <MetricCard
                icon={Eye}
                label="Просмотры/день"
                before={study.metrics.viewsBefore}
                after={study.metrics.viewsAfter}
              />
            </div>
          </div>

          {/* Orders chart */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-3">
              📈 Динамика заказов после замены карточки
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={study.timeline} barCategoryGap="20%">
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                    itemStyle={{ color: "#fff" }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    formatter={(value: number) => [`${value} заказов`, "Заказы"]}
                  />
                  <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                    {study.timeline.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index < 2
                            ? "rgba(255,255,255,0.15)"
                            : `hsl(268, 83%, ${50 + index * 3}%)`
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Article */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-3">
              📝 Подробности кейса
            </h3>
            <div className="space-y-3">
              {study.article.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-sm sm:text-[15px] leading-relaxed text-white/70">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Key insights */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Ключевые выводы
            </h3>
            <div className="space-y-2">
              {study.keyInsights.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-3"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white/70">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-[hsl(268,83%,58%)]/15 to-[hsl(280,83%,58%)]/15 border border-[hsl(268,83%,58%)]/20 rounded-xl p-4 text-center">
            <p className="text-sm text-white/60 mb-3">
              Хотите такие же результаты для вашего товара?
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                window.location.href = "/dashboard?tab=pricing";
              }}
              className="bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] hover:opacity-90 text-white font-semibold px-6 py-2.5 rounded-xl"
            >
              Создать карточку от 59₽
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
