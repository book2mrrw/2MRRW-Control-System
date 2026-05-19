import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";

const ROOT = join(import.meta.dirname, "..");
const LAYOUT = join(ROOT, "src/app/layout.tsx");
const HEALTH_BASIC = join(ROOT, "src/app/api/health/basic/route.ts");

function testSinglePrefersMp4() {
  const asset = buildReleasePrimaryAsset({
    slug: "hour-glass",
    releaseType: "single",
    releaseCategory: "single",
    coverUrl: "https://cdn.example/images/singles/hourglass.jpg",
    loopUrl: "https://cdn.example/videos/singles/hourglass.mp4"
  });
  assert.equal(asset?.type, "mp4");
  assert.ok(asset?.src.includes(".mp4"));
}

function testAlbumPrefersJpg() {
  const asset = buildReleasePrimaryAsset({
    slug: "love-hz",
    releaseType: "album",
    releaseCategory: "album",
    coverUrl: "https://cdn.example/images/albums/love-hz.jpg"
  });
  assert.equal(asset?.type, "jpg");
  assert.equal(asset?.src.includes(".mp4"), false);
}

function testLayoutDoesNotImportCatalogBuilder() {
  const source = readFileSync(LAYOUT, "utf8");
  assert.equal(source.includes("buildControlCatalogPayload"), false);
  assert.ok(source.includes("initialCatalog={[]}"));
}

function testHealthBasicRouteExists() {
  assert.equal(existsSync(HEALTH_BASIC), true);
  const source = readFileSync(HEALTH_BASIC, "utf8");
  assert.ok(source.includes("export async function GET"));
  assert.ok(source.includes("ok: true"));
}

testSinglePrefersMp4();
testAlbumPrefersJpg();
testLayoutDoesNotImportCatalogBuilder();
testHealthBasicRouteExists();

console.log("stability foundation verification passed");
