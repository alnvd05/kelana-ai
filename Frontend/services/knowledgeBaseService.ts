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

type KnowledgeBaseApiResponse = Omit<KnowledgeBaseResponse, "sources"> & {
  sources?: KnowledgeSource[];
};

export async function askKnowledgeBase(question: string): Promise<KnowledgeBaseResponse> {
  const response = await apiRequest<KnowledgeBaseApiResponse>("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  return {
    ...response,
    sources: response.sources ?? [],
  };
}
