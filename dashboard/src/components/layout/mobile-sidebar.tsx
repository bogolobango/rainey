"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  Send,
  GitBranch,
  FileSearch,
  RefreshCw,
  FileText,
  LayoutDashboard,
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Search },
  { name: "Outreach", href: "/outreach", icon: Send },
  { name: "Pipeline", href: "/pipeline", icon: GitBranch },
  { name: "Research", href: "/research", icon: FileSearch },
  { name: "Follow-Ups", href: "/follow-ups", icon: RefreshCw },
  { name: "Proposals", href: "/proposals", icon: FileText },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-around h-16 px-2">
        {navigation.slice(0, 5).map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-sans font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
