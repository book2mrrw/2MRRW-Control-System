import "server-only";

import { getServerSupabase } from "@/server/supabase/client";

export type ReleaseCreditMetadata = {
  producer?: string | null;
  mixingEngineer?: string | null;
  masteringEngineer?: string | null;
  recordLabel?: string | null;
  writtenBy?: string | null;
};

export async function loadReleaseCreditMetadata(releaseId: string): Promise<ReleaseCreditMetadata> {
  const supabase = getServerSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("releases")
    .select("producer, mixing_engineer, mastering_engineer, record_label, written_by")
    .eq("id", releaseId)
    .maybeSingle();

  if (error || !data) return {};

  return {
    producer: (data as { producer?: string | null }).producer ?? null,
    mixingEngineer: (data as { mixing_engineer?: string | null }).mixing_engineer ?? null,
    masteringEngineer: (data as { mastering_engineer?: string | null }).mastering_engineer ?? null,
    recordLabel: (data as { record_label?: string | null }).record_label ?? null,
    writtenBy: (data as { written_by?: string | null }).written_by ?? null
  };
}

export async function persistReleaseCreditMetadata(releaseId: string, input: ReleaseCreditMetadata) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { persisted: false as const, message: "Supabase is not configured." };
  }

  const payload: Record<string, string | null> = {};
  if ("producer" in input) payload.producer = input.producer?.trim() || null;
  if ("mixingEngineer" in input) payload.mixing_engineer = input.mixingEngineer?.trim() || null;
  if ("masteringEngineer" in input) payload.mastering_engineer = input.masteringEngineer?.trim() || null;
  if ("recordLabel" in input) payload.record_label = input.recordLabel?.trim() || null;
  if ("writtenBy" in input) payload.written_by = input.writtenBy?.trim() || null;

  if (!Object.keys(payload).length) {
    return { persisted: true as const, message: "No metadata fields to persist." };
  }

  const { error } = await supabase.from("releases").update(payload).eq("id", releaseId);
  if (error) {
    return { persisted: false as const, message: error.message };
  }

  return { persisted: true as const, message: "Release metadata saved." };
}
