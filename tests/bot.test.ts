import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBot, parseDirective } from '../src/bot.js';
import { MockAIService } from '../src/ai/mock.js';
import { AppConfig } from '../src/config.js';
import { Update } from 'grammy/types';

describe('Telegram Bot Updates & Commands', () => {
  const testConfig: AppConfig = {
    telegramBotToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    geminiApiKey: 'test_key',
    aiModel: 'gemini-3.8-flash',
    enableSearch: true,
    maxHistoryTurns: 5,
    systemInstruction: 'Test instructions',
    isMockMode: true,
  };

  function createTestBot() {
    const mockAi = new MockAIService(5);
    const mockBotInfo = {
      id: 12345678,
      is_bot: true,
      first_name: 'TestBot',
      username: 'TestBot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    };
    const bot = createBot(testConfig, mockAi, { botInfo: mockBotInfo });

    const sentMessages: Array<{ text: string; parse_mode?: string }> = [];
    const chatActions: string[] = [];

    // Mock bot's internal API client calls
    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        sentMessages.push({
          text: (payload as any).text,
          parse_mode: (payload as any).parse_mode,
        });
        return { ok: true, result: { message_id: sentMessages.length } } as any;
      }
      if (method === 'sendChatAction') {
        chatActions.push((payload as any).action);
        return { ok: true, result: true } as any;
      }
      return prev(method, payload, signal);
    });

    return { bot, mockAi, sentMessages, chatActions };
  }

  function makeMessageUpdate(text: string, chatId: number = 1001, messageId: number = 1): Update {
    const isCommand = text.startsWith('/');
    const cmdWord = isCommand ? text.split(/\s+/)[0] : '';
    const entities = isCommand
      ? [
          {
            type: 'bot_command' as const,
            offset: 0,
            length: cmdWord.length,
          },
        ]
      : undefined;

    return {
      update_id: Date.now(),
      message: {
        message_id: messageId,
        date: Math.floor(Date.now() / 1000),
        chat: {
          id: chatId,
          type: 'private',
          first_name: 'Tester',
        },
        from: {
          id: chatId,
          is_bot: false,
          first_name: 'Tester',
        },
        text,
        entities,
      },
    };
  }

  describe('parseDirective helper', () => {
    it('detects trailing /swarm tag', () => {
      const res = parseDirective('So sánh Monolith vs Microservices /swarm');
      assert.equal(res.mode, 'swarm');
      assert.equal(res.prompt, 'So sánh Monolith vs Microservices');
    });

    it('detects trailing /browse tag', () => {
      const res = parseDirective('Thời tiết Hà Nội hôm nay /browse');
      assert.equal(res.mode, 'browse');
      assert.equal(res.prompt, 'Thời tiết Hà Nội hôm nay');
    });

    it('detects trailing /boost tag', () => {
      const res = parseDirective('Giải thích thuật toán Dijkstra /boost');
      assert.equal(res.mode, 'boost');
      assert.equal(res.prompt, 'Giải thích thuật toán Dijkstra');
    });

    it('returns undefined mode for normal text without directive', () => {
      const res = parseDirective('Xin chào bạn!');
      assert.equal(res.mode, undefined);
      assert.equal(res.prompt, 'Xin chào bạn!');
    });
  });

  it('handles /start command with /swarm, /browse, /boost documented', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/start'));

    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes('AI Assistant Bot'));
    assert.ok(sentMessages[0].text.includes('/swarm'));
    assert.ok(sentMessages[0].text.includes('/browse'));
    assert.ok(sentMessages[0].text.includes('/boost'));
  });

  it('handles /help command with all modes documented', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/help'));

    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes('HƯỚNG DẪN SỬ DỤNG'));
    assert.ok(sentMessages[0].text.includes('/swarm'));
    assert.ok(sentMessages[0].text.includes('/browse'));
    assert.ok(sentMessages[0].text.includes('/boost'));
  });

  it('handles /status command with turn count and current model', async () => {
    const { bot, sentMessages } = createTestBot();

    // Perform a message first so turns > 0
    await bot.handleUpdate(makeMessageUpdate('Chào bot!'));
    await bot.handleUpdate(makeMessageUpdate('/status'));

    const lastMsg = sentMessages[sentMessages.length - 1];
    assert.ok(lastMsg.text.includes('TRẠNG THÁI HỆ THỐNG'));
    assert.ok(lastMsg.text.includes('gemini-3.8-flash'));
    assert.ok(lastMsg.text.includes('/swarm'));
    assert.ok(lastMsg.text.includes('Lượt hội thoại đã lưu'));
  });

  it('handles /clear and /reset commands', async () => {
    const { bot, mockAi, sentMessages } = createTestBot();

    await bot.handleUpdate(makeMessageUpdate('Câu hỏi 1'));
    assert.equal(mockAi.getHistoryCount(1001), 1);

    await bot.handleUpdate(makeMessageUpdate('/clear'));
    assert.equal(mockAi.getHistoryCount(1001), 0);
    assert.ok(sentMessages[sentMessages.length - 1].text.includes('Đã làm mới lịch sử'));
  });

  it('handles /swarm without arguments', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/swarm'));

    assert.ok(sentMessages[0].text.includes('CHẾ ĐỘ SWARM'));
    assert.ok(sentMessages[0].text.includes('HỘI ĐỒNG AI ĐỒNG THUẬN'));
    assert.ok(sentMessages[0].text.includes('Cách sử dụng'));
  });

  it('handles /swarm with query and executes multi-agent consensus', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/swarm Đánh giá kiến trúc Clean Architecture'));

    assert.equal(sentMessages.length, 1);
    const reply = sentMessages[0].text;
    assert.ok(reply.includes('SWARM CONSENSUS'));
    assert.ok(reply.includes('Khảo cứu & Cơ sở thực tế'));
    assert.ok(reply.includes('Phản biện & Kiểm chứng logic'));
    assert.ok(reply.includes('Kết luận đồng thuận'));
    assert.ok(reply.includes('Clean Architecture'));
  });

  it('handles /browse without arguments', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/browse'));

    assert.ok(sentMessages[0].text.includes('CHẾ ĐỘ BROWSE'));
    assert.ok(sentMessages[0].text.includes('Vui lòng nhập nội dung cần tìm kiếm'));
  });

  it('handles /browse with search query', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/browse thời tiết hôm nay'));

    const reply = sentMessages[0].text;
    assert.ok(reply.includes('thời tiết hôm nay'));
    assert.ok(reply.includes('Nguồn tra cứu tham khảo'));
  });

  it('handles /boost without arguments', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/boost'));

    assert.ok(sentMessages[0].text.includes('CHẾ ĐỘ BOOST'));
    assert.ok(sentMessages[0].text.includes('Vui lòng nhập câu hỏi'));
  });

  it('handles /boost with query and deep reasoning', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/boost Giải thích lượng tử'));

    const reply = sentMessages[0].text;
    assert.ok(reply.includes('CHẾ ĐỘ BOOST'));
    assert.ok(reply.includes('Giải thích lượng tử'));
  });

  it('handles trailing /swarm tag in natural messages', async () => {
    const { bot, sentMessages } = createTestBot();
    // Non-command message with trailing /swarm
    await bot.handleUpdate(makeMessageUpdate('Nên chọn Rust hay Go cho backend? /swarm'));

    assert.equal(sentMessages.length, 1);
    const reply = sentMessages[0].text;
    assert.ok(reply.includes('SWARM CONSENSUS'));
    assert.ok(reply.includes('Rust hay Go'));
  });

  it('handles trailing /browse tag in natural messages', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('Giá xăng dầu thế giới mới nhất /browse'));

    assert.equal(sentMessages.length, 1);
    const reply = sentMessages[0].text;
    assert.ok(reply.includes('TRA CỨU WEB'));
    assert.ok(reply.includes('Giá xăng dầu'));
  });

  it('handles trailing /boost tag in natural messages', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('Chứng minh căn bậc hai của 2 là số vô tỉ /boost'));

    assert.equal(sentMessages.length, 1);
    const reply = sentMessages[0].text;
    assert.ok(reply.includes('CHẾ ĐỘ BOOST'));
    assert.ok(reply.includes('căn bậc hai'));
  });

  it('handles unrecognized slash commands politely with guidance', async () => {
    const { bot, sentMessages } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('/unknowncommand'));

    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes('Lệnh `/unknowncommand` không tồn tại'));
    assert.ok(sentMessages[0].text.includes('/swarm'));
    assert.ok(sentMessages[0].text.includes('/help'));
  });

  it('answers general user questions with typing action', async () => {
    const { bot, sentMessages, chatActions } = createTestBot();
    await bot.handleUpdate(makeMessageUpdate('Hôm nay ăn gì ngon?'));

    assert.ok(chatActions.includes('typing'), 'Should trigger typing chat action');
    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes('Hôm nay ăn gì ngon?'));
  });
});
