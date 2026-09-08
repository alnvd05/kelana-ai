export type JournalEntryType = "moment" | "note";

export type JournalEntry = {
  id: number;
  entry_type: JournalEntryType;
  title: string;
  content: string;
  location: string | null;
  occurred_on: string | null;
  trip_id: number | null;
  trip_destination: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateJournalEntryInput = {
  entry_type: JournalEntryType;
  title: string;
  content: string;
  location: string | null;
  occurred_on: string | null;
  trip_id: number | null;
  photo_key: string | null;
};

export type JournalPhotoUpload = {
  photo_key: string;
  photo_url: string;
};
