"use client";

import type { ReactNode } from "react";
import { CreatorReleaseSystem } from "@/components/control/CreatorReleaseSystem";
import type { DurableCatalogRelease } from "@/services/catalog/controlCatalogClient";

export function OperationalShell({
  children,
  initialCatalog = []
}: {
  children: ReactNode;
  initialCatalog?: DurableCatalogRelease[];
}) {
  void children;

  return <CreatorReleaseSystem initialCatalog={initialCatalog} />;
}
