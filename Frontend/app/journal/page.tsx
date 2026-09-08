"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalEntries,
  uploadJournalPhoto,
} from "@/services/journalService";
import { getTrips } from "@/services/tripService";
import type { JournalEntry, JournalEntryType } from "@/types/journal";
import type { Trip } from "@/types/trip";

type JournalFilter = "all" | JournalEntryType;

const MAX_PHOTO_SIZE = 8 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const JOURNAL_COPY = {
  en: {
    eyebrow: "Personal travel journal",
    title: "My Journal",
    intro: "Photos get buried in camera rolls. Keep the story with them.",
    privacy: "Private to you",
    addMoment: "Add a moment",
    writeNote: "Write a note",
    all: "All stories",
    moments: "Moments",
    notes: "Travel notes",
    count: (count: number) => `${count} ${count === 1 ? "story" : "stories"} kept`,
    emptyTitle: "Your journal starts with the next story.",
    emptyBody: "Save a photograph you love or write down something you do not want to forget.",
    emptyMomentTitle: "No moments yet.",
    emptyMomentBody: "Add a favorite travel photo and tell the story behind it.",
    emptyNoteTitle: "No travel notes yet.",
    emptyNoteBody: "Write down a detail, feeling, or place worth remembering.",
    formMomentTitle: "Keep this moment",
    formNoteTitle: "Write a travel note",
    formMomentIntro: "A photograph becomes more meaningful when its story stays close.",
    formNoteIntro: "Capture the details that a photograph cannot always hold.",
    close: "Close",
    photo: "Photo",
    choosePhoto: "Choose a photo",
    photoHint: "JPG, PNG, or WebP · up to 8 MB",
    titleLabel: "Title",
    momentTitlePlaceholder: "Sunset after the rain",
    noteTitlePlaceholder: "A morning worth remembering",
    storyLabel: "Your story",
    momentStoryPlaceholder: "What made this moment special?",
    noteStoryPlaceholder: "Write what happened, how it felt, or what you want to remember…",
    location: "Location",
    locationPlaceholder: "Ubud, Bali",
    date: "Date",
    trip: "Related trip",
    noTrip: "Not linked to a trip",
    autofillHint: "Location and date filled from this trip. Make them more specific if you like.",
    saveMoment: "Save moment",
    saveNote: "Save note",
    savingPhoto: "Saving your story…",
    requiredPhoto: "Choose a photo for this moment.",
    invalidPhoto: "Choose a JPG, PNG, or WebP photo.",
    largePhoto: "Photo must be 8 MB or smaller.",
    loadError: "Your journal could not be opened.",
    saveError: "Your story could not be saved.",
    remove: "Remove",
    removeConfirm: "Remove this story from your journal?",
    removeError: "This story could not be removed.",
    moment: "Moment",
    note: "Travel note",
    linkedTrip: "From your trip to",
  },
  id: {
    eyebrow: "Jurnal perjalanan pribadi",
    title: "Jurnal Saya",
    intro: "Foto mudah tenggelam di galeri. Simpan ceritanya agar tetap berarti.",
    privacy: "Hanya untuk Anda",
    addMoment: "Tambah momen",
    writeNote: "Tulis catatan",
    all: "Semua cerita",
    moments: "Momen",
    notes: "Catatan perjalanan",
    count: (count: number) => `${count} cerita tersimpan`,
    emptyTitle: "Jurnal Anda dimulai dari cerita berikutnya.",
    emptyBody: "Simpan foto perjalanan favorit atau tulis sesuatu yang tidak ingin Anda lupakan.",
    emptyMomentTitle: "Belum ada momen.",
    emptyMomentBody: "Tambahkan foto perjalanan favorit dan ceritakan kisah di baliknya.",
    emptyNoteTitle: "Belum ada catatan perjalanan.",
    emptyNoteBody: "Tulis detail, perasaan, atau tempat yang layak dikenang.",
    formMomentTitle: "Simpan momen ini",
    formNoteTitle: "Tulis catatan perjalanan",
    formMomentIntro: "Sebuah foto terasa lebih berarti ketika ceritanya tetap tersimpan.",
    formNoteIntro: "Abadikan detail yang tidak selalu dapat diceritakan oleh foto.",
    close: "Tutup",
    photo: "Foto",
    choosePhoto: "Pilih foto",
    photoHint: "JPG, PNG, atau WebP · maksimal 8 MB",
    titleLabel: "Judul",
    momentTitlePlaceholder: "Senja setelah hujan",
    noteTitlePlaceholder: "Pagi yang layak dikenang",
    storyLabel: "Cerita Anda",
    momentStoryPlaceholder: "Apa yang membuat momen ini istimewa?",
    noteStoryPlaceholder: "Tulis apa yang terjadi, bagaimana rasanya, atau hal yang ingin Anda ingat…",
    location: "Lokasi",
    locationPlaceholder: "Ubud, Bali",
    date: "Tanggal",
    trip: "Trip terkait",
    noTrip: "Tidak terhubung ke trip",
    autofillHint: "Lokasi dan tanggal terisi dari trip ini. Anda tetap dapat membuatnya lebih spesifik.",
    saveMoment: "Simpan momen",
    saveNote: "Simpan catatan",
    savingPhoto: "Menyimpan cerita Anda…",
    requiredPhoto: "Pilih foto untuk momen ini.",
    invalidPhoto: "Pilih foto JPG, PNG, atau WebP.",
    largePhoto: "Ukuran foto maksimal 8 MB.",
    loadError: "Jurnal Anda tidak dapat dibuka.",
    saveError: "Cerita Anda tidak dapat disimpan.",
    remove: "Hapus",
    removeConfirm: "Hapus cerita ini dari jurnal Anda?",
    removeError: "Cerita ini tidak dapat dihapus.",
    moment: "Momen",
    note: "Catatan perjalanan",
    linkedTrip: "Dari perjalanan Anda ke",
  },
} as const;

