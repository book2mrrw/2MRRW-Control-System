import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildFrontendEcosystemPersistencePlan } from "@/server/release-management/frontendReleaseIngestionService";
import { renderFrontendEcosystemSql, renderFrontendEcosystemSqlChunks } from "@/server/release-management/frontendReleaseSqlExport";

const plan = await buildFrontendEcosystemPersistencePlan();
if (!plan) {
  console.error("No readable frontend repository was found.");
  process.exitCode = 1;
} else {
  const outputDir = path.join(process.cwd(), ".tmp");
  await mkdir(outputDir, { recursive: true });
  const sqlPath = path.join(outputDir, "frontend-ecosystem-import.sql");
  const chunks = renderFrontendEcosystemSqlChunks(plan);
  await writeFile(sqlPath, renderFrontendEcosystemSql(plan), "utf8");
  await Promise.all(
    chunks.map((chunk, index) => writeFile(path.join(outputDir, `frontend-ecosystem-import.chunk-${index + 1}.sql`), chunk, "utf8"))
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        frontendPath: plan.frontendPath,
        sources: plan.sources,
        counts: {
          artists: plan.artists.length,
          releases: plan.releases.length,
          tracks: plan.tracks.length,
          mediaAssets: plan.mediaAssets.length,
          audioVisuals: plan.audioVisuals.length,
          syncEvents: plan.syncEvents.length
        },
        sqlPath,
        chunkCount: chunks.length
      },
      null,
      2
    )
  );
}
