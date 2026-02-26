"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Send,
  GitBranch,
  FileSearch,
  RefreshCw,
  FileText,
  LayoutDashboard,
  Settings,
  Zap,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Lead Pipeline", href: "/leads", icon: Search },
  { name: "Outreach Queue", href: "/outreach", icon: Send },
  { name: "Pipeline Tracker", href: "/pipeline", icon: GitBranch },
  { name: "Prospect Research", href: "/research", icon: FileSearch },
  { name: "Follow-Up Sequences", href: "/follow-ups", icon: RefreshCw },
  { name: "Proposals", href: "/proposals", icon: FileText },
];

const bottomNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-sidebar-border lg:bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <span className="font-sans font-bold text-sm text-sidebar-foreground">Etienne</span>
          <span className="font-sans text-xs text-muted-foreground ml-1">BDR</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium font-sans transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="px-3 pb-4">
        <Separator className="mb-4" />
        {/* Agent status indicator */}
        <div className="px-3 py-2 rounded-lg bg-sidebar-accent mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-highlight-green animate-pulse" />
            <span className="text-xs font-sans font-medium text-sidebar-foreground">
              Agents Online
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            6/6 agents operational
          </p>
        </div>
        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium font-sans transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
