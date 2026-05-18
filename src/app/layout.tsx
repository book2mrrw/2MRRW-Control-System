import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OperationalShell } from "@/components/control/OperationalShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "2MRRW Control System",
  description: "Backend operations command surface for the 2MRRW Control System.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <OperationalShell>{children}</OperationalShell>
      </body>
    </html>
  );
}
