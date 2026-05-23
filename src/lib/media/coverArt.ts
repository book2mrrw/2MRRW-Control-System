export type CoverArtMediaType = "image" | "video";

export const coverImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const coverVideoMimeTypes = ["video/mp4"] as const;
export const coverArtMimeTypes = [...coverImageMimeTypes, ...coverVideoMimeTypes] as const;

export const coverImageExtensions = ["jpg", "jpeg", "png", "webp"] as const;
export const coverVideoExtensions = ["mp4"] as const;
export const coverArtExtensions = [...coverImageExtensions, ...coverVideoExtensions] as const;

export const coverImageMaxBytes = 70 * 1024 * 1024;
export const coverVideoMaxBytes = 50 * 1024 * 1024;

export const coverArtAccept =
  ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,video/mp4,.mp4";

export function extensionForFileName(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isCoverVideoExtension(extension: string) {
  return extension === "mp4";
}

export function isCoverVideoPath(path: string) {
  return isCoverVideoExtension(extensionForFileName(path.split("/").pop() ?? path));
}

export function coverArtTypeForPath(path: string): CoverArtMediaType {
  return isCoverVideoPath(path) ? "video" : "image";
}

export function coverArtTypeForFile(file: Pick<File, "type" | "name">): CoverArtMediaType {
  if (file.type === "video/mp4" || isCoverVideoExtension(extensionForFileName(file.name))) {
    return "video";
  }
  return "image";
}

export function isCoverVideoFile(file: Pick<File, "type" | "name">) {
  return coverArtTypeForFile(file) === "video";
}

export function coverMaxBytesForExtension(extension: string) {
  return isCoverVideoExtension(extension) ? coverVideoMaxBytes : coverImageMaxBytes;
}

export function coverMaxSizeMbForExtension(extension: string) {
  return isCoverVideoExtension(extension) ? 50 : 70;
}

export function isAllowedCoverArtFile(file: Pick<File, "type" | "name">) {
  const extension = extensionForFileName(file.name);
  if (!coverArtExtensions.includes(extension as (typeof coverArtExtensions)[number])) {
    return false;
  }
  if (file.type) {
    const normalized = file.type.toLowerCase();
    return coverArtMimeTypes.includes(normalized as (typeof coverArtMimeTypes)[number]);
  }
  return true;
}
