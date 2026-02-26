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
} from "lucide-react";

interface FollowUpSequence {
  id: number;
  company: string;
  contact: string;
  currentDay: number;
  totalDays: number;
  status: "active" | "paused" | "completed" | "exited";
  nextTouch: string;
  nextChannel: "email" | "linkedin";
  touchesSent: number;
  lastSignal: string | null;
  pauseReason?: string;
}

const sequences: FollowUpSequence[] = [
  { id: 1, company: "Brooklyn Boulders", contact: "Lance Pinn", currentDay: 3, totalDays: 30, status: "active", nextTouch: "Tomorrow", nextChannel: "email", touchesSent: 2, lastSignal: "Email opened 2x" },
  { id: 2, company: "Gotham Padel", contact: "Marco DiNuzzo", currentDay: 0, totalDays: 30, status: "active", nextTouch: "Day 3 — Feb 28", nextChannel: "email", touchesSent: 1, lastSignal: null },
  { id: 3, company: "Skin Laundry", contact: "Scott Samson", currentDay: 7, totalDays: 30, status: "active", nextTouch: "Today", nextChannel: "email", touchesSent: 3, lastSignal: "Link clicked — ROI calculator" },
  { id: 4, company: "Asphalt Green", contact: "Sarah Kim", currentDay: 14, totalDays: 30, status: "active", nextTouch: "Day 21 — Mar 5", nextChannel: "linkedin", touchesSent: 4, lastSignal: "No engagement" },
  { id: 5, company: "Hudson Sports", contact: "Jake Williams", currentDay: 21, totalDays: 30, status: "paused", nextTouch: "Paused", nextChannel: "email", touchesSent: 4, lastSignal: "Out of office until Mar 3", pauseReason: "OOO detected — resumes Mar 3" },
  { id: 6, company: "Big Apple Soccer", contact: "Michael Torres", currentDay: 30, totalDays: 30, status: "completed", nextTouch: "Moved to Nurture", nextChannel: "email", touchesSent: 6, lastSignal: "No response — sequence complete" },
];

const touchpointSchedule = [
  { day: 0, label: "Initial Outreach", channels: ["Email", "LinkedIn"] },
  { day: 3, label: "Follow-Up #1 — Value Add", channels: ["Email"] },
  { day: 7, label: "Follow-Up #2 — Case Study", channels: ["Email"] },
  { day: 14, label: "Follow-Up #3 — Breakup", channels: ["Email"] },
  { day: 21, label: "Channel Switch", channels: ["LinkedIn InMail"] },
  { day: 30, label: "Final Touch — Report Offer", channels: ["Email"] },
];

export default function FollowUpsPage() {
  const activeCount = sequences.filter(s => s.status === "active").length;
  const dueToday = sequences.filter(s => s.nextTouch === "Today" || s.nextTouch === "Tomorrow").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Follow-Up Sequences</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {activeCount} active sequences, {dueToday} touches due soon
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
            <div className="space-y-3">
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  className={`p-4 rounded-xl border ${
                    seq.status === "paused" ? "border-chart-5/30 bg-chart-5/5" :
                    seq.status === "completed" ? "border-muted bg-muted/30" :
                    seq.lastSignal?.includes("clicked") ? "border-highlight-green/30 bg-highlight-green/5" :
                    "border-border"
                  } transition-all`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary font-sans">
                          {seq.company.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold font-sans text-foreground">{seq.company}</p>
                        <p className="text-xs text-muted-foreground font-sans">{seq.contact}</p>
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
                        Day {seq.currentDay} / {seq.totalDays}
                      </span>
                      <span className="text-xs text-muted-foreground font-sans">
                        {seq.touchesSent} touches sent
                      </span>
                    </div>
                    <Progress value={(seq.currentDay / seq.totalDays) * 100} />
                  </div>

                  {/* Details */}
                  <div className="flex items-center justify-between text-xs font-sans">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Next: {seq.nextTouch}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        {seq.nextChannel === "email" ? <Mail className="h-3 w-3" /> : <Linkedin className="h-3 w-3" />}
                        {seq.nextChannel}
                      </span>
                    </div>
                    {seq.lastSignal && (
                      <span className={`${
                        seq.lastSignal.includes("clicked") ? "text-highlight-green" :
                        seq.lastSignal.includes("opened") ? "text-chart-4" :
                        seq.lastSignal.includes("Out of office") ? "text-chart-5" :
                        "text-muted-foreground"
                      }`}>
                        {seq.lastSignal}
                      </span>
                    )}
                  </div>

                  {seq.pauseReason && (
                    <p className="text-xs text-chart-5 font-sans mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {seq.pauseReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
