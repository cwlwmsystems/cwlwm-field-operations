import type { ReactNode } from "react";
import { PlatformStoreProvider } from "@/lib/store/platformStore";
import "./globals.css";

export const metadata = {
  title: "Cwlwm Field Operations",
  description: "Configurable field sales and territory operations platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><PlatformStoreProvider>{children}</PlatformStoreProvider></body>
    </html>
  );
}
