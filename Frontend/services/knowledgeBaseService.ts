import { apiRequest } from "@/lib/apiClient";

export type KnowledgeSource = {
  name: string;
  uri: string | null;
};

export type KnowledgeBaseResponse = {
  question: string;
  answer: string;
  sources: KnowledgeSource[];
};

export function askKnowledgeBase(question: string): Promise<KnowledgeBaseResponse> {
  return apiRequest<KnowledgeBaseResponse>("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}
