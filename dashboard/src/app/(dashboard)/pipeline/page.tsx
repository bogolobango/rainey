"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  Clock,
  MessageSquare,
  Calendar,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, type PipelineStage, type Lead } from "@/types";
import { useApi } from "@/hooks/use-api";

interface LeadsData {
  leads: Lead[];
  total: number;
}

interface PipelineEvent {
  id: number;
  leadId: number;
  fromStage: string | null;
  toStage: string;
  trigger: string;
  notes: string | null;
  createdAt: string;
}

interface PipelineData {
  stageCounts: Record<string, number>;
  totalLeads: number;
  recentEvents: PipelineEvent[];
}

const stageIcons: Partial<Record<PipelineStage, React.ComponentType<{ className?: string }>>> = {
  cold: Clock,
  contacted: MessageSquare,
  responded: MessageSquare,
  discovery_booked: Calendar,
  demo_completed: FileText,
  proposal_sent: FileText,
  negotiating: GitBranch,
};

const stageColumnColors: Partial<Record<PipelineStage, string>> = {
  cold: "border-t-muted-foreground/30",
  contacted: "border-t-chart-4",
  responded: "border-t-chart-1",
  discovery_booked: "border-t-chart-5",
  demo_completed: "border-t-chart-2",
  proposal_sent: "border-t-chart-3",
  negotiating: "border-t-highlight-purple",
  closed_won: "border-t-highlight-green",
  closed_lost: "border-t-highlight-coral",
};

export default function PipelinePage() {
  const { data: leadsData, loading: leadsLoading } = useApi<LeadsData>("/api/leads?limit=200");
  const { data: pipelineData, loading: pipelineLoading } = useApi<PipelineData>("/api/pipeline");

  const allLeads = leadsData?.leads ?? [];
  const events = pipelineData?.recentEvents ?? [];
  const isLoading = leadsLoading || pipelineLoading;

  // Group leads by pipeline stage
  const byStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = allLeads.filter(l => l.pipelineStage === stage);
    return acc;
  }, {} as Record<PipelineStage, Lead[]>);

  // Check for stale (no activity 5+ days)
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
  const staleIds = new Set(
    allLeads
      .filter(l => l.updatedAt < fiveDaysAgo && !["cold", "closed_won", "closed_lost"].includes(l.pipelineStage))
      .map(l => l.id)
  );
  const staleCount = staleIds.size;

  // Only show stages that have prospects or are key stages
  const activeStages = PIPELINE_STAGES.filter(
    stage => (byStage[stage]?.length > 0) ||
    ["cold", "contacted", "responded", "discovery_booked", "demo_completed", "proposal_sent"].includes(stage)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Pipeline Tracker</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {isLoading ? "Loading pipeline..." : `${allLeads.length} active prospects across ${activeStages.length} stages`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {staleCount > 0 && (
            <Badge variant="destructive" className="font-sans">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {staleCount} stale
            </Badge>
          )}
          <Button variant="outline" size="sm" className="font-sans">
            Morning Briefing
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-4 min-w-max pb-4">
            {activeStages.map((stage) => {
              const stageLeads = byStage[stage] || [];
              return (
                <div key={stage} className="w-72 flex-shrink-0">
                  <Card className={`border-t-4 ${stageColumnColors[stage] || "border-t-muted"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-sans font-semibold flex items-center gap-1.5">
                          {stageIcons[stage] && (() => { const Icon = stageIcons[stage]!; return <Icon className="h-3.5 w-3.5 text-muted-foreground" />; })()}
                          {PIPELINE_STAGE_LABELS[stage]}
                        </CardTitle>
                        <Badge variant="secondary" className="font-sans text-xs">
                          {stageLeads.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {stageLeads.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground font-sans">
                          No prospects
                        </div>
                      ) : (
                        stageLeads.map((lead) => {
                          const isStale = staleIds.has(lead.id);
                          const contactName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
                          return (
                            <div
                              key={lead.id}
                              className={`p-3 rounded-lg border ${isStale ? "border-highlight-coral/30 bg-highlight-coral/5" : "border-border bg-background"} hover:border-primary/20 transition-colors cursor-pointer`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-semibold font-sans text-foreground">
                                    {lead.companyName}
                                  </p>
                                  {contactName && (
                                    <p className="text-xs text-muted-foreground font-sans">
                                      {contactName}
                                    </p>
                                  )}
                                </div>
                                {isStale && (
                                  <AlertTriangle className="h-4 w-4 text-highlight-coral flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                                <span className="text-[10px] text-muted-foreground font-sans">
                                  Score: {lead.score}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-sans">
                                  {lead.locationCount} loc
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Pipeline Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans py-4 text-center">
              No pipeline events recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-start gap-3 text-sm font-sans">
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">
                    {new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    event.trigger === "email_reply" ? "bg-highlight-green" :
                    event.trigger === "calendar_event" ? "bg-chart-5" :
                    "bg-primary"
                  }`} />
                  <p className="text-foreground">
                    {event.fromStage
                      ? `Moved from ${PIPELINE_STAGE_LABELS[event.fromStage as PipelineStage] ?? event.fromStage} → ${PIPELINE_STAGE_LABELS[event.toStage as PipelineStage] ?? event.toStage}`
                      : `Entered ${PIPELINE_STAGE_LABELS[event.toStage as PipelineStage] ?? event.toStage}`}
                    {event.notes ? ` — ${event.notes}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
