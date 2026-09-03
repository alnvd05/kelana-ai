import { apiRequest } from "@/lib/apiClient";
import type {
  Conversation,
  ConversationMessage,
  CreatedConversation,
  MessageExchange,
} from "@/types/conversation";

export function listConversations(): Promise<Conversation[]> {
  return apiRequest<Conversation[]>("/conversations");
}

export function createConversation(title?: string): Promise<CreatedConversation> {
  return apiRequest<CreatedConversation>("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(title ? { title } : {}),
  });
}

export function listConversationMessages(
  conversationId: number,
): Promise<ConversationMessage[]> {
  return apiRequest<ConversationMessage[]>(
    `/conversations/${conversationId}/messages`,
  );
}

export function sendConversationMessage(
  conversationId: number,
  content: string,
): Promise<MessageExchange> {
  return apiRequest<MessageExchange>(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
}

export function renameConversation(
  conversationId: number,
  title: string,
): Promise<Conversation> {
  return apiRequest<Conversation>(`/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}
