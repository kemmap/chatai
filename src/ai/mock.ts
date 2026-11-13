import { IAIService, AIServiceResponse, AIServiceOptions, ChatMessage } from './types.js';
import { HistoryManager } from './history.js';

export class MockAIService implements IAIService {
  private historyManager: HistoryManager;

  constructor(maxTurns: number = 10) {
    this.historyManager = new HistoryManager(maxTurns);
  }

  public async generateResponse(
    chatId: string | number,
    userMessage: string,
    options?: AIServiceOptions
  ): Promise<AIServiceResponse> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
      throw new Error('Tin nhắn không được để trống.');
    }

    // Add user message to history
    this.historyManager.addMessage(chatId, 'user', trimmed);

    let reply = '';
    const mode = options?.mode || 'standard';

    if (mode === 'swarm') {
      reply = `🐝 *[HỘI ĐỒNG AI - SWARM CONSENSUS]*

🔬 *1. Khảo cứu & Cơ sở thực tế:*
Hội đồng đa tác tử đã tiến hành thu thập và đối chiếu các nguồn dữ liệu tin cậy liên quan đến câu hỏi: "${trimmed}". Tất cả các định nghĩa và sự kiện nền tảng đã được xác lập minh bạch.

⚖️ *2. Phản biện & Kiểm chứng logic:*
Tác tử phản biện độc lập đã rà soát kỹ lưỡng các giả thuyết, kiểm tra các trường hợp biên và không phát hiện lỗ hổng suy luận hay nguy cơ thông tin sai lệch nào.

🎯 *3. Kết luận đồng thuận chính xác nhất:*
Sau khi thảo luận và phản biện đa tầng, hội đồng AI đạt được sự đồng thuận tuyệt đối: Đây là câu trả lời chuẩn xác, toàn diện và tối ưu nhất cho "${trimmed}".`;
    } else if (mode === 'boost') {
      reply = `⚡ *[CHẾ ĐỘ BOOST - SUY LUẬN SÂU]*

🧠 *Phân tích logic từng bước (Chain-of-Thought):*
1. **Phân tích tiền đề:** Câu hỏi "${trimmed}" được bóc tách thành các luận điểm cốt lõi.
2. **Suy luận & Chứng minh:** Kiểm tra các mối liên hệ nhân quả và loại trừ các sai lầm logic phổ biến.
3. **Kết luận chặt chẽ:** Đưa ra câu trả lời đã được kiểm chứng tỉ mỉ và chính xác cao độ.`;
    } else if (mode === 'browse' || options?.enableSearch) {
      reply = `🔍 *[TRA CỨU WEB THỜI GIAN THỰC]*\n\nTôi đã tra cứu dữ liệu mới nhất trên internet về "${trimmed}". Thông tin đã được cập nhật chính xác kèm trích dẫn nguồn uy tín.`;
    } else {
      reply = `[MOCK AI] Tôi đã nhận được câu hỏi: "${trimmed}". Tôi là trợ lý AI thông minh sẵn sàng giải đáp mọi thắc mắc của bạn một cách chính xác.`;
    }

    const turnCount = this.historyManager.getTurnCount(chatId);
    if (turnCount > 1) {
      reply += `\n\n_(Lịch sử cuộc hội thoại: lượt thứ ${turnCount})_`;
    }

    // Add model response to history
    this.historyManager.addMessage(chatId, 'model', reply);

    const hasSources = mode === 'browse' || mode === 'swarm' || options?.enableSearch;

    return {
      text: reply,
      mode,
      sources: hasSources
        ? [
            {
              title: 'Cổng thông tin tra cứu mẫu',
              uri: 'https://example.com/search-result',
            },
          ]
        : undefined,
      usage: {
        promptTokens: 10,
        responseTokens: 25,
        totalTokens: 35,
      },
    };
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
