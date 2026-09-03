"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/apiClient";
import {
  createConversation,
  listConversationMessages,
  listConversations,
  renameConversation,
  sendConversationMessage,
} from "@/services/conversationService";
import type {
  Conversation,
  ConversationMessage,
} from "@/types/conversation";

const CHAT_COPY = {
  en: {
    eyebrow: "Conversation memory",
    conversations: "Conversations",
    newConversation: "New conversation",
    emptyList: "No conversations yet",
    emptyListBody: "Start a chat and KelanaAI will remember the thread here.",
    emptyTitle: "Where should we go next?",
    emptyBody:
      "Ask for a trip plan, then continue naturally with follow-up questions. KelanaAI will keep the context.",
    examples: [
      "Plan a five-day family trip to Japan.",
      "Build a food-focused weekend in Singapore.",
      "Help me plan a quiet Bali honeymoon.",
    ],
    messagePlaceholder: "Ask KelanaAI about your next trip…",
    send: "Send",
    sending: "KelanaAI is thinking",
    loading: "Loading conversation…",
    rename: "Rename conversation",
    save: "Save",
    cancel: "Cancel",
    messageHint: "Enter to send · Shift + Enter for a new line",
    sidebarLabel: "Conversation history",
    chatLabel: "Chat messages",
    you: "You",
    kelana: "KelanaAI",
    loadError: "We could not load your conversations.",
    sendError: "KelanaAI could not answer. Your message remains saved.",
    renameError: "The conversation could not be renamed.",
  },
  id: {
    eyebrow: "Memori percakapan",
    conversations: "Percakapan",
    newConversation: "Percakapan baru",
    emptyList: "Belum ada percakapan",
    emptyListBody: "Mulai chat dan KelanaAI akan mengingat percakapannya di sini.",
    emptyTitle: "Kita akan pergi ke mana?",
    emptyBody:
      "Minta rencana perjalanan, lalu lanjutkan dengan pertanyaan berikutnya. KelanaAI akan mempertahankan konteksnya.",
    examples: [
      "Buat rencana perjalanan keluarga lima hari ke Jepang.",
      "Susun akhir pekan wisata kuliner di Singapura.",
      "Bantu saya merencanakan bulan madu yang tenang di Bali.",
    ],
    messagePlaceholder: "Tanyakan perjalanan berikutnya kepada KelanaAI…",
    send: "Kirim",
    sending: "KelanaAI sedang berpikir",
    loading: "Memuat percakapan…",
    rename: "Ubah nama percakapan",
    save: "Simpan",
    cancel: "Batal",
    messageHint: "Enter untuk mengirim · Shift + Enter untuk baris baru",
    sidebarLabel: "Riwayat percakapan",
    chatLabel: "Pesan chat",
    you: "Anda",
    kelana: "KelanaAI",
    loadError: "Percakapan Anda tidak dapat dimuat.",
    sendError: "KelanaAI belum dapat menjawab. Pesan Anda tetap tersimpan.",
    renameError: "Nama percakapan tidak dapat diubah.",
  },
} as const;

function messageError(reason: unknown, fallback: string): string {
  if (reason instanceof ApiError && reason.status >= 500) return fallback;
  return reason instanceof Error ? reason.message : fallback;
}

