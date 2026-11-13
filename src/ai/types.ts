export type AIMode = 'standard' | 'browse' | 'boost' | 'swarm';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface GroundingSource {
  title?: string;
  uri: string;
}

export interface AIServiceResponse {
  text: string;
  sources?: GroundingSource[];
  searchQueries?: string[];
  mode?: AIMode;
  usage?: {
    promptTokens?: number;
    responseTokens?: number;
    totalTokens?: number;
  };
}

export interface AIServiceOptions {
  mode?: AIMode;
  enableSearch?: boolean;
  temperature?: number;
  customInstructionPrefix?: string;
}

export interface IAIService {
  generateResponse(
    chatId: string | number,
    userMessage: string,
    options?: AIServiceOptions
  ): Promise<AIServiceResponse>;
  clearHistory(chatId: string | number): void;
  getHistory(chatId: string | number): ChatMessage[];
  getHistoryCount(chatId: string | number): number;
}
