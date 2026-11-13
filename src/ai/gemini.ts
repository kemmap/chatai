import { GoogleGenAI } from '@google/genai';
import {
  IAIService,
  AIServiceResponse,
  AIServiceOptions,
  ChatMessage,
  GroundingSource,
} from './types.js';
import { HistoryManager } from './history.js';
import { searchWebLive } from '../utils/web-search.js';

export class GeminiAIService implements IAIService {
  private client: GoogleGenAI;
  private historyManager: HistoryManager;
  private model: string;
  private defaultEnableSearch: boolean;
  private baseSystemInstruction: string;

  constructor(options: {
    apiKey: string;
    model?: string;
    enableSearch?: boolean;
    maxHistoryTurns?: number;
    systemInstruction?: string;
  }) {
    if (!options.apiKey) {
      throw new Error(
        'GEMINI_API_KEY không được để trống. Hãy kiểm tra biến môi trường hoặc file .env'
      );
    }

    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model || 'gemini-3.8-flash';
    this.defaultEnableSearch = options.enableSearch ?? true;
    this.historyManager = new HistoryManager(options.maxHistoryTurns || 10);
    this.baseSystemInstruction =
      options.systemInstruction ||
      'Bạn là trợ lý AI thông minh, uyên bác và chính xác trên Telegram. Hãy trả lời câu hỏi một cách chuẩn xác, có căn cứ và logic.';
  }

  public async generateResponse(
    chatId: string | number,
    userMessage: string,
    options?: AIServiceOptions
  ): Promise<AIServiceResponse> {
    const trimmedInput = userMessage.trim();
    if (!trimmedInput) {
      throw new Error('Câu hỏi không được để trống.');
    }

    // Retrieve previous turns from history
    const previousHistory = this.historyManager.getHistory(chatId);

    // Build contents array for Gemini
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const item of previousHistory) {
      contents.push({
        role: item.role,
        parts: [{ text: item.text }],
      });
    }

