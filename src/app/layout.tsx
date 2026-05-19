import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OperationalShell } from "@/components/control/OperationalShell";
import { buildControlCatalogPayload } from "@/server/catalog/controlCatalogPayload";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "2MRRW Control System",
  description: "Backend operations command surface for the 2MRRW Control System.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const initialCatalog = await buildControlCatalogPayload();
  return (
    <html lang="en">
      <body>
        <OperationalShell initialCatalog={initialCatalog}>{children}</OperationalShell>
      </body>
    </html>
  );
}
