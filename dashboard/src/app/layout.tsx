import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Etienne BDR | AI-Powered Sales Development",
  description:
    "Orchestration dashboard for Etienne Agency's 6-agent BDR system. Lead discovery, outreach, pipeline tracking, and deal acceleration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <TooltipProvider delayDuration={0}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
