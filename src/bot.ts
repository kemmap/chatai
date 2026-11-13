import { Bot, Context, InputFile } from 'grammy';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfig } from './config.js';
import { IAIService, AIMode } from './ai/types.js';
import { GeminiAIService } from './ai/gemini.js';
import { MockAIService } from './ai/mock.js';
import { splitMessage } from './utils/message-splitter.js';
import { safeReply, formatSources } from './utils/telegram-sender.js';
import { formatTelegramMath } from './utils/math-formatter.js';

export type BotOptions = ConstructorParameters<typeof Bot<Context>>[1];

/**
 * Extracts optional AI mode directives (/swarm, /browse, /boost) from user text.
 * Supports prefixes like "/swarm câu hỏi" and trailing tags like "câu hỏi /swarm".
 */
export function parseDirective(text: string): {
  prompt: string;
  mode?: AIMode;
} {
  const trimmed = text.trim();

  // Trailing tag: "câu hỏi /swarm"
  const endPattern = /\s+\/(swarm|browse|boost)$/i;
  const matchEnd = trimmed.match(endPattern);
  if (matchEnd) {
    const mode = matchEnd[1].toLowerCase() as AIMode;
    const cleanPrompt = trimmed.replace(endPattern, '').trim();
    return { prompt: cleanPrompt, mode };
  }

  // Leading tag: "/swarm câu hỏi"
  const startPattern = /^\/(swarm|browse|boost)(?:@\w+)?(?:\s+(.*))?$/is;
  const matchStart = trimmed.match(startPattern);
  if (matchStart) {
    const mode = matchStart[1].toLowerCase() as AIMode;
    const cleanPrompt = (matchStart[2] || '').trim();
    return { prompt: cleanPrompt, mode };
  }

  return { prompt: trimmed };
}

