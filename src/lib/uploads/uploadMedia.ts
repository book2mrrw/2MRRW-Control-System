import { mediaValidationConfigs, mediaKindFromFile, validateMediaFile, type MediaUploadKind } from "@/lib/uploads/mediaValidation";

export type UploadMediaInput = {
  endpoint: string;
  file: File;
  kind?: MediaUploadKind;
  fields?: Record<string, string | Blob>;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

export type UploadMediaResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function uploadMedia<T = unknown>({
  endpoint,
  file,
  kind = mediaKindFromFile(file),
  fields,
  signal,
  onProgress
}: UploadMediaInput): Promise<UploadMediaResult<T>> {
  const validationError = validateMediaFile(file, mediaValidationConfigs[kind]);
  if (validationError) {
    return Promise.resolve({ ok: false, error: validationError });
  }

  const formData = new FormData();
  formData.set("file", file);
  formData.set("kind", kind);
  Object.entries(fields ?? {}).forEach(([key, value]) => formData.set(key, value));

  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", endpoint);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      const parsed = parseUploadResponse<T>(request.responseText);
      if (request.status >= 200 && request.status < 300) {
        resolve({ ok: true, data: parsed });
        return;
      }
      resolve({ ok: false, error: responseError(parsed) ?? request.statusText });
    };

    request.onerror = () => resolve({ ok: false, error: "Upload failed. Check your connection and try again." });
    request.onabort = () => resolve({ ok: false, error: "Upload cancelled." });
    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(formData);
  });
}

function parseUploadResponse<T>(text: string): T | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function responseError(response: unknown) {
  if (response && typeof response === "object" && "error" in response && typeof response.error === "string") {
    return response.error;
  }
  if (response && typeof response === "object" && "message" in response && typeof response.message === "string") {
    return response.message;
  }
  return undefined;
}
