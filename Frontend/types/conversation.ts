export type Conversation = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type CreatedConversation = {
  conversation_id: number;
  title: string;
  created_at: string;
};

export type ConversationMessage = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type MessageExchange = {
  conversation_id: number;
  conversation_title: string;
  user_message: ConversationMessage;
  assistant_message: ConversationMessage;
};
