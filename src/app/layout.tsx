import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OperationalShell } from "@/components/control/OperationalShell";
import { PublicSitePreview, ToastStack } from "@/components/control/ReleaseControlViews";
import { ReleaseControlProvider } from "@/components/control/ReleaseControlStore";
import "./globals.css";

export const metadata: Metadata = {
  title: "2MRRW — Release Control System",
  description: "Creator release control system for 2MRRW backend operations.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ReleaseControlProvider>
          <OperationalShell>{children}</OperationalShell>
          <PublicSitePreview />
          <ToastStack />
        </ReleaseControlProvider>
      </body>
    </html>
  );
}
