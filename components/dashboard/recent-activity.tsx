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
} from "lucide-react";

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

// Sample data — will be replaced by real API data
const sampleActivities: Activity[] = [
  {
    id: "1",
    type: "lead_discovered",
    title: "12 new leads scored",
    description: "Lead Scout found 12 sports facilities in NYC metro",
    timestamp: "2 min ago",
  },
  {
    id: "2",
    type: "message_sent",
    title: "Outreach batch ready",
    description: "20 personalized emails drafted for review",
    timestamp: "15 min ago",
  },
  {
    id: "3",
    type: "reply_received",
    title: "Reply from Chelsea Piers",
    description: "Positive interest — requesting more info",
    timestamp: "1 hr ago",
  },
  {
    id: "4",
    type: "call_booked",
    title: "Discovery call booked",
    description: "Arena Sports — Thursday 2:00 PM ET",
    timestamp: "2 hrs ago",
  },
  {
    id: "5",
    type: "alert",
    title: "3 prospects stale",
    description: "No activity for 5+ days — follow-up recommended",
    timestamp: "3 hrs ago",
  },
];

export function RecentActivity() {
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
          <div className="space-y-4">
            {sampleActivities.map((activity) => {
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
                    {activity.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
