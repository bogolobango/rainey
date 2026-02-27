"use client";

import { useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AgentStatusCard } from "@/components/dashboard/agent-status-card";
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  MessageSquare,
  Calendar,
  Users,
  TrendingUp,
  Target,
  AlertTriangle,
  Play,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { type AgentType, type PipelineStage, AGENT_TYPES } from "@/types";
import { DAILY_SCHEDULE } from "@/lib/agents/schedule";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WeeklyPacing {
  discoveryCallsBooked: number;
  target: number;
  onTrack: boolean;
  pace: string;
  daysLeftInWeek: number;
  callsNeeded: number;
}

interface StatsData {
  totalLeads: number;
  newLeadsToday: number;
  activeProspects: number;
  messagesQueuedToday: number;
  messagesSentToday: number;
  responsesToday: number;
  discoveryCallsThisWeek: number;
  proposalsSentThisWeek: number;
  pipelineByStage: Record<PipelineStage, number>;
  responseRate: number;
  avgLeadScore: number;
  staleProspects: number;
  weeklyPacing?: WeeklyPacing;
}

interface AgentRunRow {
  id: number;
  agentType: AgentType;
  status: string;
  startedAt: string;
  completedAt: string | null;
  itemsProcessed: number;
  summary: string | null;
}

interface AgentsData {
  agents: { agentType: AgentType; latestRun: AgentRunRow | null }[];
}

interface OutreachRow {
  id: number;
  companyName: string | null;
  channel: string;
  templateId: string | null;
  score: number | null;
  status: string;
}

interface OutreachData {
  messages: OutreachRow[];
  draftCount: number;
  approvedCount: number;
}

interface ActionItem {
  priority: number;
  leadId: number;
  companyName: string;
  stage: string;
  action: string;
  reason: string;
  urgency: "critical" | "high" | "medium" | "low";
}

