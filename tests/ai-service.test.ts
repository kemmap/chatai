import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockAIService } from '../src/ai/mock.js';
import { GeminiAIService } from '../src/ai/gemini.js';

describe('AI Services', () => {
  describe('MockAIService', () => {
    it('generates a response for valid input and tracks history', async () => {
      const mock = new MockAIService(5);
      const res = await mock.generateResponse('user_1', 'Thủ đô của Việt Nam là gì?');

      assert.ok(res.text.includes('Thủ đô của Việt Nam là gì?'));
      assert.equal(mock.getHistoryCount('user_1'), 1);

      // Follow-up question
      const res2 = await mock.generateResponse('user_1', 'Dân số là bao nhiêu?');
      assert.ok(res2.text.includes('lượt thứ 2'));
      assert.equal(mock.getHistoryCount('user_1'), 2);
    });

    it('rejects empty input with an error', async () => {
      const mock = new MockAIService(5);
      await assert.rejects(
        async () => {
          await mock.generateResponse('user_1', '   ');
        },
        {
          message: 'Tin nhắn không được để trống.',
        }
      );
    });

    it('includes search citations when enableSearch is true', async () => {
      const mock = new MockAIService(5);
      const res = await mock.generateResponse('user_1', 'Giá vàng hôm nay', {
        enableSearch: true,
      });

      assert.ok(res.text.includes('TRA CỨU WEB'));
      assert.ok(res.sources && res.sources.length > 0);
      assert.equal(res.sources[0].uri, 'https://example.com/search-result');
    });

    it('generates multi-agent consensus response in swarm mode', async () => {
      const mock = new MockAIService(5);
      const res = await mock.generateResponse('user_1', 'Đánh giá mô hình LLM', {
        mode: 'swarm',
      });

      assert.equal(res.mode, 'swarm');
      assert.ok(res.text.includes('HỘI ĐỒNG AI - SWARM CONSENSUS'));
      assert.ok(res.text.includes('Khảo cứu & Cơ sở thực tế'));
      assert.ok(res.text.includes('Phản biện & Kiểm chứng logic'));
      assert.ok(res.text.includes('Kết luận đồng thuận chính xác nhất'));
      assert.ok(res.sources && res.sources.length > 0);
    });

    it('generates chain-of-thought analysis in boost mode', async () => {
      const mock = new MockAIService(5);
      const res = await mock.generateResponse('user_1', 'Bài toán P vs NP', {
        mode: 'boost',
      });

      assert.equal(res.mode, 'boost');
      assert.ok(res.text.includes('CHẾ ĐỘ BOOST - SUY LUẬN SÂU'));
      assert.ok(res.text.includes('Chain-of-Thought'));
    });

    it('clears conversation history', async () => {
      const mock = new MockAIService(5);
      await mock.generateResponse('user_1', 'Câu hỏi 1');
      assert.equal(mock.getHistoryCount('user_1'), 1);

      mock.clearHistory('user_1');
      assert.equal(mock.getHistoryCount('user_1'), 0);
      assert.equal(mock.getHistory('user_1').length, 0);
    });
  });

  describe('GeminiAIService Validation & Error Mapping', () => {
    it('throws error if apiKey is empty', () => {
      assert.throws(() => {
        new GeminiAIService({ apiKey: '' });
      }, /GEMINI_API_KEY không được để trống/);
    });

    it('rejects empty questions', async () => {
      const service = new GeminiAIService({ apiKey: 'fake_key_for_unit_test' });
      await assert.rejects(
        async () => {
          await service.generateResponse('user_1', '   ');
        },
        /Câu hỏi không được để trống/
      );
    });

    it('maps invalid API key error to friendly Vietnamese message', async () => {
      const service = new GeminiAIService({ apiKey: 'fake_key_for_unit_test' });
      // When called with a fake key, the Google Gemini API returns an authentication error
      await assert.rejects(
        async () => {
          await service.generateResponse('user_1', 'Test query');
        },
        (err: Error) => {
          return (
            err.message.includes('GEMINI_API_KEY') ||
            err.message.includes('Lỗi gọi Gemini AI')
          );
        }
      );
    });
  });
});
