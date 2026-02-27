"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Send,
  MessageSquare,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { PIPELINE_STAGE_LABELS, type PipelineStage, AGENT_LABELS, type AgentType } from "@/types";

interface PipelineEventRow {
  id: number;
  leadId: number;
  fromStage: string | null;
  toStage: string;
  trigger: string;
  notes: string | null;
  createdAt: string;
  companyName: string | null;
}

interface AgentRunRow {
  id: number;
  agentType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  itemsProcessed: number;
  summary: string | null;
}

interface ActivityData {
  events: PipelineEventRow[];
  recentRuns: AgentRunRow[];
}

interface Activity {
  id: string;
  type: "lead_discovered" | "message_sent" | "reply_received" | "call_booked" | "proposal_sent" | "alert";
  title: string;
  description: string;
  timestamp: string;
}

const activityIcons = {
  lead_discovered: Search,
  message_sent: Send,
  reply_received: MessageSquare,
  call_booked: Calendar,
  proposal_sent: FileText,
  alert: AlertCircle,
};

const activityColors = {
  lead_discovered: "text-chart-4",
  message_sent: "text-chart-1",
  reply_received: "text-highlight-green",
  call_booked: "text-chart-5",
  proposal_sent: "text-chart-3",
  alert: "text-highlight-coral",
};

function mapToActivities(data: ActivityData): Activity[] {
  const items: Activity[] = [];

  for (const event of data.events) {
    const stageLabel = PIPELINE_STAGE_LABELS[event.toStage as PipelineStage] ?? event.toStage;
    let type: Activity["type"] = "alert";
    let title = "";
    let description = event.notes ?? "";

    if (event.toStage === "responded") {
      type = "reply_received";
      title = `Reply from ${event.companyName ?? "Unknown"}`;
      description = description || `Moved to ${stageLabel}`;
    } else if (event.toStage === "discovery_booked") {
      type = "call_booked";
      title = `Discovery call booked — ${event.companyName ?? "Unknown"}`;
    } else if (event.toStage === "proposal_sent") {
      type = "proposal_sent";
      title = `Proposal sent to ${event.companyName ?? "Unknown"}`;
    } else if (event.toStage === "contacted") {
      type = "message_sent";
      title = `${event.companyName ?? "Prospect"} contacted`;
      description = description || `Moved to ${stageLabel}`;
    } else {
      title = `${event.companyName ?? "Prospect"} → ${stageLabel}`;
      description = description || (event.fromStage
        ? `From ${PIPELINE_STAGE_LABELS[event.fromStage as PipelineStage] ?? event.fromStage}`
        : `Entered pipeline`);
    }

    items.push({
      id: `event-${event.id}`,
      type,
      title,
      description,
      timestamp: event.createdAt,
    });
  }

  for (const run of data.recentRuns) {
    const agentLabel = AGENT_LABELS[run.agentType as AgentType] ?? run.agentType;
    items.push({
      id: `run-${run.id}`,
      type: run.agentType === "lead_scout" ? "lead_discovered" : "message_sent",
      title: `${agentLabel} ${run.status}`,
      description: run.summary ?? `${run.itemsProcessed} items processed`,
      timestamp: run.startedAt,
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 10);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function RecentActivity() {
  const { data, loading } = useApi<ActivityData>("/api/activity");
  const activities = data ? mapToActivities(data) : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-sans font-semibold">Recent Activity</CardTitle>
          <Badge variant="secondary" className="text-xs font-sans">Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans py-8 text-center">
              No recent activity. Run an agent to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className={`h-4 w-4 ${activityColors[activity.type]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-sans text-foreground">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground font-sans whitespace-nowrap">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
