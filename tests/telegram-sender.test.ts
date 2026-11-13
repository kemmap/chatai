import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSources, safeReply } from '../src/utils/telegram-sender.js';
import { Context } from 'grammy';

describe('Telegram Sender Utilities', () => {
  describe('formatSources', () => {
    it('returns empty string when sources is undefined or empty', () => {
      assert.equal(formatSources(undefined), '');
      assert.equal(formatSources([]), '');
    });

    it('formats sources with numbers, titles, and links', () => {
      const sources = [
        { title: 'Báo Tuổi Trẻ', uri: 'https://tuoitre.vn/news-1' },
        { title: 'VnExpress', uri: 'https://vnexpress.net/news-2' },
      ];
      const formatted = formatSources(sources);
      assert.ok(formatted.includes('🔍 *Nguồn tra cứu tham khảo:*'));
      assert.ok(formatted.includes('1. [Báo Tuổi Trẻ](https://tuoitre.vn/news-1)'));
      assert.ok(formatted.includes('2. [VnExpress](https://vnexpress.net/news-2)'));
    });

    it('limits display to top 5 sources', () => {
      const sources = Array.from({ length: 8 }, (_, i) => ({
        title: `Nguồn ${i + 1}`,
        uri: `https://example.com/${i + 1}`,
      }));
      const formatted = formatSources(sources);
      assert.ok(formatted.includes('5. [Nguồn 5]'));
      assert.ok(!formatted.includes('6. [Nguồn 6]'));
    });

    it('sanitizes brackets in titles to prevent markdown breakage', () => {
      const sources = [
        { title: 'Tiêu đề [Chứa ngoặc vuông]', uri: 'https://example.com' },
      ];
      const formatted = formatSources(sources);
      assert.ok(!formatted.includes('[[Chứa ngoặc vuông]]'));
    });
  });

  describe('safeReply fallback handling', () => {
    it('successfully calls ctx.reply on normal message', async () => {
      let called = false;
      let usedParseMode = '';
      const fakeCtx = {
        reply: async (text: string, other: any) => {
          called = true;
          usedParseMode = other?.parse_mode;
          return {} as any;
        },
      } as unknown as Context;

      await safeReply(fakeCtx, 'Xin chào');
      assert.equal(called, true);
      assert.equal(usedParseMode, 'Markdown');
    });

    it('falls back to plain text when Telegram returns a 400 parsing error', async () => {
      const calls: Array<{ text: string; parse_mode?: string }> = [];

      const fakeCtx = {
        reply: async (text: string, other: any) => {
          calls.push({ text, parse_mode: other?.parse_mode });
          if (other?.parse_mode === 'Markdown') {
            const err: any = new Error("Bad Request: can't parse entities in message");
            err.error_code = 400;
            err.description = "Bad Request: can't parse entities";
            throw err;
          }
          return {} as any;
        },
      } as unknown as Context;

      await safeReply(fakeCtx, 'Text with broken *markdown syntax');

      assert.equal(calls.length, 2, 'Should retry once with fallback');
      assert.equal(calls[0].parse_mode, 'Markdown', 'First attempt had Markdown parse_mode');
      assert.equal(calls[1].parse_mode, undefined, 'Fallback attempt had NO parse_mode (plain text)');
    });

    it('falls back to sending without reply_parameters if the original message was deleted', async () => {
      const calls: Array<{ text: string; options: any }> = [];

      const fakeCtx = {
        reply: async (text: string, options: any) => {
          calls.push({ text, options });
          if (options?.reply_parameters) {
            const err: any = new Error('Bad Request: replied message not found');
            err.error_code = 400;
            err.description = 'Bad Request: replied message not found';
            throw err;
          }
          return {} as any;
        },
      } as unknown as Context;

      await safeReply(fakeCtx, 'Trả lời tin nhắn', { replyToMessageId: 999999 });

      // First try: with Markdown + reply_parameters (fails)
      // Second try: with plain text + reply_parameters (fails)
      // Third try: with plain text + NO reply_parameters (succeeds)
      assert.equal(calls.length, 3);
      assert.equal(calls[2].options?.reply_parameters, undefined);
    });

    it('propagates fatal non-formatting errors (e.g. unauthorized)', async () => {
      const fakeCtx = {
        reply: async () => {
          const err: any = new Error('Unauthorized');
          err.error_code = 401;
          throw err;
        },
      } as unknown as Context;

      await assert.rejects(
        async () => {
          await safeReply(fakeCtx, 'Test');
        },
        /Unauthorized/
      );
    });
  });
});
