export type DisplayData = string | null;

export interface MessageWithAgent {
  type: "human" | "ai";
  content: string;
  id: string;
  agent?: string;
  finalReportWithCitations?: boolean;
}

export interface AgentMessage {
  parts: { text: string }[];
  role: string;
}

export interface AgentResponse {
  content: AgentMessage;
  usageMetadata: {
    candidatesTokenCount: number;
    promptTokenCount: number;
    totalTokenCount: number;
  };
  author: string;
  actions: {
    stateDelta: {
      research_plan?: string;
      final_report_with_citations?: boolean;
    };
  };
}

export interface ProcessedEvent {
  title: string;
  data: unknown;
}
