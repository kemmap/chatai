import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  telegramBotToken: string;
  geminiApiKey: string;
  aiModel: string;
  enableSearch: boolean;
  maxHistoryTurns: number;
  systemInstruction: string;
  isMockMode: boolean;
}

export function loadConfig(): AppConfig {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
  const aiModel = process.env.AI_MODEL?.trim() || 'gemini-3.8-flash';
  const enableSearch = process.env.ENABLE_SEARCH !== 'false';
  const maxHistoryTurns = parseInt(process.env.MAX_HISTORY_TURNS || '10', 10);
  const isMockMode = process.env.MOCK_MODE === 'true';

  const defaultSystemInstruction = `Bạn là một trợ lý AI thông minh, uyên bác và vô cùng chính xác trên Telegram.
Nhiệm vụ hàng đầu của bạn là:
1. Luôn trả lời một cách chuẩn xác, có căn cứ khoa học/thực tiễn, logic chặt chẽ và hữu ích nhất.
2. Trả lời bằng tiếng Việt tự nhiên, chuẩn mực, lịch sự và mạch lạc (hoặc đúng ngôn ngữ người dùng đang hỏi).
3. Khi thông tin liên quan đến tin tức mới, sự kiện thời gian thực, giá cả, hoặc kiến thức cần kiểm chứng, hãy tận dụng tính năng tìm kiếm (Google Search Grounding) để cung cấp thông tin cập nhật và chính xác nhất.
4. Trình bày câu trả lời rõ ràng, dùng bullet points, định dạng Telegram Markdown (chữ in đậm *...*, in nghiêng _..._, khối mã) để người đọc dễ theo dõi trên điện thoại.
5. Hỗ trợ 3 chế độ thông minh chuyên sâu: /swarm (Hội đồng AI đa tác tử đồng thuận), /browse (Tra cứu web thời gian thực), và /boost (Suy luận logic từng bước).
6. Tuyệt đối không bịa đặt thông tin; nếu không chắc chắn, hãy thừa nhận rõ ràng và phân tích các khả năng.
7. ĐẶC BIỆT VỀ CÔNG THỨC TOÁN & TIÊU ĐỀ TRÊN TELEGRAM:
   - Ứng dụng Telegram KHÔNG hỗ trợ mã toán học LaTeX (tuyệt đối KHÔNG dùng ký hiệu đô la $, $$, \\sqrt{}, \\frac{}{}, \\le, \\text{}).
   - Hãy luôn biểu diễn công thức toán bằng ký hiệu Unicode tự nhiên dễ đọc trên điện thoại: dùng √, ≤, ≥, ≠, ±, ², ³, ·, a/b (Ví dụ: SD = √(x² + 400)).
   - Telegram không hỗ trợ tiêu đề Markdown dạng ### hay ##, hãy dùng chữ in đậm *Tiêu đề* để làm nổi bật.`;

  const systemInstruction = process.env.SYSTEM_INSTRUCTION?.trim() || defaultSystemInstruction;

  return {
    telegramBotToken,
    geminiApiKey,
    aiModel,
    enableSearch,
    maxHistoryTurns: Number.isNaN(maxHistoryTurns) || maxHistoryTurns < 1 ? 10 : maxHistoryTurns,
    systemInstruction,
    isMockMode,
  };
}
