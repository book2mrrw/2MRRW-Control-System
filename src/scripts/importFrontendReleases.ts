import { loadEnvLocal } from "@/server/lib/loadEnvLocal";
import { ingestFrontendReleaseEcosystem } from "@/server/release-management/frontendReleaseIngestionService";

loadEnvLocal();

const result = await ingestFrontendReleaseEcosystem();

console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exitCode = 1;
}
