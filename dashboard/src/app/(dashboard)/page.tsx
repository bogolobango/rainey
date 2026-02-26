"use client";

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
} from "lucide-react";
import { type AgentType, type PipelineStage } from "@/types";

// Sample data — will be replaced by API calls
const stats = {
  totalLeads: 247,
  newLeadsToday: 18,
  activeProspects: 42,
  messagesQueuedToday: 20,
  messagesSentToday: 15,
  responsesToday: 3,
  discoveryCallsThisWeek: 4,
  proposalsSentThisWeek: 2,
  responseRate: 6.2,
  avgLeadScore: 7.4,
  staleProspects: 5,
};

const pipelineData: Record<PipelineStage, number> = {
  cold: 142,
  contacted: 58,
  responded: 23,
  discovery_booked: 12,
  demo_completed: 6,
  proposal_sent: 4,
  negotiating: 2,
  closed_won: 0,
  closed_lost: 8,
};

const agentStatuses: { type: AgentType; status: "idle" | "running" | "completed" | "failed"; lastRun: string; items: number; nextRun: string }[] = [
  { type: "lead_scout", status: "completed", lastRun: "6:30 AM", items: 50, nextRun: "Tomorrow 6:30 AM" },
  { type: "outreach_composer", status: "completed", lastRun: "7:00 AM", items: 20, nextRun: "Tomorrow 7:00 AM" },
  { type: "pipeline_intelligence", status: "idle", lastRun: "7:30 AM", items: 255, nextRun: "5:00 PM" },
  { type: "prospect_research", status: "running", lastRun: "3:00 PM", items: 2, nextRun: "On demand" },
  { type: "follow_up_sequencing", status: "completed", lastRun: "10:00 AM", items: 8, nextRun: "Tomorrow 10:00 AM" },
  { type: "proposal_generator", status: "idle", lastRun: "Yesterday", items: 1, nextRun: "On demand" },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Good morning, Jim</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Here&apos;s your BDR command center for today.
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

      {/* Today's Priority Alert */}
      <Card className="border-highlight-coral/30 bg-highlight-coral/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-highlight-coral flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium font-sans text-foreground">
                {stats.staleProspects} prospects need attention — no activity for 5+ days
              </p>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                Chelsea Piers, Big Apple Soccer, Socceroof NYC, Hudson Sports, Brooklyn Futsal
              </p>
            </div>
            <Button variant="outline" size="sm" className="font-sans text-xs">
              View all
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Prospects"
          value={stats.activeProspects}
          subtitle={`${stats.newLeadsToday} new today`}
          icon={Users}
          variant="purple"
          trend={{ value: 12, label: "vs last week" }}
        />
        <StatCard
          title="Messages Queued"
          value={stats.messagesQueuedToday}
          subtitle={`${stats.messagesSentToday} sent today`}
          icon={Send}
          variant="coral"
        />
        <StatCard
          title="Responses"
          value={stats.responsesToday}
          subtitle={`${stats.responseRate}% response rate`}
          icon={MessageSquare}
          variant="green"
          trend={{ value: 2.1, label: "vs last week" }}
        />
        <StatCard
          title="Discovery Calls"
          value={stats.discoveryCallsThisWeek}
          subtitle="This week"
          icon={Calendar}
          variant="purple"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel — takes 2 cols */}
        <div className="lg:col-span-2">
          <PipelineFunnel data={pipelineData} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity />
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
                {stats.messagesQueuedToday} drafts
              </Badge>
              <Button variant="outline" size="sm" className="font-sans text-xs">
                Review All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { company: "Brooklyn Boulders", type: "Cold Email", score: 8.5, locations: 5 },
              { company: "Asphalt Green", type: "LinkedIn Request", score: 8.2, locations: 4 },
              { company: "Chelsea Piers", type: "Follow-Up #2", score: 9.1, locations: 3 },
              { company: "Gotham Padel", type: "Cold Email", score: 7.8, locations: 6 },
              { company: "Skin Laundry NYC", type: "Cold Email", score: 7.5, locations: 8 },
            ].map((item) => (
              <div key={item.company} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary font-sans">
                      {item.company.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium font-sans text-foreground">{item.company}</p>
                    <p className="text-xs text-muted-foreground font-sans">{item.locations} locations</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-sans text-xs">
                    {item.type}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium font-sans text-primary">{item.score}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs font-sans h-7 text-highlight-green">
                      Approve
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs font-sans h-7">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Status Grid */}
      <div>
        <h2 className="text-lg font-sans font-semibold text-foreground mb-4">Agent Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentStatuses.map((agent) => (
            <AgentStatusCard
              key={agent.type}
              agentType={agent.type}
              status={agent.status}
              lastRun={agent.lastRun}
              itemsProcessed={agent.items}
              nextRun={agent.nextRun}
            />
          ))}
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
              { label: "Outreach Sent", current: 65, target: 100, icon: Send },
              { label: "Response Rate", current: 6.2, target: 5, icon: MessageSquare, suffix: "%" },
              { label: "Calls Booked", current: 4, target: 12, icon: Calendar },
              { label: "Proposals Sent", current: 2, target: 6, icon: TrendingUp },
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
