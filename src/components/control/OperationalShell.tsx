"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CreatorReleaseSystem } from "@/components/control/CreatorReleaseSystem";
import type { DurableCatalogRelease } from "@/services/catalog/controlCatalogClient";

export function OperationalShell({
  children,
  initialCatalog = []
}: {
  children: ReactNode;
  initialCatalog?: DurableCatalogRelease[];
}) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return <CreatorReleaseSystem initialCatalog={initialCatalog} />;
}
