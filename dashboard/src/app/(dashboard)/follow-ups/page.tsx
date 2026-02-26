"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Mail,
  Linkedin,
  Clock,
  AlertTriangle,
  Pause,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface SequenceRow {
  id: number;
  leadId: number;
  currentDay: number;
  status: string;
  nextTouchAt: string | null;
  channelHistory: string | null;
  pausedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  companyName: string | null;
  contactFirst: string | null;
  contactLast: string | null;
}

interface FollowUpsData {
  sequences: SequenceRow[];
}

const TOTAL_DAYS = 30;

const touchpointSchedule = [
  { day: 0, label: "Initial Outreach", channels: ["Email", "LinkedIn"] },
  { day: 3, label: "Follow-Up #1 — Value Add", channels: ["Email"] },
  { day: 7, label: "Follow-Up #2 — Case Study", channels: ["Email"] },
  { day: 14, label: "Follow-Up #3 — Breakup", channels: ["Email"] },
  { day: 21, label: "Channel Switch", channels: ["LinkedIn InMail"] },
  { day: 30, label: "Final Touch — Report Offer", channels: ["Email"] },
];

export default function FollowUpsPage() {
  const { data, loading } = useApi<FollowUpsData>("/api/follow-ups");
  const sequences = data?.sequences ?? [];

  const activeCount = sequences.filter(s => s.status === "active").length;
  const dueToday = sequences.filter(s => {
    if (!s.nextTouchAt) return false;
    const touchDate = new Date(s.nextTouchAt).toDateString();
    const today = new Date().toDateString();
    return touchDate === today;
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Follow-Up Sequences</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {loading ? "Loading sequences..." : `${activeCount} active sequences, ${dueToday} touches due today`}
          </p>
        </div>
        <Button size="sm" className="font-sans rounded-full">
          <RefreshCw className="h-4 w-4 mr-1" />
          Queue Today&apos;s Follow-Ups
        </Button>
      </div>

      {/* Sequence Timeline Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-sans font-semibold">Touchpoint Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {touchpointSchedule.map((tp, i) => (
              <div key={tp.day} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary font-sans">{tp.day}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-sans mt-1 text-center whitespace-nowrap max-w-20">
                    {tp.label}
                  </p>
                </div>
                {i < touchpointSchedule.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Sequences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Active Sequences</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sequences.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-8 text-center">
                No follow-up sequences active. The Follow-Up Sequencing agent will create them automatically.
              </p>
            ) : (
              <div className="space-y-3">
                {sequences.map((seq) => {
                  const contactName = [seq.contactFirst, seq.contactLast].filter(Boolean).join(" ") || "Unknown";
                  const channelHistory: string[] = seq.channelHistory ? JSON.parse(seq.channelHistory) : [];
                  const lastChannel = channelHistory.length > 0 ? channelHistory[channelHistory.length - 1] : "email";
                  const nextTouchLabel = seq.nextTouchAt
                    ? new Date(seq.nextTouchAt).toLocaleDateString([], { month: "short", day: "numeric" })
                    : seq.status === "paused" ? "Paused" : "—";

                  return (
                    <div
                      key={seq.id}
                      className={`p-4 rounded-xl border ${
                        seq.status === "paused" ? "border-chart-5/30 bg-chart-5/5" :
                        seq.status === "completed" ? "border-muted bg-muted/30" :
                        "border-border"
                      } transition-all`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary font-sans">
                              {(seq.companyName ?? "?").charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold font-sans text-foreground">{seq.companyName}</p>
                            <p className="text-xs text-muted-foreground font-sans">{contactName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              seq.status === "active" ? "default" :
                              seq.status === "paused" ? "warning" :
                              seq.status === "completed" ? "secondary" :
                              "success"
                            }
                            className="font-sans text-xs"
                          >
                            {seq.status === "paused" && <Pause className="h-3 w-3 mr-1" />}
                            {seq.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground font-sans">
                            Day {seq.currentDay} / {TOTAL_DAYS}
                          </span>
                          <span className="text-xs text-muted-foreground font-sans">
                            {channelHistory.length} touches sent
                          </span>
                        </div>
                        <Progress value={(seq.currentDay / TOTAL_DAYS) * 100} />
                      </div>

                      {/* Details */}
                      <div className="flex items-center justify-between text-xs font-sans">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Next: {nextTouchLabel}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {lastChannel === "email" ? <Mail className="h-3 w-3" /> : <Linkedin className="h-3 w-3" />}
                            {lastChannel}
                          </span>
                        </div>
                      </div>

                      {seq.pausedUntil && (
                        <p className="text-xs text-chart-5 font-sans mt-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Paused until {new Date(seq.pausedUntil).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