export function createBot(
  config: AppConfig,
  customAiService?: IAIService,
  options?: BotOptions
): Bot<Context> {
  const token = config.telegramBotToken || 'MOCK_TOKEN_PLACEHOLDER';
  const bot = new Bot(token, options);

  // Initialize AI service
  let aiService: IAIService;
  if (customAiService) {
    aiService = customAiService;
  } else if (config.isMockMode || !config.geminiApiKey) {
    console.warn('⚠️ Khởi động ở chế độ MOCK AI (Không gọi trực tiếp Gemini API do thiếu GEMINI_API_KEY).');
    aiService = new MockAIService(config.maxHistoryTurns);
  } else {
    aiService = new GeminiAIService({
      apiKey: config.geminiApiKey,
      model: config.aiModel,
      enableSearch: config.enableSearch,
      maxHistoryTurns: config.maxHistoryTurns,
      systemInstruction: config.systemInstruction,
    });
  }

  const startTime = Date.now();

  // Helper to handle AI query with typing indicator
  async function processUserPrompt(
    ctx: Context,
    prompt: string,
    options?: {
      mode?: AIMode;
      enableSearch?: boolean;
      customInstructionPrefix?: string;
    }
  ) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    let typingInterval: NodeJS.Timeout | null = null;

    try {
      // Send initial typing action
      await ctx.replyWithChatAction('typing').catch(() => {});

      // Keep typing action active for longer generations
      typingInterval = setInterval(() => {
        ctx.replyWithChatAction('typing').catch(() => {});
      }, 4000);
      typingInterval.unref?.();

      const result = await aiService.generateResponse(chatId, prompt, options);

      let fullResponse = formatTelegramMath(result.text);
      if (result.sources && result.sources.length > 0) {
        fullResponse += formatSources(result.sources);
      }

      // Split into safe chunks <= 4000 chars
      const chunks = splitMessage(fullResponse);

      for (let i = 0; i < chunks.length; i++) {
        await safeReply(ctx, chunks[i], {
          replyToMessageId: i === 0 ? ctx.message?.message_id : undefined,
        });
      }
    } catch (error: any) {
      console.error('[bot] Lỗi xử lý yêu cầu:', error);
      const userFriendlyError =
        error?.message ||
        'Đã có sự cố xảy ra khi giao tiếp với AI. Vui lòng thử lại sau giây lát hoặc dùng /clear để bắt đầu lại.';
      await safeReply(ctx, `⚠️ *Thông báo:* ${userFriendlyError}`);
    } finally {
      if (typingInterval) {
        clearInterval(typingInterval);
      }
    }
  }

  // Command: /start
  bot.command('start', async (ctx) => {
    const welcome = `👋 *Xin chào! Tôi là AI Assistant Bot.*

Tôi là trợ lý AI thông minh trên Telegram, được tích hợp mô hình Gemini tiên tiến với tính năng tìm kiếm thời gian thực (Google Search Grounding) và cơ chế phản biện đa tác tử Swarm để trả lời mọi câu hỏi của bạn một cách *chính xác, logic và đầy đủ nhất*.

💡 *Cách sử dụng:*
• *Hỏi đáp tự nhiên:* Chỉ cần gõ và gửi câu hỏi của bạn, tôi sẽ trả lời ngay!
• Tôi có ghi nhớ ngữ cảnh cuộc trò chuyện, bạn có thể hỏi tiếp nối các câu hỏi trước.

🛠 *Các chế độ thông minh đặc biệt:*
• \`/swarm <nội dung>\` - 🐝 *Hội đồng AI đa tác tử:* Huy động 3 AI (Khảo cứu 🔬, Phản biện ⚖️, Đồng thuận 🎯) cùng kiểm chứng đa chiều, triệt tiêu ảo giác để đưa ra kết quả chính xác nhất.
• \`/browse <nội dung>\` - 🔍 *Tra cứu thời gian thực:* Tra cứu trực tiếp Google Search cho tin tức, thời tiết, giá cả và trích dẫn nguồn uy tín.
• \`/boost <nội dung>\` - ⚡ *Suy luận chuyên sâu:* Phân tích logic từng bước (Chain-of-Thought) cho các bài toán hóc búa, kỹ thuật.

⚙️ *Lệnh hệ thống:*
• \`/download\` - 📦 Tải toàn bộ file mã nguồn bot (.zip) trực tiếp về điện thoại.
• \`/clear\` hoặc \`/reset\` - Xóa lịch sử trò chuyện và bắt đầu chủ đề mới.
• \`/status\` - Kiểm tra trạng thái hoạt động của bot.
• \`/help\` - Xem lại hướng dẫn chi tiết.

Bạn muốn hỏi tôi điều gì hôm nay? 😊`;

    await safeReply(ctx, welcome);
  });

  // Command: /help
  bot.command('help', async (ctx) => {
    const helpText = `📖 *HƯỚNG DẪN SỬ DỤNG AI BOT*

1️⃣ *Trò chuyện thông thường:*
Nhắn bất kỳ câu hỏi nào trong khung chat. Bot hỗ trợ đa dạng lĩnh vực: lập trình, toán học, viết lách, dịch thuật, khoa học, đời sống,...

2️⃣ *Hội đồng AI Đồng thuận (\`/swarm\`):*
Huy động 3 tác tử độc lập cùng phân tích và phản biện:
• \`/swarm So sánh chi tiết ưu nhược điểm giữa Monolith và Microservices\`
• \`/swarm Đánh giá độ tin cậy và ứng dụng thực tiễn của máy tính lượng tử\`
Hội đồng sẽ kiểm chứng chéo các luận điểm nhằm đảm bảo câu trả lời luôn *chuẩn xác và khách quan nhất*.

3️⃣ *Tra cứu thời gian thực (\`/browse\`):*
Ví dụ:
• \`/browse Tin tức công nghệ mới nhất hôm nay\`
• \`/browse Giá vàng và tỷ giá ngoại tệ hiện tại\`
Bot sẽ tra cứu Google Search và trích dẫn đường link nguồn tham khảo minh bạch.

4️⃣ *Suy luận chuyên sâu (\`/boost\`):*
Ví dụ:
• \`/boost Giải thích cơ chế bảo mật của HTTPS và TLS handshake\`
• \`/boost Chứng minh định lý bất toàn của Gödel\`
Bot kích hoạt tư duy từng bước (Chain-of-Thought) kiểm tra chặt chẽ các tiền đề.

5️⃣ *Quản lý bộ nhớ cuộc hội thoại:*
• \`/clear\` hoặc \`/reset\`: Xóa sạch trí nhớ các tin nhắn trước để bắt đầu câu chuyện mới hoàn toàn.
• \`/status\`: Xem số lượt hội thoại hiện đang được lưu trong phiên.

✨ *Mẹo nhỏ:* Bạn có thể thêm tag \`/swarm\`, \`/browse\`, hoặc \`/boost\` ở cuối bất kỳ câu hỏi nào để kích hoạt chế độ tương ứng!`;

    await safeReply(ctx, helpText);
  });

  // Command: /clear and /reset
  const handleClear = async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (chatId) {
      aiService.clearHistory(chatId);
      await safeReply(
        ctx,
        '🧹 *Đã làm mới lịch sử cuộc trò chuyện!*\nBộ nhớ hội thoại của bạn đã được xóa sạch. Hãy đặt câu hỏi mới nhé!'
      );
    }
  };
  bot.command('clear', handleClear);
  bot.command('reset', handleClear);

  // Command: /status
  bot.command('status', async (ctx) => {
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const secs = uptimeSec % 60;
    const uptimeStr = `${hours}h ${mins}m ${secs}s`;

    const chatId = ctx.chat?.id || 0;
    const turns = aiService.getHistoryCount(chatId);

    const statusMsg = `📊 *TRẠNG THÁI HỆ THỐNG AI BOT*

• *Thời gian hoạt động:* ${uptimeStr}
• *Mô hình AI:* \`${config.aiModel}\`
• *Tìm kiếm thời gian thực (Search Grounding):* ${config.enableSearch ? 'Bật ✅' : 'Tắt ❌'}
• *Chế độ hỗ trợ:* \`/swarm\` (Đồng thuận 🐝), \`/browse\` (Tra cứu 🔍), \`/boost\` (Suy luận ⚡)
• *Lượt hội thoại đã lưu trong chat này:* ${turns} / ${config.maxHistoryTurns}
• *Chế độ:* ${config.isMockMode || !config.geminiApiKey ? 'MOCK / DEMO' : 'LIVE GEMINI'}

Hệ thống đang hoạt động ổn định và sẵn sàng tiếp nhận câu hỏi!`;

    await safeReply(ctx, statusMsg);
  });

  // Command: /download or /zip (Send source code zip directly to user's Telegram)
  bot.command(['download', 'zip', 'source'], async (ctx) => {
    const zipPath = path.resolve(process.cwd(), 'telegram-ai-bot.zip');
    if (!fs.existsSync(zipPath)) {
      await safeReply(
        ctx,
        '⚠️ Chưa tìm thấy file `telegram-ai-bot.zip`. Vui lòng tạo lại file nén trên máy tính.'
      );
      return;
    }

    try {
      await ctx.replyWithChatAction('upload_document');
      await ctx.replyWithDocument(new InputFile(zipPath, 'telegram-ai-bot.zip'), {
        caption: `📦 *Toàn bộ mã nguồn Bot Telegram AI (Google Gemini)*\n\n• Đã bao gồm: Thư mục \`src/\`, file \`Dockerfile\`, \`package.json\`, \`start.bat\`, \`README.md\`.\n• Bạn có thể tải file này trực tiếp về điện thoại để lưu trữ hoặc upload lên GitHub / Render / VPS bất cứ lúc nào!`,
        parse_mode: 'Markdown',
      });
    } catch (err: any) {
      console.error('[bot] Lỗi gửi file zip:', err);
      await safeReply(ctx, `⚠️ Lỗi gửi file: ${err?.message || err}`);
    }
  });

  // Command: /swarm <query>
  bot.command('swarm', async (ctx) => {
    const query = ctx.match?.trim();
    if (!query) {
      await safeReply(
        ctx,
        `🐝 *CHẾ ĐỘ SWARM (HỘI ĐỒNG AI ĐỒNG THUẬN)*

Hội đồng đa tác tử độc lập (Khảo cứu 🔬, Phản biện ⚖️, Đồng thuận 🎯) sẽ cùng phân tích, phản biện và đưa ra câu trả lời chuẩn xác nhất, loại bỏ hoàn toàn ảo giác.

💡 *Cách sử dụng:*
Gõ lệnh kèm câu hỏi:
• \`/swarm So sánh chi tiết ưu nhược điểm giữa Monolith và Microservices\`
• \`/swarm Đánh giá độ tin cậy và khả năng ứng dụng của thuật toán Raft Consensus\`

✨ *Mẹo:* Bạn cũng có thể gửi câu hỏi và thêm \`/swarm\` ở cuối tin nhắn!`
      );
      return;
    }

    await processUserPrompt(ctx, query, {
      mode: 'swarm',
      enableSearch: true,
      customInstructionPrefix:
        'Chế độ SWARM MULTI-AGENT CONSENSUS: Bạn đóng vai trò là một Hội đồng AI gồm 3 tác tử chuyên biệt: 1) Khảo cứu & Thu thập dữ liệu thực tế (Researcher), 2) Phản biện độc lập & Kiểm chứng logic (Critic), 3) Tổng hợp đồng thuận tối cao (Synthesizer). Phải phân tích đa chiều, loại bỏ mọi ảo giác và đưa ra câu trả lời chuẩn xác nhất.',
    });
  });

  // Command: /browse <query>
  bot.command('browse', async (ctx) => {
    const query = ctx.match?.trim();
    if (!query) {
      await safeReply(
        ctx,
        `🔍 *CHẾ ĐỘ BROWSE (TRA CỨU WEB THỜI GIAN THỰC)*

Tra cứu dữ liệu mới nhất trên Internet qua Google Search và trích dẫn nguồn uy tín.

💡 Vui lòng nhập nội dung cần tìm kiếm sau lệnh.
Ví dụ:
• \`/browse Tin tức công nghệ AI mới nhất hôm nay\`
• \`/browse Tỷ giá ngoại tệ và giá vàng hôm nay\`

✨ *Mẹo:* Bạn cũng có thể gửi câu hỏi và thêm \`/browse\` ở cuối tin nhắn!`
      );
      return;
    }

    await processUserPrompt(ctx, query, {
      mode: 'browse',
      enableSearch: true,
      customInstructionPrefix:
        'Chế độ BROWSE: Người dùng yêu cầu tra cứu thông tin web thời gian thực. Hãy sử dụng công cụ tìm kiếm để đưa ra thông tin mới nhất, chính xác và có trích dẫn nguồn rõ ràng.',
    });
  });

  // Command: /boost <query>
  bot.command('boost', async (ctx) => {
    const query = ctx.match?.trim();
    if (!query) {
      await safeReply(
        ctx,
        `⚡ *CHẾ ĐỘ BOOST (SUY LUẬN SÂU & KIỂM CHỨNG TỪNG BƯỚC)*

Kích hoạt tư duy phân tích từng bước (Chain-of-Thought), kiểm tra chặt chẽ tính nhất quán và loại bỏ các lỗi suy luận logic.

💡 Vui lòng nhập câu hỏi sau lệnh.
Ví dụ:
• \`/boost Giải thích cơ chế đồng thuận Proof of Stake và Proof of Work\`
• \`/boost Chứng minh định lý bất toàn của Gödel một cách trực quan\`

✨ *Mẹo:* Bạn cũng có thể gửi câu hỏi và thêm \`/boost\` ở cuối tin nhắn!`
      );
      return;
    }

    await processUserPrompt(ctx, query, {
      mode: 'boost',
      enableSearch: true,
      customInstructionPrefix:
        'Chế độ BOOST: Yêu cầu phân tích sâu, suy luận logic từng bước (step-by-step reasoning), kiểm tra kỹ lưỡng các tiên đề và đảm bảo độ chính xác cao nhất.',
    });
  });

  // General text message handler
  bot.on('message:text', async (ctx) => {
    const rawText = ctx.message.text.trim();

    // Handle unrecognized slash commands gracefully
    if (rawText.startsWith('/')) {
      const match = rawText.match(/^\/([a-zA-Z0-9_]+)/);
      const cmdName = match ? match[1].toLowerCase() : '';
      const knownCommands = ['start', 'help', 'swarm', 'browse', 'boost', 'clear', 'reset', 'status'];

      if (!knownCommands.includes(cmdName)) {
        await safeReply(
          ctx,
          `⚠️ Lệnh \`/${cmdName}\` không tồn tại.\n\n💡 Bạn có thể dùng các lệnh:\n• \`/swarm <câu hỏi>\` - Hội đồng AI đồng thuận 🐝\n• \`/browse <nội dung>\` - Tra cứu web thời gian thực 🔍\n• \`/boost <câu hỏi>\` - Suy luận chuyên sâu ⚡\n• \`/clear\` - Làm mới hội thoại 🧹\n• \`/status\` - Kiểm tra hệ thống 📊\n• \`/help\` - Hướng dẫn chi tiết 📖`
        );
        return;
      }
    }

    // Parse directive if user appended or prepended /swarm, /browse, /boost
    const { prompt, mode } = parseDirective(rawText);

    if (mode && !prompt) {
      // User only typed the tag like "/swarm" or "/browse" as normal text
      if (mode === 'swarm') {
        await safeReply(
          ctx,
          '🐝 *Chế độ Swarm:* Vui lòng gửi kèm câu hỏi sau lệnh, ví dụ: `/swarm So sánh kiến trúc Microservices và Monolith`'
        );
      } else if (mode === 'browse') {
        await safeReply(
          ctx,
          '🔍 *Chế độ Browse:* Vui lòng gửi kèm nội dung tìm kiếm, ví dụ: `/browse Giá vàng hôm nay`'
        );
      } else if (mode === 'boost') {
        await safeReply(
          ctx,
          '⚡ *Chế độ Boost:* Vui lòng gửi kèm câu hỏi, ví dụ: `/boost Giải thích cơ chế HTTPS`'
        );
      }
      return;
    }

    const effectivePrompt = prompt || rawText;

    if (mode === 'swarm') {
      await processUserPrompt(ctx, effectivePrompt, {
        mode: 'swarm',
        enableSearch: true,
        customInstructionPrefix:
          'Chế độ SWARM MULTI-AGENT CONSENSUS: Bạn đóng vai trò là một Hội đồng AI gồm 3 tác tử chuyên biệt: 1) Khảo cứu & Thu thập dữ liệu thực tế (Researcher), 2) Phản biện độc lập & Kiểm chứng logic (Critic), 3) Tổng hợp đồng thuận tối cao (Synthesizer). Phải phân tích đa chiều, loại bỏ mọi ảo giác và đưa ra câu trả lời chuẩn xác nhất.',
      });
    } else if (mode === 'browse') {
      await processUserPrompt(ctx, effectivePrompt, {
        mode: 'browse',
        enableSearch: true,
        customInstructionPrefix:
          'Chế độ BROWSE: Người dùng yêu cầu tra cứu thông tin web thời gian thực. Hãy sử dụng công cụ tìm kiếm để đưa ra thông tin mới nhất, chính xác và có trích dẫn nguồn rõ ràng.',
      });
    } else if (mode === 'boost') {
      await processUserPrompt(ctx, effectivePrompt, {
        mode: 'boost',
        enableSearch: true,
        customInstructionPrefix:
          'Chế độ BOOST: Yêu cầu phân tích sâu, suy luận logic từng bước (step-by-step reasoning), kiểm tra kỹ lưỡng các tiên đề và đảm bảo độ chính xác cao nhất.',
      });
    } else {
      await processUserPrompt(ctx, effectivePrompt);
    }
  });

  // Global error handler
  bot.catch((err) => {
    console.error(`[bot.catch] Lỗi từ bot update ${err.ctx.update.update_id}:`, err.error);
  });

  return bot;
}
