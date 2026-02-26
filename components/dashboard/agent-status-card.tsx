"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type AgentType, AGENT_LABELS } from "@/types";
import {
  Search,
  Send,
  GitBranch,
  FileSearch,
  RefreshCw,
  FileText,
  type LucideIcon,
} from "lucide-react";

const agentIcons: Record<AgentType, LucideIcon> = {
  lead_scout: Search,
  outreach_composer: Send,
  pipeline_intelligence: GitBranch,
  prospect_research: FileSearch,
  follow_up_sequencing: RefreshCw,
  proposal_generator: FileText,
};

interface AgentStatusCardProps {
  agentType: AgentType;
  status: "idle" | "running" | "completed" | "failed";
  lastRun?: string;
  itemsProcessed?: number;
  nextRun?: string;
}

export function AgentStatusCard({
  agentType,
  status,
  lastRun,
  itemsProcessed,
  nextRun,
}: AgentStatusCardProps) {
  const Icon = agentIcons[agentType];
  const label = AGENT_LABELS[agentType];

  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-sans font-semibold">{label}</CardTitle>
          </div>
          <Badge
            variant={
              status === "running" ? "default" :
              status === "completed" ? "success" :
              status === "failed" ? "destructive" :
              "secondary"
            }
            className={cn(
              "text-xs",
              status === "running" && "animate-pulse"
            )}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 text-xs text-muted-foreground font-sans">
          {lastRun && (
            <p>Last run: {lastRun}</p>
          )}
          {itemsProcessed !== undefined && (
            <p>Items processed: {itemsProcessed}</p>
          )}
          {nextRun && (
            <p>Next run: {nextRun}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
