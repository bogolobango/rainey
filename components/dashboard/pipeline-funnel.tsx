"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, type PipelineStage } from "@/types";

interface PipelineFunnelProps {
  data: Record<PipelineStage, number>;
}

const stageColors: Record<PipelineStage, string> = {
  cold: "bg-muted-foreground/30",
  contacted: "bg-chart-4",
  responded: "bg-chart-1",
  discovery_booked: "bg-chart-5",
  demo_completed: "bg-chart-2",
  proposal_sent: "bg-chart-3",
  negotiating: "bg-highlight-purple",
  closed_won: "bg-highlight-green",
  closed_lost: "bg-highlight-coral",
};

export function PipelineFunnel({ data }: PipelineFunnelProps) {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0) || 1;
  const maxCount = Math.max(...Object.values(data), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-sans font-semibold">Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {PIPELINE_STAGES.map((stage) => {
            const count = data[stage] || 0;
            const width = Math.max((count / maxCount) * 100, 2);
            return (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="text-muted-foreground">
                    {PIPELINE_STAGE_LABELS[stage]}
                  </span>
                  <span className="font-medium text-foreground">{count}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", stageColors[stage])}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm font-sans">
          <span className="text-muted-foreground">Total in pipeline</span>
          <span className="font-semibold text-foreground">{total}</span>
        </div>
      </CardContent>
    </Card>
  );
}
