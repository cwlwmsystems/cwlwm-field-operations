import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SupabaseConfigProvider } from "@/lib/config/SupabaseConfigProvider";
import { SupabaseTerritoryOpsProvider } from "@/lib/operations/SupabaseTerritoryOpsProvider";
import { SupabaseSalesProvider } from "@/lib/sales/SupabaseSalesProvider";
import { SupabaseSchedulingProvider } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { SupabaseLifecycleProvider } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import { SupabaseFinanceProvider } from "@/lib/finance/SupabaseFinanceProvider";
import "./globals.css";

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Cwlwm Field Operations",
  description: "Configurable field sales and territory operations platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><AuthProvider><SupabaseConfigProvider><SupabaseTerritoryOpsProvider><SupabaseSalesProvider><SupabaseSchedulingProvider><SupabaseLifecycleProvider><SupabaseFinanceProvider>{children}</SupabaseFinanceProvider></SupabaseLifecycleProvider></SupabaseSchedulingProvider></SupabaseSalesProvider></SupabaseTerritoryOpsProvider></SupabaseConfigProvider></AuthProvider></body>
    </html>
  );
}