    // Append the current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: trimmedInput }],
    });

    const mode = options?.mode || 'standard';

    // Configure search and temperature based on mode
    let enableSearch = options?.enableSearch ?? this.defaultEnableSearch;
    let temperature = options?.temperature ?? 0.4;
    let modeInstruction = '';

    if (mode === 'swarm') {
      enableSearch = true; // Swarm leverages live grounding for verified facts
      temperature = 0.2;  // Low temperature for maximal consensus determinism
      modeInstruction = `🐝 [CHẾ ĐỘ SWARM - HỘI ĐỒNG TÁC TỬ ĐỒNG THUẬN CAO CẤP]
Bạn là một Hội đồng AI gồm 3 tác tử chuyên biệt làm việc theo cơ chế Swarm Consensus nhằm đạt độ chính xác tối đa ("phải trả lời đúng và chính xác"):
1. 🔬 Tác tử Khảo cứu (Researcher): Thu thập các dữ liệu, sự kiện thực tế, và nền tảng kiến thức khách quan (tận dụng tra cứu web nếu cần).
2. ⚖️ Tác tử Phản biện (Critic): Soi chiếu từng giả định, kiểm tra tính hợp lý, chỉ ra các lỗ hổng logic hoặc nguy cơ sai lệch/ảo giác.
3. 🎯 Tác tử Tổng hợp & Đồng thuận (Synthesizer): Tổng hợp toàn bộ các luận điểm đã được kiểm chứng, đưa ra câu trả lời đồng thuận chuẩn xác nhất.

Cấu trúc trình bày bắt buộc trong phản hồi:
🐝 **[HỘI ĐỒNG AI - SWARM CONSENSUS]**

🔬 **1. Khảo cứu & Cơ sở thực tế**
(Trình bày các dữ liệu, thông tin nền tảng đã xác minh)

⚖️ **2. Phản biện & Kiểm chứng logic**
(Chỉ ra các trường hợp ngoại lệ, đánh giá tính chặt chẽ, loại bỏ sai lầm phổ biến)

🎯 **3. Kết luận đồng thuận chính xác nhất**
(Câu trả lời chuẩn xác, dứt khoát, logic và đầy đủ nhất cho người dùng)`;
    } else if (mode === 'boost') {
      temperature = 0.3;
      modeInstruction = `⚡ [CHẾ ĐỘ BOOST - SUY LUẬN CHUYÊN SÂU & KIỂM CHỨNG TỪNG BƯỚC]
Phân tích câu hỏi theo phương pháp Chain-of-Thought (suy luận từng bước):
1. Bóc tách bản chất vấn đề và các giả định ngầm định.
2. Suy luận logic có hệ thống, chứng minh từng kết luận bằng lập luận chặt chẽ.
3. Kiểm tra chéo (sanity check) để đảm bảo không có sai sót hoặc ảo giác trước khi đưa ra câu trả lời.`;
    } else if (mode === 'browse') {
      enableSearch = true;
      temperature = 0.3;
      modeInstruction = `🔍 [CHẾ ĐỘ BROWSE - TRA CỨU WEB THỜI GIAN THỰC]
Người dùng yêu cầu tra cứu thông tin web mới nhất. Hãy sử dụng công cụ tìm kiếm Google để tìm dữ liệu cập nhật, đối chiếu và trả lời chính xác kèm các liên kết nguồn.`;
    }

    const tools = enableSearch ? [{ googleSearch: {} }] : undefined;

    // Build dynamic real-time context
    const now = new Date();
    const currentDateStr = now.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const currentYear = now.getFullYear();

    const timeInstruction = `[THỜI GIAN HIỆN TẠI VÀ BỐI CẢNH THỰC TẾ]
- Thời điểm hiện tại: ${currentDateStr} (Năm ${currentYear}).
- Bạn đang hoạt động trong năm ${currentYear}. Hãy trả lời các câu hỏi về thời gian, ngày tháng, sự kiện, giá cả, và các sản phẩm công nghệ (ví dụ: các dòng iPhone, các sản phẩm mới) theo đúng mốc thời gian thực tế hiện tại năm ${currentYear}, không được nhầm lẫn với các năm trước đây.`;

    let systemInstruction = `${timeInstruction}\n\n${this.baseSystemInstruction}`;
    if (modeInstruction) {
      systemInstruction = `${modeInstruction}\n\n${systemInstruction}`;
    }
    if (options?.customInstructionPrefix) {
      systemInstruction = `${options.customInstructionPrefix}\n\n${systemInstruction}`;
    }

    let response: any;
    let fallbackSources: GroundingSource[] = [];

    const attemptGenerate = async (
      targetModel: string,
      targetTools?: any[],
      extraInstruction?: string
    ) => {
      const activeInstruction = extraInstruction
        ? `${extraInstruction}\n\n${systemInstruction}`
        : systemInstruction;

      return await this.client.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction: activeInstruction,
          tools: targetTools,
          temperature,
        },
      });
    };

    try {
      try {
        response = await attemptGenerate(this.model, tools);
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isQuotaOrDemand =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand');

        // Fallback 1: If search tool caused quota exhaustion (common on free tier), perform live web search and retry
        if (tools && isQuotaOrDemand) {
          console.warn(
            `[gemini] Google Search Grounding chạm hạn mức (429/quota). Đang kích hoạt Live Web Search dự phòng...`
          );

          let searchContext = '';
          try {
            const liveSearch = await searchWebLive(trimmedInput);
            if (liveSearch.summaryText) {
              searchContext = `[KẾT QUẢ TÌM KIẾM WEB THỜI GIAN THỰC]:\n${liveSearch.summaryText}\nHãy sử dụng các dữ liệu cập nhật này để trả lời câu hỏi của người dùng một cách chính xác nhất.`;
              fallbackSources = liveSearch.sources;
            }
          } catch (searchErr) {
            console.warn('[gemini] Live Web Search error:', searchErr);
          }

          try {
            response = await attemptGenerate(this.model, undefined, searchContext);
          } catch (retryErr: any) {
            if (this.model !== 'gemini-3.5-flash-lite') {
              console.warn(
                `[gemini] Model chính quá tải. Đang chuyển sang gemini-3.5-flash-lite...`
              );
              response = await attemptGenerate('gemini-3.5-flash-lite', undefined, searchContext);
            } else {
              throw retryErr;
            }
          }
        } else if (this.model !== 'gemini-3.5-flash-lite' && isQuotaOrDemand) {
          console.warn(
            `[gemini] Model ${this.model} unavailable/overloaded. Falling back to gemini-3.5-flash-lite...`
          );
          response = await attemptGenerate('gemini-3.5-flash-lite', undefined);
        } else {
          throw err;
        }
      }

      const responseText = response.text?.trim() || 'Xin lỗi, tôi không thể tạo câu trả lời cho yêu cầu này.';

      // Extract grounding sources if available
      const sources: GroundingSource[] = [];
      const searchQueries: string[] = [];

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;

      if (groundingMetadata) {
        if (groundingMetadata.webSearchQueries) {
          searchQueries.push(...groundingMetadata.webSearchQueries);
        }

        if (groundingMetadata.groundingChunks) {
          const seenUrls = new Set<string>();
          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web?.uri && !seenUrls.has(chunk.web.uri)) {
              seenUrls.add(chunk.web.uri);
              sources.push({
                title: chunk.web.title || 'Nguồn web',
                uri: chunk.web.uri,
              });
            }
          }
        }
      }

      if (sources.length === 0 && fallbackSources.length > 0) {
        sources.push(...fallbackSources);
      }

      // Record this turn in history
      this.historyManager.addMessage(chatId, 'user', trimmedInput);
      this.historyManager.addMessage(chatId, 'model', responseText);

      return {
        text: responseText,
        sources: sources.length > 0 ? sources : undefined,
        searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount,
          responseTokens: response.usageMetadata?.candidatesTokenCount,
          totalTokens: response.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error: any) {
      const msg = error?.message || String(error);

      // Enhance error message with troubleshooting suggestions
      if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('unregistered caller')) {
        throw new Error(
          'Khóa API Gemini (GEMINI_API_KEY) không hợp lệ hoặc bị vô hiệu hóa. Vui lòng kiểm tra lại khóa API tại Google AI Studio.'
        );
      } else if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        throw new Error(
          'Đã vượt quá giới hạn tần suất (Rate limit / Quota) của Gemini API. Vui lòng thử lại sau ít giây.'
        );
      } else if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        throw new Error(
          'Không thể kết nối đến máy chủ Gemini API. Vui lòng kiểm tra kết nối mạng.'
        );
      }

      throw new Error(`Lỗi gọi Gemini AI: ${msg}`);
    }
  }

  public clearHistory(chatId: string | number): void {
    this.historyManager.clearHistory(chatId);
  }

  public getHistory(chatId: string | number): ChatMessage[] {
    return this.historyManager.getHistory(chatId);
  }

  public getHistoryCount(chatId: string | number): number {
    return this.historyManager.getTurnCount(chatId);
  }
}