interface TemplatePerf {
  templateId: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

interface AnalyticsData {
  actions?: ActionItem[];
  templates?: TemplatePerf[];
  pacing?: WeeklyPacing;
}

const DEFAULT_PIPELINE: Record<PipelineStage, number> = {
  cold: 0, contacted: 0, responded: 0, discovery_booked: 0,
  demo_completed: 0, proposal_sent: 0, negotiating: 0,
  closed_won: 0, closed_lost: 0,
};

function getScheduleForAgent(type: AgentType): string {
  const entry = DAILY_SCHEDULE.find(s => s.agentType === type);
  return entry?.timeET ?? "On demand";
}

export default function DashboardPage() {
  const { data: stats, loading: statsLoading } = useApi<StatsData>("/api/stats");
  const { data: agentsData, loading: agentsLoading } = useApi<AgentsData>("/api/agents");
  const { data: outreach, refetch: refetchOutreach } = useApi<OutreachData>("/api/outreach");
  const { data: analytics } = useApi<AnalyticsData>("/api/analytics?view=actions,templates");
  const [approving, setApproving] = useState<Record<number, boolean>>({});

  const s = stats ?? {
    totalLeads: 0, newLeadsToday: 0, activeProspects: 0,
    messagesQueuedToday: 0, messagesSentToday: 0, responsesToday: 0,
    discoveryCallsThisWeek: 0, proposalsSentThisWeek: 0, responseRate: 0,
    avgLeadScore: 0, staleProspects: 0,
    pipelineByStage: DEFAULT_PIPELINE,
  };

  const pacing = stats?.weeklyPacing;
  const isLoading = statsLoading || agentsLoading;

  // ── Outreach approval handler ──
  async function handleApprove(messageId: number) {
    setApproving(prev => ({ ...prev, [messageId]: true }));
    try {
      await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", messageIds: [messageId] }),
      });
      refetchOutreach();
    } finally {
      setApproving(prev => ({ ...prev, [messageId]: false }));
    }
  }

  async function handleApproveAll() {
    await fetch("/api/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve_all" }),
    });
    refetchOutreach();
  }

  async function handleReject(messageId: number) {
    await fetch("/api/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", messageIds: [messageId] }),
    });
    refetchOutreach();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Good morning, Jim</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {isLoading ? "Loading your BDR command center..." : "Here\u2019s your BDR command center for today."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-sans">
            <Clock className="h-4 w-4 mr-1" />
            Morning Briefing
          </Button>
          <Button size="sm" className="font-sans rounded-full">
            <Play className="h-4 w-4 mr-1" />
            Run All Agents
          </Button>
        </div>
      </div>

      {/* Weekly Call Target Pacing */}
      {pacing && (
        <Card className={pacing.onTrack ? "border-highlight-green/30 bg-highlight-green/5" : "border-highlight-coral/30 bg-highlight-coral/5"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className={`h-5 w-5 flex-shrink-0 ${pacing.onTrack ? "text-highlight-green" : "text-highlight-coral"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium font-sans text-foreground">
                  Weekly Target: {pacing.discoveryCallsBooked}/{pacing.target} discovery calls booked
                </p>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">{pacing.pace}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pacing.onTrack ? "bg-highlight-green" : "bg-highlight-coral"}`}
                    style={{ width: `${Math.min((pacing.discoveryCallsBooked / pacing.target) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium font-sans text-muted-foreground">
                  {pacing.daysLeftInWeek}d left
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Priority Alert */}
      {s.staleProspects > 0 && (
        <Card className="border-highlight-coral/30 bg-highlight-coral/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-highlight-coral flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium font-sans text-foreground">
                  {s.staleProspects} prospect{s.staleProspects !== 1 ? "s" : ""} need attention — no activity for 5+ days
                </p>
              </div>
              <Button variant="outline" size="sm" className="font-sans text-xs">
                View all
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Prospects"
          value={s.activeProspects}
          subtitle={`${s.newLeadsToday} new today`}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Messages Queued"
          value={s.messagesQueuedToday}
          subtitle={`${s.messagesSentToday} sent today`}
          icon={Send}
          variant="coral"
        />
        <StatCard
          title="Responses"
          value={s.responsesToday}
          subtitle={`${s.responseRate}% response rate`}
          icon={MessageSquare}
          variant="green"
        />
        <StatCard
          title="Discovery Calls"
          value={s.discoveryCallsThisWeek}
          subtitle="This week"
          icon={Calendar}
          variant="purple"
        />
      </div>

      {/* Main Grid: Pipeline + Action List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PipelineFunnel data={s.pipelineByStage as Record<PipelineStage, number>} />

          {/* Daily Action List */}
          {analytics?.actions && analytics.actions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-sans font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-highlight-coral" />
                    Today&apos;s Actions
                  </CardTitle>
                  <Badge variant="secondary" className="font-sans">
                    {analytics.actions.length} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.actions.slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        item.urgency === "critical" ? "bg-red-500" :
                        item.urgency === "high" ? "bg-highlight-coral" :
                        item.urgency === "medium" ? "bg-yellow-500" : "bg-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium font-sans text-foreground truncate">
                            {item.companyName}
                          </p>
                          <Badge variant="outline" className="text-[10px] font-sans flex-shrink-0">
                            {item.stage}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground font-sans mt-0.5">{item.action}</p>
                        <p className="text-xs text-muted-foreground font-sans">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <RecentActivity />

          {/* Template Performance */}
          {analytics?.templates && analytics.templates.some(t => t.sent > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-sans font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-highlight-purple" />
                  Template Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.templates.filter(t => t.sent > 0).map((t) => (
                    <div key={t.templateId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium font-sans text-foreground">
                          Template {t.templateId}
                        </span>
                        <span className="text-xs text-muted-foreground font-sans">
                          {t.sent} sent
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-sans">
                        <span className="text-muted-foreground">
                          Open <span className="text-foreground font-medium">{t.openRate}%</span>
                        </span>
                        <span className="text-muted-foreground">
                          Click <span className="text-foreground font-medium">{t.clickRate}%</span>
                        </span>
                        <span className="text-muted-foreground">
                          Reply <span className="text-highlight-green font-medium">{t.replyRate}%</span>
                        </span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-highlight-purple rounded-full"
                          style={{ width: `${Math.min(t.openRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Outreach Queue Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sans font-semibold">
              Outreach Queue — Ready for Review
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-sans">
                {outreach?.draftCount ?? 0} drafts
              </Badge>
              {(outreach?.draftCount ?? 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-sans text-xs text-highlight-green"
                  onClick={handleApproveAll}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {outreach && outreach.messages.length > 0 ? (
            <div className="space-y-3">
              {outreach.messages.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary font-sans">
                        {(item.companyName ?? "?").charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium font-sans text-foreground">{item.companyName}</p>
                      <p className="text-xs text-muted-foreground font-sans">{item.channel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-sans text-xs">
                      {item.templateId ?? item.channel}
                    </Badge>
                    {item.status === "approved" && (
                      <Badge className="font-sans text-xs bg-highlight-green/10 text-highlight-green border-highlight-green/30">
                        Approved
                      </Badge>
                    )}
                    {item.score != null && (
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium font-sans text-primary">{item.score}</span>
                      </div>
                    )}
                    {item.status === "draft" && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-sans h-7 text-highlight-green"
                          onClick={() => handleApprove(item.id)}
                          disabled={approving[item.id]}
                        >
                          {approving[item.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <><CheckCircle2 className="h-3 w-3 mr-1" />Approve</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-sans h-7 text-highlight-coral"
                          onClick={() => handleReject(item.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-sans py-8 text-center">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "No messages queued yet. Run the Outreach Composer to generate drafts."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Agent Status Grid */}
      <div>
        <h2 className="text-lg font-sans font-semibold text-foreground mb-4">Agent Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENT_TYPES.map((type) => {
            const run = agentsData?.agents.find(a => a.agentType === type)?.latestRun;
            return (
              <AgentStatusCard
                key={type}
                agentType={type}
                status={run ? (run.status as "idle" | "running" | "completed" | "failed") : "idle"}
                lastRun={run?.startedAt ? new Date(run.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : undefined}
                itemsProcessed={run?.itemsProcessed}
                nextRun={getScheduleForAgent(type)}
              />
            );
          })}
        </div>
      </div>

      {/* Weekly Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Weekly Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: "Outreach Sent", current: s.messagesSentToday, target: 100, icon: Send },
              { label: "Response Rate", current: s.responseRate, target: 5, icon: MessageSquare, suffix: "%" },
              { label: "Calls Booked", current: pacing?.discoveryCallsBooked ?? s.discoveryCallsThisWeek, target: pacing?.target ?? 3, icon: Calendar },
              { label: "Proposals Sent", current: s.proposalsSentThisWeek, target: 6, icon: TrendingUp },
            ].map((metric) => {
              const pct = metric.suffix === "%"
                ? (metric.current >= metric.target ? 100 : (metric.current / metric.target) * 100)
                : Math.min((metric.current / metric.target) * 100, 100);
              const isOnTrack = pct >= 50;
              return (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-sans">{metric.label}</span>
                  </div>
                  <p className="text-2xl font-display text-foreground">
                    {metric.current}{metric.suffix || ""}
                    <span className="text-sm text-muted-foreground font-sans ml-1">
                      / {metric.target}{metric.suffix || ""}
                    </span>
                  </p>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOnTrack ? "bg-highlight-green" : "bg-highlight-coral"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
