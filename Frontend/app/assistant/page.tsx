"use client";

import { FormEvent, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/apiClient";
import {
  askKnowledgeBase,
  type KnowledgeBaseResponse,
} from "@/services/knowledgeBaseService";

const ASSISTANT_COPY = {
  en: {
    eyebrow: "Trusted travel intelligence",
    title: "Ask KelanaAI",
    intro:
      "Get practical answers grounded in the travel documents uploaded to your Knowledge Base.",
    grounded: "Knowledge Base connected",
    questionLabel: "Your travel question",
    placeholder: "Can I bring medication into Japan?",
    ask: "Ask KelanaAI",
    asking: "Searching trusted documents…",
    suggestionsLabel: "Try asking",
    suggestions: [
      "What documents are required to visit Japan?",
      "Can I bring medication into Japan?",
      "What should I pack for a trip to Tokyo?",
    ],
    answerLabel: "Grounded answer",
    sourcesLabel: "Sources",
    noSources: "No source metadata was returned for this answer.",
    sourceDocument: "Source document",
    idleTitle: "Your answer will appear here",
    idleBody:
      "KelanaAI retrieves relevant passages first, then uses them to generate a focused answer.",
    generalLabel: "General LLM",
    generalBody: "Relies on public training data and may not know your private or updated documents.",
    ragLabel: "KelanaAI with RAG",
    ragBody: "Retrieves trusted context before answering and returns the supporting documents.",
    compareTitle: "Why grounded answers are different",
    flowQuestion: "Question",
    flowRetrieve: "Retrieve",
    flowAnswer: "Answer",
    unavailable:
      "The Knowledge Base connection is not available yet. The assistant UI is ready, but AWS credentials must be fixed before live grounded answers can be returned.",
    fallbackError: "KelanaAI could not answer that question. Please try again.",
    privateNote: "AWS credentials stay on the FastAPI backend and are never sent to the browser.",
  },
  id: {
    eyebrow: "Informasi perjalanan tepercaya",
    title: "Tanya KelanaAI",
    intro:
      "Dapatkan jawaban praktis berdasarkan dokumen perjalanan yang diunggah ke Knowledge Base Anda.",
    grounded: "Terhubung ke Knowledge Base",
    questionLabel: "Pertanyaan perjalanan Anda",
    placeholder: "Apakah saya boleh membawa obat ke Jepang?",
    ask: "Tanya KelanaAI",
    asking: "Mencari di dokumen tepercaya…",
    suggestionsLabel: "Coba tanyakan",
    suggestions: [
      "Dokumen apa saja yang diperlukan untuk mengunjungi Jepang?",
      "Apakah saya boleh membawa obat ke Jepang?",
      "Apa saja yang perlu dibawa untuk perjalanan ke Tokyo?",
    ],
    answerLabel: "Jawaban berbasis dokumen",
    sourcesLabel: "Sumber",
    noSources: "Metadata sumber tidak dikembalikan untuk jawaban ini.",
    sourceDocument: "Dokumen sumber",
    idleTitle: "Jawaban Anda akan muncul di sini",
    idleBody:
      "KelanaAI mengambil bagian dokumen yang relevan terlebih dahulu, lalu menggunakannya untuk membuat jawaban yang terarah.",
    generalLabel: "LLM Umum",
    generalBody: "Mengandalkan data pelatihan publik dan mungkin tidak mengetahui dokumen privat atau terbaru Anda.",
    ragLabel: "KelanaAI dengan RAG",
    ragBody: "Mengambil konteks tepercaya sebelum menjawab dan mengembalikan dokumen pendukung.",
    compareTitle: "Mengapa jawaban grounded berbeda",
    flowQuestion: "Pertanyaan",
    flowRetrieve: "Pencarian",
    flowAnswer: "Jawaban",
    unavailable:
      "Koneksi Knowledge Base belum tersedia. Tampilan assistant sudah siap, tetapi kredensial AWS perlu diperbaiki sebelum jawaban grounded dapat dikembalikan.",
    fallbackError: "KelanaAI tidak dapat menjawab pertanyaan tersebut. Silakan coba lagi.",
    privateNote: "Kredensial AWS tetap berada di backend FastAPI dan tidak pernah dikirim ke browser.",
  },
} as const;

function isWebLink(uri: string | null): uri is string {
  return Boolean(uri && (uri.startsWith("https://") || uri.startsWith("http://")));
}

export default function AssistantPage() {
  const { locale } = useLanguage();
  const copy = ASSISTANT_COPY[locale];
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<KnowledgeBaseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submitQuestion(nextQuestion: string) {
    const normalizedQuestion = nextQuestion.trim();
    if (!normalizedQuestion || isLoading) return;

    setQuestion(normalizedQuestion);
    setIsLoading(true);
    setError(null);

    try {
      setResult(await askKnowledgeBase(normalizedQuestion));
    } catch (reason) {
      setResult(null);
      if (reason instanceof ApiError && (reason.status === 502 || reason.status === 503)) {
        setError(copy.unavailable);
      } else {
        setError(reason instanceof Error ? reason.message : copy.fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(question);
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-[#081a1c] px-5 py-8 text-[#f6eedd] sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="relative overflow-hidden rounded-[2rem] border border-[#c79a44]/30 bg-[#0e2a2c] px-6 py-8 shadow-[0_32px_90px_-55px_rgba(243,199,105,0.55)] sm:px-10 lg:px-12 lg:py-11">
          <div className="absolute -right-16 -top-24 size-72 rounded-full bg-[#1d7771]/20 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-[#c79a44]/10 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f3c769]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#f6eedd]/65 sm:text-base">
                {copy.intro}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#79d8bd]/25 bg-[#79d8bd]/10 px-4 py-2 text-xs font-bold text-[#9ce4bd]">
              <span className="size-2 rounded-full bg-[#79d8bd] shadow-[0_0_14px_rgba(121,216,189,0.9)]" aria-hidden="true" />
              {copy.grounded}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0b2325] p-5 sm:p-7">
            <form onSubmit={handleSubmit}>
              <label htmlFor="assistant-question" className="text-xs font-black uppercase tracking-[0.18em] text-[#f3c769]">
                {copy.questionLabel}
              </label>
              <div className="mt-3 rounded-3xl border border-white/10 bg-[#071a1c] p-2 transition focus-within:border-[#f3c769]/70 focus-within:ring-4 focus-within:ring-[#f3c769]/5">
                <textarea
                  id="assistant-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={copy.placeholder}
                  rows={4}
                  maxLength={2000}
                  disabled={isLoading}
                  className="block w-full resize-none bg-transparent px-4 py-3 text-base leading-7 text-[#f6eedd] outline-none placeholder:text-white/30 disabled:opacity-60"
                />
                <div className="flex items-center justify-between gap-4 border-t border-white/8 px-2 pt-2">
                  <span className="pl-2 text-[10px] font-bold tabular-nums text-white/30">
                    {question.length}/2000
                  </span>
                  <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="inline-flex min-w-36 items-center justify-center gap-2 rounded-full bg-[#f3c769] px-5 py-3 text-sm font-black text-[#081a1c] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-45"
                  >
                    {isLoading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-[#081a1c]/25 border-t-[#081a1c]" aria-hidden="true" />
                        {copy.asking}
                      </>
                    ) : (
                      <>{copy.ask} <span aria-hidden="true">→</span></>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                {copy.suggestionsLabel}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {copy.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void submitQuestion(suggestion)}
                    className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-left text-xs leading-5 text-[#f6eedd]/70 transition hover:border-[#f3c769]/55 hover:text-[#f3c769] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 min-h-72 border-t border-white/10 pt-7" aria-live="polite">
              {error && (
                <div className="rounded-3xl border border-[#d16850]/40 bg-[#4b211d]/45 p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d16850]/15 text-[#f3a58e]" aria-hidden="true">!</span>
                    <p className="text-sm leading-7 text-[#f6eedd]/80">{error}</p>
                  </div>
                </div>
              )}

              {!error && !result && !isLoading && (
                <div className="grid min-h-56 place-items-center rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-6 text-center">
                  <div>
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#f3c769]/25 bg-[#f3c769]/5 text-2xl text-[#f3c769]" aria-hidden="true">▤</span>
                    <h2 className="mt-4 text-xl font-black">{copy.idleTitle}</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">{copy.idleBody}</p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="space-y-4" role="status">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-[#f3c769]/20" />
                  <div className="h-4 w-full animate-pulse rounded-full bg-white/8" />
                  <div className="h-4 w-[92%] animate-pulse rounded-full bg-white/8" />
                  <div className="h-4 w-[72%] animate-pulse rounded-full bg-white/8" />
                </div>
              )}

              {!error && result && !isLoading && (
                <article>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79d8bd]">
                    {copy.answerLabel}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#f6eedd]/90">
                    {result.answer}
                  </p>
                  <div className="mt-7 border-t border-white/10 pt-5">
                    <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[#f3c769]">
                      {copy.sourcesLabel}
                    </h2>
                    {result.sources.length > 0 ? (
                      <ul className="mt-3 grid gap-2">
                        {result.sources.map((source) => (
                          <li key={`${source.name}-${source.uri ?? "local"}`}>
                            {isWebLink(source.uri) ? (
                              <a
                                href={source.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-[#f6eedd]/75 transition hover:border-[#f3c769]/45 hover:text-[#f3c769]"
                              >
                                <span aria-hidden="true">▤</span>
                                <span className="min-w-0 truncate">{source.name}</span>
                                <span className="ml-auto" aria-hidden="true">↗</span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-[#f6eedd]/75">
                                <span aria-hidden="true">▤</span>
                                <span>
                                  <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">{copy.sourceDocument}</span>
                                  {source.name}
                                </span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-white/45">{copy.noSources}</p>
                    )}
                  </div>
                </article>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-[#c79a44]/25 bg-[#102f31] p-6">
              <h2 className="text-lg font-black">{copy.compareTitle}</h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-[#d16850]/20 bg-[#4b211d]/25 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f3a58e]">{copy.generalLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{copy.generalBody}</p>
                </div>
                <div className="rounded-2xl border border-[#79d8bd]/25 bg-[#1d5d52]/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9ce4bd]">{copy.ragLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">{copy.ragBody}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#0b2325] p-6">
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
                {[copy.flowQuestion, copy.flowRetrieve, copy.flowAnswer].map((label, index) => (
                  <div key={label} className="contents">
                    <div>
                      <span className="mx-auto grid size-10 place-items-center rounded-full border border-[#f3c769]/25 bg-[#f3c769]/5 text-sm font-black text-[#f3c769]">
                        {index + 1}
                      </span>
                      <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-white/45">{label}</span>
                    </div>
                    {index < 2 && <span className="text-[#f3c769]/45" aria-hidden="true">→</span>}
                  </div>
                ))}
              </div>
              <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-white/40">
                {copy.privateNote}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
