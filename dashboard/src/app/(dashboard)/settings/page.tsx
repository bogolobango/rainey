"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ToastContainer } from "@/components/ui/toast-container";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  Database,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

// ─── Integration config ─────────────────────────────────────────────────────

interface Integration {
  name: string;
  description: string;
  envVar: string;
  docsUrl: string;
  instructions: string;
}

const INTEGRATIONS: Integration[] = [
  {
    name: "Apollo.io",
    description: "Lead enrichment, email finding, engagement signals, sequence data",
    envVar: "APOLLO_API_KEY",
    docsUrl: "https://docs.apollo.io/docs/create-api-key",
    instructions: "Create a master API key in Apollo: Settings → Integrations → API. Toggle 'Set as master key' for full access to sequences and contacts.",
  },
  {
    name: "OpenAI API",
    description: "GPT-4.1 for lead discovery, proposal generation, and enrichment",
    envVar: "OPENAI_API_KEY",
    docsUrl: "https://platform.openai.com/api-keys",
    instructions: "Create an API key at platform.openai.com → API Keys. Any tier works.",
  },
  {
    name: "Instantly.ai",
    description: "Email sequence management & sending",
    envVar: "INSTANTLY_API_KEY",
    docsUrl: "https://developer.instantly.ai",
    instructions: "Find your API key in Instantly → Settings → Integrations → API.",
  },
  {
    name: "Google Gmail",
    description: "Reply detection, inbox monitoring",
    envVar: "GOOGLE_CLIENT_ID",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    instructions: "Create OAuth 2.0 credentials in Google Cloud Console. Enable the Gmail API. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  },
  {
    name: "Google Calendar",
    description: "Meeting detection, call scheduling",
    envVar: "GOOGLE_CLIENT_ID",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    instructions: "Uses the same Google OAuth credentials as Gmail. Enable the Calendar API in Google Cloud Console.",
  },
  {
    name: "Google Sheets",
    description: "Pipeline data, outreach queues, dashboards",
    envVar: "GOOGLE_CLIENT_ID",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    instructions: "Uses the same Google OAuth credentials. Enable the Sheets API in Google Cloud Console.",
  },
  {
    name: "Google Drive",
    description: "Prospect folders, proposals, reports",
    envVar: "GOOGLE_CLIENT_ID",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    instructions: "Uses the same Google OAuth credentials. Enable the Drive API in Google Cloud Console.",
  },
  {
    name: "Google Maps",
    description: "Business discovery, location verification",
    envVar: "GOOGLE_MAPS_API_KEY",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    instructions: "Create an API key in Google Cloud Console. Enable the Places API and Maps JavaScript API.",
  },
  {
    name: "Telegram",
    description: "Notifications and alerts",
    envVar: "TELEGRAM_BOT_TOKEN",
    docsUrl: "https://core.telegram.org/bots#botfather",
    instructions: "Create a bot via @BotFather on Telegram. Copy the bot token.",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toasts, addToast, dismiss } = useToast();
  const [statuses, setStatuses] = useState<Record<string, { configured: boolean }>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.integrations ?? {});
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  async function testIntegration(name: string) {
    setTesting((prev) => ({ ...prev, [name]: true }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", integration: name }),
      });
      const result = await res.json();
      setTestResults((prev) => ({ ...prev, [name]: result }));
      addToast(
        result.ok ? `${name}: Connected` : `${name}: ${result.message}`,
        result.ok ? "success" : "error",
      );
    } catch {
      addToast(`Failed to test ${name}`, "error");
    } finally {
      setTesting((prev) => ({ ...prev, [name]: false }));
    }
  }

  async function testAllIntegrations() {
    setTestingAll(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_all" }),
      });
      const data = await res.json();
      if (data.results) {
        setTestResults(data.results);
        const passed = Object.values(data.results as Record<string, { ok: boolean }>).filter((r) => r.ok).length;
        const total = Object.keys(data.results).length;
        addToast(`${passed}/${total} integrations connected`, passed > 0 ? "success" : "error");
      }
    } catch {
      addToast("Failed to test integrations", "error");
    } finally {
      setTestingAll(false);
    }
  }

  function openConnectDialog(integration: Integration) {
    setSelectedIntegration(integration);
    setDialogOpen(true);
  }

  async function handleSeedDatabase() {
    addToast("Seeding database...", "info");
    try {
      const res = await fetch("/api/seed");
      if (res.ok) {
        addToast("Database seeded with sample data", "success");
      } else {
        addToast("Failed to seed database", "error");
      }
    } catch {
      addToast("Failed to seed database", "error");
    }
  }

  const connectedCount = Object.values(statuses).filter((s) => s.configured).length;

  return (
    <div className="p-6 space-y-6">
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
                {connectedCount}/{INTEGRATIONS.length} services connected
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="font-sans" onClick={testAllIntegrations} disabled={testingAll}>
              {testingAll ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Test All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {INTEGRATIONS.map((integration) => {
              const isConnected = statuses[integration.name]?.configured ?? false;
              const testResult = testResults[integration.name];
              const isTesting = testing[integration.name];

              return (
                <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      testResult ? (testResult.ok ? "bg-highlight-green" : "bg-highlight-coral") : isConnected ? "bg-highlight-green" : "bg-muted-foreground"
                    }`} />
                    <div>
                      <p className="text-sm font-medium font-sans text-foreground">{integration.name}</p>
                      <p className="text-xs text-muted-foreground font-sans">
                        {testResult?.message ?? integration.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResult && (testResult.ok ? <CheckCircle2 className="h-4 w-4 text-highlight-green" /> : <XCircle className="h-4 w-4 text-highlight-coral" />)}
                    {isConnected && (
                      <Button variant="outline" size="sm" className="font-sans text-xs" onClick={() => testIntegration(integration.name)} disabled={isTesting}>
                        {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
                      </Button>
                    )}
                    <Button variant={isConnected ? "outline" : "default"} size="sm" className="font-sans text-xs" onClick={() => openConnectDialog(integration)}>
                      {isConnected ? "Configure" : "Connect"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agent Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Agent Schedule (ET)</CardTitle>
          <CardDescription className="font-sans">Automated agent execution times</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { agent: "Lead Scout", time: "6:30 AM", frequency: "Daily", desc: "Discovers and scores new leads via Apollo" },
              { agent: "Outreach Composer", time: "7:00 AM", frequency: "Daily", desc: "Generates personalized email drafts" },
              { agent: "Pipeline Intelligence", time: "7:30 AM & 5:00 PM", frequency: "2x Daily", desc: "Morning briefings and evening reports" },
              { agent: "Prospect Research", time: "3:00 PM", frequency: "When calls booked", desc: "Generates call prep docs" },
              { agent: "Follow-Up Sequencing", time: "10:00 AM", frequency: "Daily", desc: "Builds daily follow-up queue" },
              { agent: "Proposal Generator", time: "On demand", frequency: "After demos", desc: "Creates custom proposals" },
            ].map((schedule) => (
              <div key={schedule.agent} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium font-sans text-foreground">{schedule.agent}</p>
                    <p className="text-xs text-muted-foreground font-sans">{schedule.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-sans text-xs">{schedule.time}</Badge>
                  <Badge variant="secondary" className="font-sans text-xs">{schedule.frequency}</Badge>
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
          <CardDescription className="font-sans">SQLite database for pipeline data and agent state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium font-sans text-foreground">bdr.db</p>
                <p className="text-xs text-muted-foreground font-sans">SQLite via sql.js (WASM)</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="font-sans text-xs" onClick={handleSeedDatabase}>
              Seed Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {selectedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle className="font-sans">
                  {statuses[selectedIntegration.name]?.configured ? "Configure" : "Connect"} {selectedIntegration.name}
                </DialogTitle>
                <DialogDescription className="font-sans">{selectedIntegration.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h4 className="text-sm font-semibold font-sans text-foreground">Setup Instructions</h4>
                  <p className="text-sm text-muted-foreground font-sans">{selectedIntegration.instructions}</p>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground font-sans mb-1">Environment variable:</p>
                    <code className="text-sm font-mono text-primary">{selectedIntegration.envVar}</code>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground font-sans mb-2">How to add:</p>
                    <ol className="text-sm text-muted-foreground font-sans space-y-1 list-decimal list-inside">
                      <li>Go to your <strong>Vercel Dashboard</strong></li>
                      <li>Select your project → <strong>Settings</strong></li>
                      <li>Click <strong>Environment Variables</strong></li>
                      <li>Add <code className="text-primary text-xs">{selectedIntegration.envVar}</code> with your key</li>
                      <li><strong>Redeploy</strong> for the change to take effect</li>
                    </ol>
                  </div>
                </div>
                {statuses[selectedIntegration.name]?.configured && (
                  <div className="flex items-center gap-2 text-sm text-highlight-green font-sans">
                    <CheckCircle2 className="h-4 w-4" />
                    Currently connected
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-sans">Close</Button>
                <a href={selectedIntegration.docsUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="font-sans">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open Docs
                  </Button>
                </a>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
