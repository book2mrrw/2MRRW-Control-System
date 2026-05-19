import { loadEnvLocal } from "@/server/lib/loadEnvLocal";
import { runFrontendIngestionPipeline } from "@/server/release-management/frontendIngestionPipeline";

loadEnvLocal();

const args = new Set(process.argv.slice(2));
const options = {
  scanOnly: args.has("--scan-only"),
  dryRun: args.has("--dry-run"),
  validate: args.has("--validate") || !args.has("--scan-only"),
  activate: args.has("--activate") || (!args.has("--dry-run") && !args.has("--scan-only"))
};

const report = await runFrontendIngestionPipeline(options);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
