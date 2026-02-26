"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  ChevronRight,
  Clock,
  MessageSquare,
  Calendar,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, type PipelineStage } from "@/types";

interface PipelineProspect {
  id: number;
  company: string;
  contact: string;
  stage: PipelineStage;
  lastActivity: string;
  lastActivityDate: string;
  daysInStage: number;
  nextAction: string;
  isStale: boolean;
}

const prospects: PipelineProspect[] = [
  { id: 1, company: "Chelsea Piers", contact: "David Tewksbury", stage: "contacted", lastActivity: "Email opened 3x", lastActivityDate: "2 days ago", daysInStage: 5, nextAction: "Send follow-up #2", isStale: true },
  { id: 2, company: "Socceroof", contact: "Lesiba Mashishi", stage: "discovery_booked", lastActivity: "Call booked Thu 2PM", lastActivityDate: "Today", daysInStage: 1, nextAction: "Prepare call brief", isStale: false },
  { id: 3, company: "Arena Sports", contact: "Emily Chen", stage: "demo_completed", lastActivity: "Demo completed", lastActivityDate: "Yesterday", daysInStage: 1, nextAction: "Generate proposal", isStale: false },
  { id: 4, company: "Big Apple Soccer", contact: "Michael Torres", stage: "contacted", lastActivity: "Email sent", lastActivityDate: "6 days ago", daysInStage: 6, nextAction: "Follow-up needed", isStale: true },
  { id: 5, company: "Brooklyn Futsal", contact: "Ana Rodriguez", stage: "responded", lastActivity: "Replied: interested", lastActivityDate: "1 day ago", daysInStage: 1, nextAction: "Book discovery call", isStale: false },
  { id: 6, company: "Asphalt Green", contact: "Sarah Kim", stage: "proposal_sent", lastActivity: "Proposal viewed", lastActivityDate: "3 days ago", daysInStage: 4, nextAction: "Follow up on proposal", isStale: false },
  { id: 7, company: "Hudson Sports", contact: "Jake Williams", stage: "contacted", lastActivity: "No response", lastActivityDate: "7 days ago", daysInStage: 7, nextAction: "Channel switch to LinkedIn", isStale: true },
];

const stageIcons: Partial<Record<PipelineStage, typeof Clock>> = {
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
  const staleCount = prospects.filter(p => p.isStale).length;

  // Group prospects by stage
  const byStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = prospects.filter(p => p.stage === stage);
    return acc;
  }, {} as Record<PipelineStage, PipelineProspect[]>);

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
            {prospects.length} active prospects across {activeStages.length} stages
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
      <ScrollArea className="w-full">
        <div className="flex gap-4 min-w-max pb-4">
          {activeStages.map((stage) => {
            const stageProspects = byStage[stage] || [];
            return (
              <div key={stage} className="w-72 flex-shrink-0">
                <Card className={`border-t-4 ${stageColumnColors[stage] || "border-t-muted"}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-sans font-semibold">
                        {PIPELINE_STAGE_LABELS[stage]}
                      </CardTitle>
                      <Badge variant="secondary" className="font-sans text-xs">
                        {stageProspects.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stageProspects.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground font-sans">
                        No prospects
                      </div>
                    ) : (
                      stageProspects.map((prospect) => (
                        <div
                          key={prospect.id}
                          className={`p-3 rounded-lg border ${prospect.isStale ? "border-highlight-coral/30 bg-highlight-coral/5" : "border-border bg-background"} hover:border-primary/20 transition-colors cursor-pointer`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold font-sans text-foreground">
                                {prospect.company}
                              </p>
                              <p className="text-xs text-muted-foreground font-sans">
                                {prospect.contact}
                              </p>
                            </div>
                            {prospect.isStale && (
                              <AlertTriangle className="h-4 w-4 text-highlight-coral flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-sans">
                            {prospect.lastActivity}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                            <span className="text-[10px] text-muted-foreground font-sans">
                              {prospect.lastActivityDate}
                            </span>
                            <span className="text-[10px] font-medium font-sans text-primary">
                              {prospect.nextAction}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Pipeline Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: "10:30 AM", event: "Brooklyn Futsal replied to cold email — positive interest", type: "reply" as const },
              { time: "9:15 AM", event: "Socceroof moved to Discovery Booked — call Thu 2PM ET", type: "advance" as const },
              { time: "8:45 AM", event: "Arena Sports completed demo — proposal generation triggered", type: "advance" as const },
              { time: "8:00 AM", event: "20 outreach messages sent in morning batch", type: "outreach" as const },
              { time: "7:30 AM", event: "Morning briefing generated — 3 priorities flagged", type: "system" as const },
              { time: "6:30 AM", event: "Lead Scout discovered 12 new sports facility leads", type: "discovery" as const },
            ].map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-sm font-sans">
                <span className="text-xs text-muted-foreground w-16 flex-shrink-0 pt-0.5">{entry.time}</span>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  entry.type === "reply" ? "bg-highlight-green" :
                  entry.type === "advance" ? "bg-primary" :
                  entry.type === "outreach" ? "bg-chart-4" :
                  entry.type === "discovery" ? "bg-chart-5" :
                  "bg-muted-foreground"
                }`} />
                <p className="text-foreground">{entry.event}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