export default function ChatPage() {
  const { locale } = useLanguage();
  const copy = CHAT_COPY[locale];
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const loadVersion = useRef(0);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const openConversation = useCallback(
    async (conversationId: number) => {
      const version = ++loadVersion.current;
      setActiveConversationId(conversationId);
      setIsConversationLoading(true);
      setIsRenaming(false);
      setError(null);
      try {
        const nextMessages = await listConversationMessages(conversationId);
        if (loadVersion.current === version) setMessages(nextMessages);
      } catch (reason) {
        if (loadVersion.current === version) {
          setMessages([]);
          setError(messageError(reason, copy.loadError));
        }
      } finally {
        if (loadVersion.current === version) setIsConversationLoading(false);
      }
    },
    [copy.loadError],
  );

  useEffect(() => {
    let isCurrent = true;
    listConversations()
      .then((nextConversations) => {
        if (!isCurrent) return;
        setConversations(nextConversations);
        if (nextConversations[0]) void openConversation(nextConversations[0].id);
      })
      .catch((reason) => {
        if (isCurrent) setError(messageError(reason, copy.loadError));
      })
      .finally(() => {
        if (isCurrent) setIsInitialLoading(false);
      });

    return () => {
      isCurrent = false;
      loadVersion.current += 1;
    };
  }, [copy.loadError, openConversation]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isSending, messages]);

  async function handleNewConversation(): Promise<number | null> {
    if (isCreating || isSending) return null;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createConversation();
      const conversation: Conversation = {
        id: created.conversation_id,
        title: created.title,
        created_at: created.created_at,
        updated_at: created.created_at,
      };
      loadVersion.current += 1;
      setConversations((current) => [conversation, ...current]);
      setActiveConversationId(conversation.id);
      setMessages([]);
      setIsRenaming(false);
      window.requestAnimationFrame(() => composerRef.current?.focus());
      return conversation.id;
    } catch (reason) {
      setError(messageError(reason, copy.loadError));
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSend(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || isSending || isCreating) return;

    let conversationId = activeConversationId;
    if (conversationId === null) {
      conversationId = await handleNewConversation();
      if (conversationId === null) return;
    }

    const optimisticId = -Date.now();
    const optimisticMessage: ConversationMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setDraft("");
    setError(null);
    setIsSending(true);
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const exchange = await sendConversationMessage(conversationId, content);
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticId),
        exchange.user_message,
        exchange.assistant_message,
      ]);
      setConversations((current) => {
        const matched = current.find((conversation) => conversation.id === conversationId);
        if (!matched) return current;
        const updated = {
          ...matched,
          title: exchange.conversation_title,
          updated_at: exchange.assistant_message.created_at,
        };
        return [updated, ...current.filter((conversation) => conversation.id !== conversationId)];
      });
    } catch (reason) {
      setError(messageError(reason, copy.sendError));
      try {
        const storedMessages = await listConversationMessages(conversationId);
        setMessages(storedMessages);
        const refreshed = await listConversations();
        setConversations(refreshed);
      } catch {
        setMessages((current) => current.filter((message) => message.id !== optimisticId));
      }
    } finally {
      setIsSending(false);
      window.requestAnimationFrame(() => composerRef.current?.focus());
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function beginRename() {
    if (!activeConversation) return;
    setRenameDraft(activeConversation.title);
    setIsRenaming(true);
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = renameDraft.trim();
    if (!activeConversationId || !title) return;
    setError(null);
    try {
      const updated = await renameConversation(activeConversationId, title);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === updated.id ? updated : conversation,
        ),
      );
      setIsRenaming(false);
    } catch (reason) {
      setError(messageError(reason, copy.renameError));
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-[#07191b] px-4 py-5 text-[#f6eedd] sm:px-6 lg:h-[calc(100dvh-72px)] lg:px-8 lg:py-7">
      <div className="mx-auto grid w-full max-w-[1440px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b2325] shadow-[0_32px_100px_-45px_rgba(0,0,0,0.9)] lg:h-full lg:min-h-0 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside
          className="flex min-h-56 flex-col border-b border-white/10 bg-[#0e2a2c] lg:min-h-0 lg:border-b-0 lg:border-r"
          aria-label={copy.sidebarLabel}
        >
          <div className="border-b border-white/10 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#79d8bd]">
              {copy.eyebrow}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-black tracking-[-0.04em]">{copy.conversations}</h1>
              <button
                type="button"
                onClick={() => void handleNewConversation()}
                disabled={isCreating || isSending}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f3c769] text-xl font-black text-[#081a1c] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                aria-label={copy.newConversation}
                title={copy.newConversation}
              >
                {isCreating ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-[#081a1c]/25 border-t-[#081a1c]" />
                ) : (
                  "+"
                )}
              </button>
            </div>
          </div>

          <div className="max-h-64 flex-1 overflow-y-auto p-3 lg:max-h-none">
            {isInitialLoading ? (
              <div className="space-y-2 p-2" role="status">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-[#f3c769]" aria-hidden="true">
                  ◌
                </span>
                <p className="mt-3 text-sm font-black">{copy.emptyList}</p>
                <p className="mt-2 text-xs leading-5 text-white/40">{copy.emptyListBody}</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => void openConversation(conversation.id)}
                        disabled={isSending}
                        aria-current={isActive ? "page" : undefined}
                        className={`group w-full rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed ${
                          isActive
                            ? "border-[#f3c769]/35 bg-[#f3c769]/10"
                            : "border-transparent hover:border-white/10 hover:bg-white/[0.035]"
                        }`}
                      >
                        <span className={`block truncate text-sm font-bold ${isActive ? "text-[#f3c769]" : "text-[#f6eedd]/75"}`}>
                          {conversation.title}
                        </span>
                        <span className="mt-1 block text-[10px] text-white/35">
                          {dateFormatter.format(new Date(conversation.updated_at))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-[500px] min-w-0 flex-col lg:min-h-0" aria-label={copy.chatLabel}>
          <header className="flex min-h-[82px] items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            {isRenaming && activeConversation ? (
              <form onSubmit={handleRename} className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  maxLength={256}
                  autoFocus
                  aria-label={copy.rename}
                  className="min-w-0 flex-1 rounded-xl border border-[#f3c769]/40 bg-[#07191b] px-3 py-2 text-sm font-bold outline-none focus:border-[#f3c769]"
                />
                <button type="submit" disabled={!renameDraft.trim()} className="rounded-full bg-[#f3c769] px-4 py-2 text-xs font-black text-[#081a1c] disabled:opacity-40">
                  {copy.save}
                </button>
                <button type="button" onClick={() => setIsRenaming(false)} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/55 hover:text-white">
                  {copy.cancel}
                </button>
              </form>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">KelanaAI chat</p>
                  <h2 className="mt-1 truncate text-lg font-black sm:text-xl">
                    {activeConversation?.title ?? copy.newConversation}
                  </h2>
                </div>
                {activeConversation && (
                  <button
                    type="button"
                    onClick={beginRename}
                    disabled={isSending}
                    className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/55 transition hover:border-[#f3c769]/45 hover:text-[#f3c769] disabled:opacity-40"
                  >
                    <span aria-hidden="true">✎ </span>{copy.rename}
                  </button>
                )}
              </>
            )}
          </header>

          <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-7 lg:px-10" aria-live="polite">
            {isConversationLoading ? (
              <div className="grid h-full min-h-72 place-items-center" role="status">
                <div className="text-center">
                  <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-[#f3c769]/25 border-t-[#f3c769]" />
                  <p className="mt-3 text-xs text-white/40">{copy.loading}</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="grid h-full min-h-72 place-items-center py-8 text-center">
                <div className="max-w-2xl">
                  <span className="mx-auto grid size-16 place-items-center rounded-[1.4rem] border border-[#f3c769]/25 bg-[#f3c769]/5 text-2xl text-[#f3c769]" aria-hidden="true">
                    ✦
                  </span>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{copy.emptyTitle}</h2>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/45">{copy.emptyBody}</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {copy.examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => {
                          setDraft(example);
                          composerRef.current?.focus();
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-xs text-white/60 transition hover:border-[#f3c769]/40 hover:text-[#f3c769]"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ol className="mx-auto max-w-4xl space-y-6">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <li key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <article className={`max-w-[88%] sm:max-w-[76%] ${isUser ? "text-right" : "text-left"}`}>
                        <div className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/35 ${isUser ? "justify-end" : "justify-start"}`}>
                          <span>{isUser ? copy.you : copy.kelana}</span>
                          <time dateTime={message.created_at} className="font-medium normal-case tracking-normal">
                            {timeFormatter.format(new Date(message.created_at))}
                          </time>
                        </div>
                        <div className={`whitespace-pre-wrap rounded-[1.4rem] px-5 py-4 text-sm leading-7 shadow-sm sm:text-[15px] ${
                          isUser
                            ? "rounded-br-md bg-[#f3c769] text-[#081a1c]"
                            : "rounded-bl-md border border-white/10 bg-[#102f31] text-[#f6eedd]/85"
                        }`}>
                          {message.content}
                        </div>
                      </article>
                    </li>
                  );
                })}

                {isSending && (
                  <li className="flex justify-start">
                    <div className="rounded-[1.4rem] rounded-bl-md border border-white/10 bg-[#102f31] px-5 py-4" role="status">
                      <span className="sr-only">{copy.sending}</span>
                      <span className="flex gap-1.5" aria-hidden="true">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="size-2 animate-bounce rounded-full bg-[#79d8bd]"
                            style={{ animationDelay: `${dot * 120}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  </li>
                )}
                <li aria-hidden="true"><div ref={messageEndRef} /></li>
              </ol>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#0a2022] px-4 py-4 sm:px-7">
            {error && (
              <div className="mx-auto mb-3 flex max-w-4xl items-start gap-3 rounded-2xl border border-[#d16850]/35 bg-[#4b211d]/40 px-4 py-3 text-xs leading-5 text-[#f3b09f]" role="alert">
                <span className="font-black" aria-hidden="true">!</span>
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSend} className="mx-auto max-w-4xl">
              <div className="flex items-end gap-2 rounded-[1.6rem] border border-white/10 bg-[#07191b] p-2 transition focus-within:border-[#f3c769]/55 focus-within:ring-4 focus-within:ring-[#f3c769]/5">
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  maxLength={8000}
                  disabled={isSending || isCreating || isConversationLoading}
                  placeholder={copy.messagePlaceholder}
                  aria-label={copy.messagePlaceholder}
                  className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none placeholder:text-white/25 disabled:opacity-45"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending || isCreating || isConversationLoading}
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f3c769] text-lg font-black text-[#081a1c] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
                  aria-label={copy.send}
                  title={copy.send}
                >
                  <span aria-hidden="true">↑</span>
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4 px-2 text-[9px] text-white/25">
                <span>{copy.messageHint}</span>
                <span className="tabular-nums">{draft.length}/8000</span>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
