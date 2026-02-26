"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "purple" | "coral" | "green";
}

const variantStyles = {
  default: "bg-muted/50",
  purple: "bg-highlight-purple/10",
  coral: "bg-highlight-coral/10",
  green: "bg-highlight-green/10",
};

const iconStyles = {
  default: "text-muted-foreground",
  purple: "text-highlight-purple",
  coral: "text-highlight-coral",
  green: "text-highlight-green",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground font-sans">{title}</p>
            <p className="text-3xl font-display text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground font-sans">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium font-sans",
                trend.value >= 0 ? "text-highlight-green" : "text-highlight-coral"
              )}>
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", variantStyles[variant])}>
            <Icon className={cn("h-5 w-5", iconStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
