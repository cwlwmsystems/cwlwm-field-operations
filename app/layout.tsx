import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Cwlwm Field Operations",
  description: "Configurable field sales and territory operations platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
