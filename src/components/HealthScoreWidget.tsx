import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/contexts/BudgetContext";
import { Heart, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

const HealthScoreWidget = () => {
  const { budgets, transactions } = useBudget();

  const healthData = useMemo(() => {
    // Find health/medical budget
    const healthBudget = budgets.find(
      (b) =>
        b.name.toLowerCase().includes("health") ||
        b.name.toLowerCase().includes("medical") ||
        b.name.toLowerCase().includes("medicine")
    );

    // Calculate health spending from transactions
    const healthSpent = transactions
      .filter(
        (t) =>
          t.amount < 0 &&
          (t.category?.toLowerCase().includes("health") ||
            t.category?.toLowerCase().includes("medical") ||
            t.category?.toLowerCase().includes("medicine") ||
            t.description?.toLowerCase().includes("medicine") ||
            t.description?.toLowerCase().includes("pharmacy") ||
            t.description?.toLowerCase().includes("hospital") ||
            t.description?.toLowerCase().includes("doctor"))
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const allocated = healthBudget?.allocated || 0;
    const budgetSpent = healthBudget?.spent || 0;
    const totalHealthSpend = Math.max(healthSpent, budgetSpent);

    // Calculate score: 100 = no spending, 0 = 2x+ over budget
    let percentage = 0;
    let score: "green" | "yellow" | "red" = "green";
    let label = "Healthy";
    let message = "Your family health spending is within safe limits.";

    if (allocated > 0) {
      percentage = Math.round((totalHealthSpend / allocated) * 100);
      if (percentage <= 60) {
        score = "green";
        label = "Healthy";
        message = "Medical spending is well within budget. Your family is in good health! 💪";
      } else if (percentage <= 100) {
        score = "yellow";
        label = "Moderate";
        message = "Medical spending is approaching the budget limit. Monitor your health expenses.";
      } else {
        score = "red";
        label = "Critical";
        message = "⚠️ Warning: Medical spending has exceeded the budget! Your family may be facing health issues. Consider consulting a doctor for preventive care.";
      }
    } else if (totalHealthSpend > 0) {
      // No budget set but spending exists
      score = "yellow";
      label = "No Budget Set";
      percentage = 100;
      message = "You're spending on health without a budget. Set a Health budget to track better.";
    }

    return { score, label, message, percentage, totalHealthSpend, allocated };
  }, [budgets, transactions]);

  const scoreColors = {
    green: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-400",
      bar: "bg-emerald-500",
      icon: "text-emerald-500",
      glow: "shadow-emerald-200/50",
    },
    yellow: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      bar: "bg-amber-500",
      icon: "text-amber-500",
      glow: "shadow-amber-200/50",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      bar: "bg-red-500",
      icon: "text-red-500",
      glow: "shadow-red-200/50",
    },
  };

  const colors = scoreColors[healthData.score];
  const ScoreIcon =
    healthData.score === "green"
      ? ShieldCheck
      : healthData.score === "yellow"
      ? AlertTriangle
      : ShieldAlert;

  return (
    <Card className={`border ${colors.border} ${colors.bg} shadow-lg ${colors.glow}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-card-foreground flex items-center gap-2">
          <Heart className={`w-5 h-5 ${colors.icon}`} />
          Family Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Indicator */}
        <div className="flex items-center gap-4">
          {/* Traffic Light */}
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/80 border border-border">
            <div className={`w-6 h-6 rounded-full ${healthData.score === "green" ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-muted"} transition-all`} />
            <div className={`w-6 h-6 rounded-full ${healthData.score === "yellow" ? "bg-amber-500 shadow-lg shadow-amber-500/50" : "bg-muted"} transition-all`} />
            <div className={`w-6 h-6 rounded-full ${healthData.score === "red" ? "bg-red-500 shadow-lg shadow-red-500/50" : "bg-muted"} transition-all`} />
          </div>

          {/* Score Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ScoreIcon className={`w-5 h-5 ${colors.icon}`} />
              <span className={`text-lg font-bold ${colors.text}`}>{healthData.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{healthData.message}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {healthData.allocated > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Medical Budget Usage</span>
              <span className={`font-semibold ${colors.text}`}>{healthData.percentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
                style={{ width: `${Math.min(healthData.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹{healthData.totalHealthSpend.toLocaleString()} spent</span>
              <span>₹{healthData.allocated.toLocaleString()} budget</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthScoreWidget;
