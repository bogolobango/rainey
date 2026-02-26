"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileSearch,
  Calendar,
  Building2,
  Star,
  DollarSign,
  MessageCircleQuestion,
  Shield,
  TrendingUp,
  Download,
  RefreshCw,
} from "lucide-react";

export default function ResearchPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Prospect Research</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Deep research briefs and call prep docs for upcoming discovery calls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="font-sans rounded-full">
            <RefreshCw className="h-4 w-4 mr-1" />
            Generate New Brief
          </Button>
        </div>
      </div>

      {/* Upcoming Calls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sans font-semibold">Upcoming Discovery Calls</CardTitle>
            <Badge variant="secondary" className="font-sans text-xs">2 this week</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { company: "Socceroof", contact: "Lesiba Mashishi", date: "Thu Feb 27, 2:00 PM ET", status: "ready" },
              { company: "Arena Sports", contact: "Emily Chen", date: "Fri Feb 28, 10:00 AM ET", status: "generating" },
            ].map((call) => (
              <div key={call.company} className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-sans text-foreground">{call.company}</p>
                    <p className="text-xs text-muted-foreground font-sans">{call.contact} — {call.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={call.status === "ready" ? "success" : "secondary"}
                    className="font-sans text-xs"
                  >
                    {call.status === "ready" ? "Prep Ready" : "Generating..."}
                  </Badge>
                  <Button variant="outline" size="sm" className="font-sans text-xs">
                    View Brief
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sample Call Prep */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSearch className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-sans font-semibold">
                  Discovery Call Prep: Socceroof
                </CardTitle>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  Thu Feb 27, 2:00 PM ET — Lesiba Mashishi, Founder & CEO
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="font-sans text-xs">
              <Download className="h-3 w-3 mr-1" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-6">
              {/* Company Snapshot */}
              <div>
                <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  Company Snapshot
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Locations", value: "9" },
                    { label: "Platform", value: "Bond Sports" },
                    { label: "Google Rating", value: "4.2 (3,100 reviews)" },
                    { label: "Est. Annual Revenue", value: "$8M–$12M" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground font-sans">{item.label}</p>
                      <p className="text-sm font-medium font-sans text-foreground mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pain Signals */}
              <div>
                <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-highlight-coral" />
                  Pain Signals Detected
                </h3>
                <div className="space-y-2">
                  {[
                    "$505K in identified losses from slow response times across 9 locations",
                    "42-hour average lead response time (vs. industry ideal of < 5 min)",
                    "Google reviews mention: 'couldn't reach anyone', 'called 3 times before booking'",
                    "Hiring 4 front desk positions on Indeed — capacity strain signal",
                  ].map((signal, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-highlight-coral/5">
                      <span className="text-highlight-coral font-bold text-sm mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-foreground font-sans">{signal}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Model */}
              <div>
                <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-highlight-green" />
                  Financial Model
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Est. Annual Lost Revenue", value: "$505,000", highlight: true },
                    { label: "Est. Year 1 Recovery", value: "$1,188,000", highlight: true },
                    { label: "Investment (Setup + 12mo)", value: "$59,000" },
                    { label: "Projected ROI", value: "20.1X", highlight: true },
                    { label: "Payback Period", value: "9.3 days", highlight: true },
                    { label: "Monthly Cost", value: "$4,500/mo" },
                  ].map((metric) => (
                    <div key={metric.label} className={`p-3 rounded-lg ${metric.highlight ? "bg-highlight-green/10 border border-highlight-green/20" : "bg-muted/50"}`}>
                      <p className="text-xs text-muted-foreground font-sans">{metric.label}</p>
                      <p className={`text-lg font-display ${metric.highlight ? "text-highlight-green" : "text-foreground"} mt-0.5`}>
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Killer Questions */}
              <div>
                <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                  <MessageCircleQuestion className="h-4 w-4 text-chart-4" />
                  Killer Opening Questions
                </h3>
                <div className="space-y-2">
                  {[
                    '"I noticed several Google reviews mentioning difficulty reaching your team — how is Socceroof currently handling peak-time inquiries across 9 locations?"',
                    '"Your Bond Sports platform handles scheduling well — but what happens to the 40% of inquiries that come in after your staff goes home?"',
                    '"I saw you\'re expanding rapidly — how are you planning to scale inquiry handling without proportionally scaling headcount?"',
                  ].map((q, i) => (
                    <div key={i} className="p-3 rounded-lg bg-chart-4/5 border-l-2 border-chart-4">
                      <p className="text-sm font-sans text-foreground italic">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objection Handles */}
              <div>
                <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-chart-5" />
                  Objection Pre-Handles
                </h3>
                <div className="space-y-2">
                  {[
                    { objection: "We already have Bond Sports", handle: "We don't replace it — we make it intelligent. We plug into Bond Sports via API and automate the inquiry-to-booking flow." },
                    { objection: "It's too expensive", handle: "At $4,500/month for 9 locations, you need to recover only 15 bookings per month to break even. Your estimated lost revenue is $505K/year." },
                    { objection: "How do I know it works?", handle: "We offer a free pilot at one location. Zero risk, data-driven decision after 4 weeks." },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-chart-5/5">
                      <p className="text-xs font-semibold font-sans text-chart-5 mb-1">&ldquo;{item.objection}&rdquo;</p>
                      <p className="text-sm font-sans text-foreground">{item.handle}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
