import { apiRequest } from "@/lib/apiClient";
import type {
  CreateJournalEntryInput,
  JournalEntry,
  JournalPhotoUpload,
} from "@/types/journal";

export function getJournalEntries(): Promise<JournalEntry[]> {
  return apiRequest<JournalEntry[]>("/journal", { cache: "no-store" });
}

export function createJournalEntry(
  input: CreateJournalEntryInput,
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>("/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function uploadJournalPhoto(file: File): Promise<JournalPhotoUpload> {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<JournalPhotoUpload>("/journal/photos", {
    method: "POST",
    body,
  });
}

export function deleteJournalEntry(id: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/journal/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
