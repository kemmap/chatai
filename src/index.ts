import { loadConfig } from './config.js';
import { createBot } from './bot.js';

async function main() {
  console.log('------------------------------------------------------------');
  console.log('🤖 TELEGRAM AI BOT - POWERED BY GOOGLE GEMINI');
  console.log('------------------------------------------------------------');

  const config = loadConfig();

  if (!config.telegramBotToken || config.telegramBotToken === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    console.error(`
❌ LỖI: Chưa cấu hình TELEGRAM_BOT_TOKEN!

👉 Để bot hoạt động trên Telegram:
1. Mở ứng dụng Telegram, tìm và chat với @BotFather (https://t.me/BotFather)
2. Gửi lệnh /newbot và làm theo hướng dẫn để đặt tên bot
3. Copy API Token mà BotFather cấp (dạng 123456789:ABCdefGhI...)
4. Mở file .env (hoặc copy từ .env.example) và dán token vào:
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhI...
5. Lấy GEMINI_API_KEY miễn phí tại: https://aistudio.google.com/app/apikey
   và điền vào file .env:
   GEMINI_API_KEY=AIzaSy...
6. Chạy lại lệnh: npm start

------------------------------------------------------------
💡 Gợi ý thử nghiệm offline/test mà không cần token thật:
   Đặt MOCK_MODE=true trong .env và điền TELEGRAM_BOT_TOKEN bất kỳ.
   Hoặc chạy bộ kiểm thử tự động: npm test
------------------------------------------------------------
`);
    process.exit(1);
  }

  const bot = createBot(config);

  console.log(`⚙️ Cấu hình:`);
  console.log(`   - AI Model: ${config.aiModel}`);
  console.log(`   - Web Search Grounding: ${config.enableSearch ? 'Bật ✅' : 'Tắt ❌'}`);
  console.log(`   - Max History Turns: ${config.maxHistoryTurns}`);
  console.log(`   - Chế độ: ${config.isMockMode || !config.geminiApiKey ? 'MOCK AI (Thử nghiệm)' : 'LIVE GEMINI AI'}`);
  console.log('⏳ Đang kết nối tới Telegram...');

  try {
    const botInfo = await bot.api.getMe();
    console.log(`✅ Kết nối thành công!`);
    console.log(`🤖 Bot Username: @${botInfo.username} (ID: ${botInfo.id})`);

    // Register Telegram commands for autocomplete menu
    try {
      await bot.api.setMyCommands([
        { command: 'start', description: 'Bắt đầu cuộc trò chuyện với AI' },
        { command: 'swarm', description: '🐝 Hội đồng AI đa tác tử đồng thuận chuẩn xác' },
        { command: 'browse', description: '🔍 Tra cứu web thời gian thực & trích dẫn nguồn' },
        { command: 'boost', description: '⚡ Suy luận sâu Chain-of-Thought từng bước' },
        { command: 'download', description: '📦 Tải toàn bộ mã nguồn bot về điện thoại (.zip)' },
        { command: 'clear', description: '🧹 Xóa lịch sử và làm mới cuộc hội thoại' },
        { command: 'status', description: '📊 Kiểm tra trạng thái hoạt động của bot' },
        { command: 'help', description: '📖 Hướng dẫn chi tiết sử dụng bot' },
      ]);
      console.log('📋 Đã cập nhật menu lệnh (/swarm, /browse, /boost, ...) lên Telegram.');
    } catch (cmdErr: any) {
      console.warn('⚠️ Lưu ý: Không thể đồng bộ setMyCommands lên Telegram (bỏ qua nếu không có quyền):', cmdErr?.message || cmdErr);
    }

    console.log(`📡 Bot đang lắng nghe tin nhắn... (Nhấn Ctrl+C để dừng)`);

    // Graceful stop handlers
    const stopBot = async (signal: string) => {
      console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang tắt bot an toàn...`);
      bot.stop();
      process.exit(0);
    };

    process.once('SIGINT', () => stopBot('SIGINT'));
    process.once('SIGTERM', () => stopBot('SIGTERM'));

    await bot.start({
      onStart: (info) => {
        console.log(`🚀 Long-polling đã bắt đầu cho @${info.username}`);
      },
    });
  } catch (error: any) {
    console.error('❌ Lỗi khởi động Telegram Bot:', error?.message || error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi nghiêm trọng không xác định:', err);
  process.exit(1);
});
