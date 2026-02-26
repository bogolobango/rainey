"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Database,
  RefreshCw,
} from "lucide-react";

interface Integration {
  name: string;
  status: "connected" | "disconnected" | "error";
  description: string;
  lastSync?: string;
}

const integrations: Integration[] = [
  { name: "OpenAI API", status: "connected", description: "GPT-4.1 for lead discovery & enrichment", lastSync: "Active" },
  { name: "Apollo.io", status: "disconnected", description: "Lead enrichment, email finding, engagement signals" },
  { name: "Instantly.ai", status: "disconnected", description: "Email sequence management & sending" },
  { name: "Google Gmail", status: "disconnected", description: "Reply detection, inbox monitoring" },
  { name: "Google Calendar", status: "disconnected", description: "Meeting detection, call scheduling" },
  { name: "Google Sheets", status: "disconnected", description: "Pipeline data, outreach queues, dashboards" },
  { name: "Google Drive", status: "disconnected", description: "Prospect folders, proposals, reports" },
  { name: "Google Maps", status: "disconnected", description: "Business discovery, location verification" },
  { name: "Telegram", status: "connected", description: "Legacy notifications (from Rainey v2)", lastSync: "Active" },
];

export default function SettingsPage() {
  const connected = integrations.filter(i => i.status === "connected").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Configure integrations, agent schedules, and system preferences
        </p>
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-sans font-semibold">Integrations</CardTitle>
              <CardDescription className="font-sans">
                {connected}/{integrations.length} services connected
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="font-sans">
              <RefreshCw className="h-4 w-4 mr-1" />
              Test All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    integration.status === "connected" ? "bg-highlight-green" :
                    integration.status === "error" ? "bg-highlight-coral" :
                    "bg-muted-foreground"
                  }`} />
                  <div>
                    <p className="text-sm font-medium font-sans text-foreground">{integration.name}</p>
                    <p className="text-xs text-muted-foreground font-sans">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {integration.lastSync && (
                    <span className="text-xs text-muted-foreground font-sans">{integration.lastSync}</span>
                  )}
                  <Button
                    variant={integration.status === "connected" ? "outline" : "default"}
                    size="sm"
                    className="font-sans text-xs"
                  >
                    {integration.status === "connected" ? "Configure" : "Connect"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Agent Schedule (ET)</CardTitle>
          <CardDescription className="font-sans">
            Configure when each agent runs automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { agent: "Lead Scout", time: "6:30 AM", frequency: "Daily" },
              { agent: "Outreach Composer", time: "7:00 AM", frequency: "Daily" },
              { agent: "Pipeline Intelligence", time: "7:30 AM & 5:00 PM", frequency: "2x Daily" },
              { agent: "Prospect Research", time: "3:00 PM", frequency: "When calls booked" },
              { agent: "Follow-Up Sequencing", time: "10:00 AM", frequency: "Daily" },
              { agent: "Proposal Generator", time: "On demand", frequency: "After demos" },
            ].map((schedule) => (
              <div key={schedule.agent} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium font-sans text-foreground">{schedule.agent}</p>
                    <p className="text-xs text-muted-foreground font-sans">{schedule.frequency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-sans text-xs">{schedule.time}</Badge>
                  <Button variant="ghost" size="sm" className="font-sans text-xs">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Database</CardTitle>
          <CardDescription className="font-sans">
            SQLite database for pipeline data and agent state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium font-sans text-foreground">bdr.db</p>
                <p className="text-xs text-muted-foreground font-sans">SQLite with WAL mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-sans text-xs">
                Export
              </Button>
              <Button variant="outline" size="sm" className="font-sans text-xs">
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
