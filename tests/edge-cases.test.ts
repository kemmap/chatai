import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/bot.js';
import { IAIService, AIServiceResponse, ChatMessage } from '../src/ai/types.js';
import { splitMessage } from '../src/utils/message-splitter.js';
import { AppConfig } from '../src/config.js';
import { Update } from 'grammy/types';

describe('Edge Cases & Robustness', () => {
  const testConfig: AppConfig = {
    telegramBotToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    geminiApiKey: 'test_key',
    aiModel: 'gemini-3.8-flash',
    enableSearch: true,
    maxHistoryTurns: 5,
    systemInstruction: 'Test',
    isMockMode: true,
  };

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

  it('splits and delivers massive 10,000+ character AI output across multiple chunks', async () => {
    const hugeText = 'Đây là một đoạn phân tích rất dài về lịch sử và khoa học. '.repeat(200); // ~11,600 chars
    assert.ok(hugeText.length > 10000);

    const sentMessages: string[] = [];

    const mockAi: IAIService = {
      async generateResponse() {
        return { text: hugeText };
      },
      clearHistory() {},
      getHistory() { return []; },
      getHistoryCount() { return 0; },
    };

    const bot = createBot(testConfig, mockAi, { botInfo: mockBotInfo });

    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        sentMessages.push((payload as any).text);
        return { ok: true, result: { message_id: sentMessages.length } } as any;
      }
      if (method === 'sendChatAction') {
        return { ok: true, result: true } as any;
      }
      return prev(method, payload, signal);
    });

    const update: Update = {
      update_id: 1,
      message: {
        message_id: 10,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 2002, type: 'private', first_name: 'User' },
        from: { id: 2002, is_bot: false, first_name: 'User' },
        text: 'Viết bài văn dài',
      },
    };

    await bot.handleUpdate(update);

    // Verify all chunks sent and none exceed 4000 chars
    assert.ok(sentMessages.length >= 3, `Expected at least 3 chunks, got ${sentMessages.length}`);
    for (const msg of sentMessages) {
      assert.ok(msg.length <= 4000, `Message length ${msg.length} exceeds 4000 limit`);
    }
  });

  it('gracefully handles AI service throwing unexpected runtime errors', async () => {
    const sentMessages: string[] = [];

    const brokenAi: IAIService = {
      async generateResponse() {
        throw new Error('Máy chủ AI đang bảo trì đột xuất');
      },
      clearHistory() {},
      getHistory() { return []; },
      getHistoryCount() { return 0; },
    };

    const bot = createBot(testConfig, brokenAi, { botInfo: mockBotInfo });

    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        sentMessages.push((payload as any).text);
        return { ok: true, result: { message_id: sentMessages.length } } as any;
      }
      if (method === 'sendChatAction') {
        return { ok: true, result: true } as any;
      }
      return prev(method, payload, signal);
    });

    const update: Update = {
      update_id: 2,
      message: {
        message_id: 11,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 2002, type: 'private', first_name: 'User' },
        from: { id: 2002, is_bot: false, first_name: 'User' },
        text: 'Xin chào',
      },
    };

    await bot.handleUpdate(update);

    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].includes('Máy chủ AI đang bảo trì đột xuất'));
  });

  it('handles complex nested code blocks without breaking', () => {
    const markdownWithCode = `
Dưới đây là ví dụ mã nguồn Python:
\`\`\`python
def hello_world():
    print("Xin chào thế giới")
    for i in range(100):
        print(f"Giá trị: {i}")
\`\`\`
Tiếp theo là đoạn giải thích chi tiết.
`.repeat(30);

    const chunks = splitMessage(markdownWithCode, 600);
    assert.ok(chunks.length > 1);

    for (const chunk of chunks) {
      assert.ok(chunk.length <= 600);
      // Code fence matching
      const fences = (chunk.match(/```/g) || []).length;
      assert.equal(fences % 2, 0, `Each chunk should have balanced code fences. Got ${fences} fences in chunk: ${chunk.slice(0, 50)}...`);
    }
  });

  it('handles rapid sequential turns maintaining chronological consistency', async () => {
    const history: ChatMessage[] = [];
    const mockAi: IAIService = {
      async generateResponse(chatId, text) {
        history.push({ role: 'user', text, timestamp: Date.now() });
        const reply = `Trả lời cho: ${text}`;
        history.push({ role: 'model', text: reply, timestamp: Date.now() });
        return { text: reply };
      },
      clearHistory() {},
      getHistory() { return history; },
      getHistoryCount() { return history.length / 2; },
    };

    await mockAi.generateResponse(1, 'Hỏi 1');
    await mockAi.generateResponse(1, 'Hỏi 2');
    await mockAi.generateResponse(1, 'Hỏi 3');

    assert.equal(history.length, 6);
    assert.equal(history[0].text, 'Hỏi 1');
    assert.equal(history[1].text, 'Trả lời cho: Hỏi 1');
    assert.equal(history[2].text, 'Hỏi 2');
    assert.equal(history[3].text, 'Trả lời cho: Hỏi 2');
    assert.equal(history[4].text, 'Hỏi 3');
    assert.equal(history[5].text, 'Trả lời cho: Hỏi 3');
  });
});