function displayError(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

function photoBackground(url: string): string {
  return `url(${JSON.stringify(url)})`;
}

export default function JournalPage() {
  const { locale } = useLanguage();
  const copy = JOURNAL_COPY[locale];
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<JournalFilter>("all");
  const [composerType, setComposerType] = useState<JournalEntryType | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [tripId, setTripId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    [locale],
  );

  const visibleEntries = useMemo(
    () => entries.filter((entry) => filter === "all" || entry.entry_type === filter),
    [entries, filter],
  );

  useEffect(() => {
    let ignore = false;
    Promise.all([getJournalEntries(), getTrips()])
      .then(([savedEntries, savedTrips]) => {
        if (ignore) return;
        setEntries(savedEntries);
        setTrips(savedTrips);
      })
      .catch((reason: unknown) => {
        if (!ignore) setError(displayError(reason, copy.loadError));
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [copy.loadError]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function resetComposer() {
    setComposerType(null);
    setTitle("");
    setContent("");
    setLocation("");
    setOccurredOn("");
    setTripId("");
    setPhoto(null);
    setPhotoPreview(null);
    setError(null);
  }

  function openComposer(type: JournalEntryType) {
    resetComposer();
    setComposerType(type);
  }

  function handlePhotoChange(file: File | null) {
    setError(null);
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    if (!PHOTO_TYPES.includes(file.type)) {
      setError(copy.invalidPhoto);
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError(copy.largePhoto);
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleTripChange(value: string) {
    setTripId(value);
    if (!value) return;

    const selectedTrip = trips.find((trip) => trip.id === Number(value));
    if (!selectedTrip) return;
    setLocation(selectedTrip.destination);
    setOccurredOn(selectedTrip.departure_date ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!composerType) return;
    if (composerType === "moment" && !photo) {
      setError(copy.requiredPhoto);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const uploadedPhoto = photo ? await uploadJournalPhoto(photo) : null;
      const entry = await createJournalEntry({
        entry_type: composerType,
        title: title.trim(),
        content: content.trim(),
        location: location.trim() || null,
        occurred_on: occurredOn || null,
        trip_id: tripId ? Number(tripId) : null,
        photo_key: uploadedPhoto?.photo_key ?? null,
      });
      setEntries((current) => [entry, ...current]);
      setFilter("all");
      resetComposer();
    } catch (reason) {
      setError(displayError(reason, copy.saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(entry: JournalEntry) {
    if (!window.confirm(copy.removeConfirm)) return;
    setError(null);
    try {
      await deleteJournalEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (reason) {
      setError(displayError(reason, copy.removeError));
    }
  }

  const emptyTitle = filter === "moment"
    ? copy.emptyMomentTitle
    : filter === "note"
      ? copy.emptyNoteTitle
      : copy.emptyTitle;
  const emptyBody = filter === "moment"
    ? copy.emptyMomentBody
    : filter === "note"
      ? copy.emptyNoteBody
      : copy.emptyBody;

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-[#081a1c] px-5 py-8 text-[#f6eedd] sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="grid gap-8 border-b border-[#c79a44]/25 pb-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#79d8bd]">{copy.eyebrow}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
                <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#79d8bd]" />
                {copy.privacy}
              </span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">{copy.title}</h1>
            <p className="mt-4 max-w-xl font-serif text-base italic leading-7 text-[#f6eedd]/62 sm:text-lg">
              {copy.intro}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openComposer("note")}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white/75 transition hover:border-[#79d8bd]/55 hover:text-white"
            >
              <span aria-hidden="true">✎ </span>{copy.writeNote}
            </button>
            <button
              type="button"
              onClick={() => openComposer("moment")}
              className="rounded-full bg-[#f3c769] px-5 py-3 text-sm font-black text-[#081a1c] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <span aria-hidden="true">＋ </span>{copy.addMoment}
            </button>
          </div>
        </header>

        {composerType && (
          <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#f3c769]/25 bg-[#0e2a2c] shadow-[0_28px_80px_-45px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-5 border-b border-white/10 px-6 py-5 sm:px-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f3c769]">
                  {composerType === "moment" ? copy.moment : copy.note}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
                  {composerType === "moment" ? copy.formMomentTitle : copy.formNoteTitle}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/48">
                  {composerType === "moment" ? copy.formMomentIntro : copy.formNoteIntro}
                </p>
              </div>
              <button
                type="button"
                onClick={resetComposer}
                disabled={isSaving}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-xl text-white/55 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                aria-label={copy.close}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
              {composerType === "moment" ? (
                <label className="group block cursor-pointer">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{copy.photo}</span>
                  <span
                    className="grid min-h-72 place-items-center overflow-hidden rounded-[1.5rem] border border-dashed border-white/20 bg-[#07191b] bg-cover bg-center p-6 text-center transition group-hover:border-[#f3c769]/55"
                    style={photoPreview ? { backgroundImage: photoBackground(photoPreview) } : undefined}
                  >
                    <input
                      type="file"
                      accept={PHOTO_TYPES.join(",")}
                      onChange={(event) => handlePhotoChange(event.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                    <span className={`rounded-2xl border border-white/10 bg-[#07191b]/88 px-5 py-4 backdrop-blur ${photoPreview ? "opacity-0 transition group-hover:opacity-100" : ""}`}>
                      <span className="mx-auto grid size-10 place-items-center rounded-full bg-[#f3c769]/10 text-xl text-[#f3c769]" aria-hidden="true">＋</span>
                      <strong className="mt-3 block text-sm">{copy.choosePhoto}</strong>
                      <small className="mt-1 block text-[10px] text-white/40">{copy.photoHint}</small>
                    </span>
                  </span>
                </label>
              ) : (
                <div className="hidden rounded-[1.5rem] border border-white/10 bg-[#07191b] p-7 lg:flex lg:flex-col lg:justify-between">
                  <span className="text-5xl text-[#f3c769]/80" aria-hidden="true">“</span>
                  <p className="font-serif text-xl italic leading-8 text-[#f6eedd]/75">
                    {content || copy.noteStoryPlaceholder}
                  </p>
                  <span className="mt-8 h-px w-14 bg-[#f3c769]/55" />
                </div>
              )}

              <div className="grid content-start gap-4">
                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{copy.titleLabel}</span>
                  <input
                    required
                    maxLength={160}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={composerType === "moment" ? copy.momentTitlePlaceholder : copy.noteTitlePlaceholder}
                    className="w-full rounded-2xl border border-white/10 bg-[#07191b] px-4 py-3.5 text-sm outline-none transition placeholder:text-white/25 focus:border-[#f3c769]/60"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{copy.storyLabel}</span>
                  <textarea
                    required
                    rows={5}
                    maxLength={8000}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={composerType === "moment" ? copy.momentStoryPlaceholder : copy.noteStoryPlaceholder}
                    className="w-full resize-y rounded-2xl border border-white/10 bg-[#07191b] px-4 py-3.5 text-sm leading-6 outline-none transition placeholder:text-white/25 focus:border-[#f3c769]/60"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{copy.location}</span>
                    <input
                      maxLength={160}
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder={copy.locationPlaceholder}
                      className="w-full rounded-2xl border border-white/10 bg-[#07191b] px-4 py-3.5 text-sm outline-none placeholder:text-white/25 focus:border-[#f3c769]/60"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{copy.date}</span>
                    <input
                      type="date"
                      value={occurredOn}
                      onChange={(event) => setOccurredOn(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#07191b] px-4 py-3.5 text-sm outline-none [color-scheme:dark] focus:border-[#f3c769]/60"
                    />
                  </label>
                </div>
                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{copy.trip}</span>
                  <select
                    value={tripId}
                    onChange={(event) => handleTripChange(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#07191b] px-4 py-3.5 text-sm outline-none focus:border-[#f3c769]/60"
                  >
                    <option value="">{copy.noTrip}</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>{trip.destination}</option>
                    ))}
                  </select>
                  {tripId && (
                    <span className="mt-2 block text-[10px] leading-4 text-[#79d8bd]/72">
                      {copy.autofillHint}
                    </span>
                  )}
                </label>
                <button
                  type="submit"
                  disabled={isSaving || !title.trim() || !content.trim()}
                  className="mt-2 rounded-full bg-[#f3c769] px-6 py-3.5 text-sm font-black text-[#081a1c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? copy.savingPhoto : composerType === "moment" ? copy.saveMoment : copy.saveNote}
                </button>
              </div>
            </form>
          </section>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-[#d16850]/35 bg-[#4b211d]/45 px-5 py-4 text-sm text-[#f3b09f]" role="alert">
            {error}
          </div>
        )}

        <section className="pt-8" aria-live="polite">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-fit rounded-full border border-white/10 bg-white/[0.025] p-1">
              {([
                ["all", copy.all],
                ["moment", copy.moments],
                ["note", copy.notes],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter === value ? "bg-[#f6eedd] text-[#081a1c]" : "text-white/48 hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!isLoading && <p className="text-xs text-white/38">{copy.count(visibleEntries.length)}</p>}
          </div>

          {isLoading ? (
            <div className="mt-7 grid animate-pulse gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 rounded-[1.75rem] bg-white/5" />)}
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="mt-7 rounded-[2rem] border border-dashed border-[#c79a44]/40 bg-[#0e2a2c]/55 px-6 py-16 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#f3c769]/25 text-2xl text-[#f3c769]" aria-hidden="true">✦</span>
              <h2 className="mt-5 text-2xl font-black tracking-[-0.035em]">{emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/48">{emptyBody}</p>
            </div>
          ) : (
            <div className="mt-7 grid items-start gap-5 md:grid-cols-2">
              {visibleEntries.map((entry) => {
                const displayDate = entry.occurred_on
                  ? new Date(`${entry.occurred_on}T00:00:00`)
                  : new Date(entry.created_at);
                const metadata = [entry.location, dateFormatter.format(displayDate)].filter(Boolean).join(" · ");
                return (
                  <article
                    key={entry.id}
                    className={`group overflow-hidden rounded-[1.75rem] border transition hover:-translate-y-0.5 ${entry.entry_type === "moment" ? "border-white/10 bg-[#0e2a2c]" : "border-[#c79a44]/25 bg-[#f2e9d6] text-[#182421]"}`}
                  >
                    {entry.entry_type === "moment" && entry.photo_url && (
                      <div
                        role="img"
                        aria-label={entry.title}
                        className="aspect-[16/10] bg-[#07191b] bg-cover bg-center"
                        style={{ backgroundImage: photoBackground(entry.photo_url) }}
                      />
                    )}
                    <div className="p-6 sm:p-7">
                      <div className="flex items-center justify-between gap-4">
                        <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${entry.entry_type === "moment" ? "text-[#79d8bd]" : "text-[#8a6a2e]"}`}>
                          {entry.entry_type === "moment" ? copy.moment : copy.note}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleRemove(entry)}
                          className={`text-[10px] font-bold opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${entry.entry_type === "moment" ? "text-white/38 hover:text-[#f3b09f]" : "text-[#7c7163] hover:text-[#a23825]"}`}
                        >
                          {copy.remove}
                        </button>
                      </div>
                      <h2 className="mt-3 text-2xl font-black tracking-[-0.035em]">{entry.title}</h2>
                      <p className={`mt-2 text-xs ${entry.entry_type === "moment" ? "text-white/42" : "text-[#6d675e]"}`}>{metadata}</p>
                      <p className={`mt-5 whitespace-pre-wrap font-serif text-base leading-7 ${entry.entry_type === "moment" ? "text-[#f6eedd]/72" : "italic text-[#3e4945]"}`}>
                        {entry.content}
                      </p>
                      {entry.trip_destination && (
                        <p className={`mt-6 border-t pt-4 text-[10px] font-bold uppercase tracking-[0.12em] ${entry.entry_type === "moment" ? "border-white/10 text-[#f3c769]/68" : "border-[#8a6a2e]/15 text-[#8a6a2e]"}`}>
                          {copy.linkedTrip} {entry.trip_destination}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
