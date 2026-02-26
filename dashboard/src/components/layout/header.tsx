"use client";

import { Button } from "@/components/ui/button";
import { Bell, Menu, Sun, Moon } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-6">
      {/* Mobile menu trigger */}
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb / Page title area */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-highlight-coral rounded-full" />
        </Button>
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground font-sans">JE</span>
          </div>
          <span className="text-sm font-medium font-sans hidden sm:inline">Jim Etienne</span>
        </div>
      </div>
    </header>
  );
}
