"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Check,
  X,
  Edit2,
  Eye,
  Mail,
  Linkedin,
  Clock,
} from "lucide-react";

interface QueueItem {
  id: number;
  company: string;
  contact: string;
  channel: "email" | "linkedin";
  type: string;
  subject: string;
  preview: string;
  roiLine: string;
  score: number;
  status: "draft" | "approved";
}

const queueItems: QueueItem[] = [
  {
    id: 1,
    company: "Brooklyn Boulders",
    contact: "Lance Pinn",
    channel: "email",
    type: "Cold Email — Template A",
    subject: "How Brooklyn Boulders can capture the 80% of leads you're currently losing",
    preview: "Hi Lance, I work with multi-location indoor sports facilities to solve a problem that's costing the industry millions: slow inquiry response times...",
    roiLine: "5 locations × $500/mo = $2,500/mo investment → estimated 10X ROI",
    score: 8.5,
    status: "draft",
  },
  {
    id: 2,
    company: "Brooklyn Boulders",
    contact: "Lance Pinn",
    channel: "linkedin",
    type: "LinkedIn Connection Request",
    subject: "",
    preview: "Hi Lance, I've been researching multi-location indoor sports facilities in NYC, and Brooklyn Boulders' community-driven approach really stood out. I work with facilities like yours to automate inquiry handling...",
    roiLine: "",
    score: 8.5,
    status: "draft",
  },
  {
    id: 3,
    company: "Gotham Padel",
    contact: "Marco DiNuzzo",
    channel: "email",
    type: "Cold Email — Template A",
    subject: "How Gotham Padel can capture the 80% of leads you're currently losing",
    preview: "Hi Marco, Padel is exploding in the US, and Gotham Padel is leading the charge in NYC. But with 6 locations and growing, I imagine inquiry volume is becoming a real challenge...",
    roiLine: "6 locations × $500/mo = $3,000/mo investment → estimated 10X ROI",
    score: 7.8,
    status: "draft",
  },
  {
    id: 4,
    company: "Skin Laundry",
    contact: "Scott Samson",
    channel: "email",
    type: "Cold Email — Template C (Med Spa)",
    subject: "The $45,000 your Skin Laundry locations lose every month from missed calls",
    preview: "Hi Scott, Individual laser facial treatments at practices like yours cost $150–$500. When a potential patient calls and nobody picks up — or they have to wait 24+ hours...",
    roiLine: "8 locations × $500/mo = $4,000/mo investment → estimated 8X ROI",
    score: 7.5,
    status: "draft",
  },
  {
    id: 5,
    company: "Chelsea Piers",
    contact: "David Tewksbury",
    channel: "email",
    type: "Follow-Up #2 — Case Study Drop",
    subject: "How Arena Sports recovered $500K+ in Year 1",
    preview: "Hi David, I know you're busy, so I'll lead with results: Arena Sports (5 locations) implemented our AI booking automation and saw: 60% of routine inquiries automated...",
    roiLine: "3 locations × $500/mo = $1,500/mo investment → estimated 12X ROI",
    score: 9.1,
    status: "approved",
  },
];

export default function OutreachPage() {
  const draftCount = queueItems.filter((i) => i.status === "draft").length;
  const approvedCount = queueItems.filter((i) => i.status === "approved").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Outreach Queue</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {draftCount} drafts pending review, {approvedCount} approved and ready to send
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-sans">
            <Check className="h-4 w-4 mr-1" />
            Approve All
          </Button>
          <Button size="sm" className="font-sans rounded-full">
            <Send className="h-4 w-4 mr-1" />
            Send Approved ({approvedCount})
          </Button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Emails</p>
              <p className="text-lg font-display">{queueItems.filter(i => i.channel === "email").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-4/10">
              <Linkedin className="h-4 w-4 text-chart-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">LinkedIn</p>
              <p className="text-lg font-display">{queueItems.filter(i => i.channel === "linkedin").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-highlight-green/10">
              <Check className="h-4 w-4 text-highlight-green" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Approved</p>
              <p className="text-lg font-display">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-5/10">
              <Clock className="h-4 w-4 text-chart-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Pending</p>
              <p className="text-lg font-display">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Message Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-border hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary font-sans">
                          {item.company.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-sans font-semibold text-sm text-foreground">
                            {item.company}
                          </h3>
                          <span className="text-xs text-muted-foreground font-sans">→ {item.contact}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs font-sans">
                            {item.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <Linkedin className="h-3 w-3 mr-1" />}
                            {item.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.status === "approved" ? "success" : "secondary"}
                        className="font-sans text-xs"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>

                  {item.subject && (
                    <p className="text-sm font-medium font-sans text-foreground mb-1">
                      {item.subject}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground font-sans line-clamp-2">
                    {item.preview}
                  </p>
                  {item.roiLine && (
                    <p className="text-xs font-medium font-sans text-primary mt-2">
                      {item.roiLine}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-sans">
                      Lead score: {item.score}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-xs font-sans h-7">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs font-sans h-7">
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {item.status === "draft" ? (
                        <Button variant="ghost" size="sm" className="text-xs font-sans h-7 text-highlight-green">
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs font-sans h-7 text-highlight-coral">
                          <X className="h-3 w-3 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
